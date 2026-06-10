import { lookupBusiness, portalChat, portalFinalizeConversation, portalCreateLead } from "../services/portal.service.js";

export const handleLookup = async (req, res, next) => {
    try {
        const { website } = req.body;

        if (!website || typeof website !== "string" || !website.trim()) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid website URL.",
            });
        }

        const result = await lookupBusiness(website.trim());
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const handlePortalChat = async (req, res, next) => {
    try {
        const { conversationToken, question, conversationId, source } = req.body;

        if (!conversationToken || typeof conversationToken !== "string") {
            return res.status(400).json({
                success: false,
                message: "Session token is required.",
            });
        }

        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "question must be a non-empty string.",
            });
        }

        const PORTAL_SOURCES = ["customer_portal_chat", "customer_portal_voice"];
        const resolvedSource = PORTAL_SOURCES.includes(source) ? source : "customer_portal_chat";

        const result = await portalChat(
            conversationToken,
            question.trim(),
            conversationId ?? null,
            resolvedSource
        );

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const handlePortalLeadCreate = async (req, res, next) => {
    try {
        const { conversationToken, name, email, phone, notes, conversationId } = req.body;

        if (!conversationToken || typeof conversationToken !== "string") {
            return res.status(400).json({ success: false, message: "Session token is required." });
        }
        if (!email && !phone) {
            return res.status(400).json({ success: false, message: "Email or phone number is required." });
        }

        const result = await portalCreateLead(conversationToken, {
            name:           name           || null,
            email:          email          || null,
            phone:          phone          || null,
            notes:          notes          || null,
            conversationId: conversationId || null,
        });

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

export const handlePortalFinalize = async (req, res, next) => {
    try {
        const { conversationToken, metadata } = req.body;

        if (!conversationToken || typeof conversationToken !== "string") {
            return res.status(400).json({ success: false, message: "Session token is required." });
        }

        const safeMetadata = typeof metadata === "object" && metadata !== null ? metadata : {};

        const result = await portalFinalizeConversation(
            conversationToken,
            req.params.conversationId,
            safeMetadata,
        );

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};
