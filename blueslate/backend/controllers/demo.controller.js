import crypto from "crypto";
import { extractWebsiteMetadata }          from "../services/websiteAnalysis.service.js";
import { detectIntent, getSmallTalkResponse } from "../services/intent.service.js";
import { extractLeadData }                 from "../services/leadExtraction.service.js";
import { askGemini }                       from "../services/ai.service.js";
import { generateGroqAnswer }              from "../services/groq.service.js";

// ── In-memory session store — zero DB, TTL 30 min ─────────────────────────────
// { sessionId -> { content, businessName, createdAt } }
const demoSessions = new Map();

setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, v] of demoSessions) {
        if (v.createdAt < cutoff) demoSessions.delete(k);
    }
}, 5 * 60 * 1000);

// ── POST /api/demo/scrape ─────────────────────────────────────────────────────
export async function handleScrape(req, res) {
    const { url } = req.body;

    if (!url || typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ success: false, message: "A website URL is required." });
    }

    try {
        const metadata      = await extractWebsiteMetadata(url.trim());
        const demoSessionId = crypto.randomUUID();

        demoSessions.set(demoSessionId, {
            content:      metadata.content,
            businessName: metadata.title || "Your Business",
            createdAt:    Date.now(),
        });

        return res.json({
            success: true,
            data: {
                demoSessionId,
                businessName: metadata.title || "Your Business",
                description:  metadata.description,
                services:     metadata.services,
                faqs:         metadata.faqs.slice(0, 5),
                crawledPages: metadata.crawledPages.length,
            },
        });
    } catch (err) {
        console.error("[DEMO SCRAPE]", err.message);
        return res.status(500).json({
            success: false,
            message: "We couldn't read that website. Please check the URL and try again.",
        });
    }
}

// ── POST /api/demo/chat ───────────────────────────────────────────────────────
export async function handleChat(req, res) {
    const { message, demoSessionId } = req.body;

    if (!message || !demoSessionId) {
        return res.status(400).json({ success: false, message: "message and demoSessionId are required." });
    }

    const session = demoSessions.get(demoSessionId);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: "Demo session expired. Please restart the demo.",
        });
    }

    try {
        const intentData = detectIntent(message);

        if (intentData.intent === "small_talk") {
            const answer = getSmallTalkResponse(intentData, session.businessName);
            return res.json({ success: true, data: { answer, intent: intentData } });
        }

        const extractedLead = extractLeadData(message);
        const lead = (extractedLead.email || extractedLead.phone || extractedLead.name)
            ? extractedLead
            : null;

        const retrievedContext = await askGemini(session.content, message);

        let answer;
        try {
            answer = await generateGroqAnswer(retrievedContext, message, session.businessName);
        } catch {
            answer = retrievedContext;
        }

        return res.json({
            success: true,
            data: {
                answer,
                intent:   { ...intentData, lead },
                leadData: extractedLead,
            },
        });
    } catch (err) {
        console.error("[DEMO CHAT]", err.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
        });
    }
}
