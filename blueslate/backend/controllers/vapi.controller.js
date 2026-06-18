import prisma from "../prismaClient.js";
import { askGemini } from "../services/ai.service.js";
import { generateGroqAnswer } from "../services/groq.service.js";
import { extractLeadData }             from "../services/leadExtraction.service.js";
import { createLead, findLeadByEmail } from "../services/lead.service.js";

/**
 * POST /api/vapi/tool
 *
 * Handles both VAPI tool payload formats:
 *
 *   API Request Tool (current):
 *     Body: { query: "..." }
 *     Response: { result: "..." }
 *
 *   Function/Webhook Tool (future Twilio integration):
 *     Body: { message: { type: "tool-calls", toolCallList: [...] } }
 *     Response: { results: [{ toolCallId, result }] }
 */
export async function handleVapiToolCall(req, res) {
    // Log raw body FIRST — before any conditional — so we always see what VAPI sends
    console.log("[VAPI] ===== INCOMING REQUEST =====");
    console.log("[VAPI] Body:", JSON.stringify(req.body, null, 2));
    console.log("[VAPI] ==============================");

    // Detect which VAPI tool format was used
    if (req.body?.message?.type === "tool-calls") {
        return _handleWebhookFormat(req, res);
    }

    // VAPI API Request Tool — parameters arrive at root level: { query: "..." }
    return _handleApiRequestFormat(req, res);
}

async function _handleApiRequestFormat(req, res) {
    console.log("[VAPI] Format: API Request Tool");
    const query = req.body?.query;
    const result = await _handleGetBusinessInfo(null, query);
    console.log("[VAPI] Responding with result:", result);
    return res.json({ result });
}

async function _handleWebhookFormat(req, res) {
    console.log("[VAPI] Format: Webhook/Function Tool");
    const { message } = req.body;
    const toolCallList = message.toolCallList ?? [];
    const results = [];

    for (const toolCall of toolCallList) {
        const toolCallId = toolCall.id;
        const fnName     = toolCall.function?.name;
        let   args;

        try {
            args = typeof toolCall.function?.arguments === "string"
                ? JSON.parse(toolCall.function.arguments)
                : (toolCall.function?.arguments ?? {});
        } catch {
            results.push({ toolCallId, result: "I'm sorry, I couldn't process that request." });
            continue;
        }

        if (fnName === "getBusinessInfo") {
            const result = await _handleGetBusinessInfo(message.call, args.query);
            results.push({ toolCallId, result });
        } else {
            results.push({ toolCallId, result: "Unknown tool." });
        }
    }

    return res.json({ results });
}

async function _handleGetBusinessInfo(call, query) {
    console.log("[VAPI] Query:", query);

    if (!query?.trim()) {
        return "I didn't catch your question. Could you repeat that?";
    }

    try {
        const businessContext = await _resolveBusinessContext(call);

        console.log("[VAPI] Business found:", !!businessContext);
        console.log("[VAPI] Business title:", businessContext?.title);
        console.log("[VAPI] Content length:", businessContext?.content?.length);

        if (!businessContext?.content) {
            return "I don't have business information loaded yet. Please call back shortly.";
        }

        const { name, email, phone, interest } = extractLeadData(query);
        if (email || phone) {
            const existing = email
                ? await findLeadByEmail(email, [businessContext.id])
                : null;
            if (!existing) {
                await createLead({ businessContextId: businessContext.id, name, email, phone, interest, source: "vapi" })
                    .catch((err) => console.error("[VAPI] createLead failed:", err.message));
            }
        }

        console.log("[VAPI] Calling askGemini...");
        const retrieved = await askGemini(businessContext.content, query);

        console.log("[VAPI] Gemini response received");

        console.log("[VAPI] Calling generateGroqAnswer...");
        const answer = await generateGroqAnswer(retrieved, query, businessContext.title ?? "");

        console.log("[VAPI] Groq response generated");

        return answer;
    } catch (err) {
        console.error("[VAPI FULL ERROR]", err);
        return `DEBUG ERROR: ${err.message}`;
    }
}

async function _resolveBusinessContext(call) {
    // 1. Prefer businessId from call metadata (set by Twilio webhook when routing to VAPI)
    const metaBusinessId = call?.metadata?.businessId;
    if (metaBusinessId) {
        console.log(`[VAPI] resolving via call metadata: ${metaBusinessId}`);
        const ctx = await prisma.businessContext.findFirst({
            where:   { businessId: metaBusinessId },
            orderBy: { createdAt: "desc" },
        });
        if (ctx) {
            console.log(`[VAPI] Selected row — id: ${ctx.id}, businessId: ${ctx.businessId}, createdAt: ${ctx.createdAt}`);
            return ctx;
        }
        console.log("[VAPI] WARNING: call metadata businessId matched no row, falling through");
    }

    // 2. VAPI dashboard "Talk" button testing — pin to a specific business via env var
    const testBusinessId = process.env.VAPI_TEST_BUSINESS_ID;
    if (testBusinessId) {
        console.log(`[VAPI] resolving via VAPI_TEST_BUSINESS_ID: ${testBusinessId}`);
        const ctx = await prisma.businessContext.findFirst({
            where:   { businessId: testBusinessId },
            orderBy: { createdAt: "desc" },
        });
        if (ctx) {
            console.log(`[VAPI] Selected row — id: ${ctx.id}, businessId: ${ctx.businessId}, createdAt: ${ctx.createdAt}`);
            return ctx;
        }
        console.log("[VAPI] WARNING: VAPI_TEST_BUSINESS_ID matched no row, falling through to most-recent");
    }

    // 3. Fallback: most recent BusinessContext row that actually has content
    console.log("[VAPI] resolving via fallback (most recent non-empty BusinessContext)");
    const fallback = await prisma.businessContext.findFirst({
        where:   { content: { not: null }, AND: { content: { not: "" } } },
        orderBy: { createdAt: "desc" },
    });
    console.log(`[VAPI] Selected row — id: ${fallback?.id}, businessId: ${fallback?.businessId}, createdAt: ${fallback?.createdAt}`);
    return fallback;
}
