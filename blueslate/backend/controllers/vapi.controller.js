import prisma from "../prismaClient.js";
import { askGemini } from "../services/ai.service.js";
import { generateGroqAnswer } from "../services/groq.service.js";

/**
 * POST /api/vapi/tool
 *
 * Handles VAPI function/tool calls during a voice conversation.
 * VAPI calls this when the assistant needs to answer a caller question
 * about business information.
 *
 * Business identification priority:
 *   1. call.metadata.businessId  — injected when Twilio creates the VAPI call
 *   2. VAPI_TEST_BUSINESS_ID env var — for VAPI dashboard "Talk" button testing
 *   3. Most recent BusinessContext row — last-resort fallback
 */
export async function handleVapiToolCall(req, res) {
    const { message } = req.body;

    if (!message || message.type !== "tool-calls") {
        return res.status(400).json({ error: "Expected message.type === 'tool-calls'" });
    }

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
        console.log(`[VAPI] resolving business via call metadata: ${metaBusinessId}`);
        return prisma.businessContext.findFirst({
            where:   { businessId: metaBusinessId },
            orderBy: { createdAt: "desc" },
        });
    }

    // 2. VAPI dashboard "Talk" button testing — pin to a specific business via env var
    const testBusinessId = process.env.VAPI_TEST_BUSINESS_ID;
    if (testBusinessId) {
        console.log(`[VAPI] resolving business via VAPI_TEST_BUSINESS_ID: ${testBusinessId}`);
        return prisma.businessContext.findFirst({
            where:   { businessId: testBusinessId },
            orderBy: { createdAt: "desc" },
        });
    }

    // 3. Last-resort: most recent business context (single-tenant / dev only)
    console.log("[VAPI] resolving business via fallback (most recent BusinessContext)");
    return prisma.businessContext.findFirst({ orderBy: { createdAt: "desc" } });
}
