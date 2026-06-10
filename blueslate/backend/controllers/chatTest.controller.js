import { answerQuestionNoStore } from "../services/chat.service.js";

export const handleChatTest = async (req, res, next) => {
    const { question } = req.body;

    if (!question || typeof question !== "string" || question.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "question must be a non-empty string",
        });
    }

    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;

        const { answer, intent, conversationId, leadData } = await answerQuestionNoStore(
            req.user.id,
            question.trim(),
            activeBusinessId,
        );

        res.json({ answer, intent, conversationId, leadData });
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
