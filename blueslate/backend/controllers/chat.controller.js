import { answerQuestion } from "../services/chat.service.js";

// Only these three values may be written to Conversation.source via this endpoint.
// Any client-supplied value outside this set is silently normalised to "business_chat"
// so analytics filters (e.g. ?source=receptionist) are never polluted.
const ALLOWED_SOURCES = new Set(["customer_portal", "business_chat", "receptionist"]);

export const handleChat = async (req, res, next) => {
    const { question, conversationId, source } = req.body;

    if (!question || typeof question !== "string" || question.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "question must be a non-empty string",
        });
    }

    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;

        const safeConvId = typeof conversationId === "string" && conversationId.length > 0
            ? conversationId
            : null;

        // Allowlist enforcement: unknown/missing source → "business_chat"
        const safeSource = typeof source === "string" && ALLOWED_SOURCES.has(source)
            ? source
            : "business_chat";

        const { answer, intent, conversationId: savedConvId } = await answerQuestion(
            req.user.id,
            question.trim(),
            activeBusinessId,
            safeConvId,
            safeSource,
        );

        res.json({ answer, intent, conversationId: savedConvId });
    } catch (error) {
        if (
            error.message.startsWith("No business context found") ||
            error.message === "BusinessContext not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        next(error);
    }
};
