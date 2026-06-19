import crypto from "crypto";
import prisma from "../prismaClient.js";
import { extractWebsiteMetadata }          from "../services/websiteAnalysis.service.js";
import { createBusinessContext }           from "../services/businessContext.service.js";
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

// ── GET /api/demo/info ────────────────────────────────────────────────────────
export async function handleDemoInfo(req, res) {
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER ?? null;

    // Most-recent BusinessContext that has actual content (mirrors VAPI fallback logic)
    const context = await prisma.businessContext.findFirst({
        where: {
            websiteUrl: { contains: "xpleague.com" },
            content:    { not: null },
            AND:        { content: { not: "" } },
        },
        orderBy: { createdAt: "desc" },
        select:  { id: true, title: true, description: true, businessId: true, lastScrapedAt: true },
    }).catch(() => null);

    let leadCount      = 0;
    let recentLeads    = [];
    let recentCalls    = [];
    let activeCallCount = 0;

    const ACTIVE_STATUSES = ["initiated", "ringing", "in-progress"];

    if (context) {
        [leadCount, recentLeads, recentCalls, activeCallCount] = await Promise.all([
            prisma.lead.count({
                where: { businessContextId: context.id },
            }).catch(() => 0),

            prisma.lead.findMany({
                where:   { businessContextId: context.id },
                orderBy: { createdAt: "desc" },
                take:    5,
                select:  { id: true, name: true, phone: true, interest: true, status: true, createdAt: true },
            }).catch(() => []),

            prisma.call.findMany({
                orderBy: { startedAt: "desc" },
                take:    5,
                select:  { id: true, from: true, duration: true, status: true, startedAt: true, transcript: true },
            }).catch(() => []),

            prisma.call.count({
                where: { status: { in: ACTIVE_STATUSES } },
            }).catch(() => 0),
        ]);
    }

    return res.json({
        success: true,
        data: {
            phoneNumber,
            businessName:   context?.title        ?? null,
            description:    context?.description  ?? null,
            lastScrapedAt:  context?.lastScrapedAt ?? null,
            leadCount,
            recentLeads,
            recentCalls,
            activeCallCount,
            agentStatus: activeCallCount > 0 ? "busy" : "available",
        },
    });
}

// ── POST /api/demo/seed ───────────────────────────────────────────────────────
const XP_LEAGUE_URL = "https://xpleague.com";

export async function handleDemoSeed(req, res) {
    const existing = await prisma.businessContext.findFirst({
        where: {
            websiteUrl: { contains: "xpleague.com" },
            content:    { not: null },
            AND:        { content: { not: "" } },
        },
        orderBy: { createdAt: "desc" },
        select:  { id: true, title: true },
    }).catch(() => null);

    if (existing) {
        return res.json({ success: true, data: { seeded: false, title: existing.title } });
    }

    try {
        const metadata = await extractWebsiteMetadata(XP_LEAGUE_URL);
        const context  = await createBusinessContext(
            null,
            XP_LEAGUE_URL,
            metadata.title,
            metadata.description,
            metadata.content,
            metadata.faqs ?? [],
            new Date(),
        );
        return res.json({ success: true, data: { seeded: true, title: context.title } });
    } catch (err) {
        console.error("[DEMO SEED]", err.message);
        return res.status(500).json({ success: false, message: "Scrape failed: " + err.message });
    }
}

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
