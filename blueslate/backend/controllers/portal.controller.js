import jwt from "jsonwebtoken";
import { lookupBusiness, portalChat, portalFinalizeConversation, portalCreateLead } from "../services/portal.service.js";
import { initiateVapiOutboundCall } from "../services/outboundCall.service.js";

// Strip all non-digit characters and normalise to E.164.
// Handles common US formats: 10-digit, 1XXXXXXXXXX, and pre-formatted +1XXXXXXXXXX.
function normalizeToE164(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10)                           return `+1${digits}`;
    if (digits.length === 11 && digits[0] === "1")      return `+${digits}`;
    return `+${digits}`; // pass-through for non-US numbers; VAPI validates format
}

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

export const handleCallMe = async (req, res, next) => {
    try {
        const { conversationToken, phone } = req.body;

        if (!conversationToken || typeof conversationToken !== "string") {
            return res.status(400).json({ success: false, message: "Session token is required." });
        }
        if (!phone || typeof phone !== "string" || !phone.trim()) {
            return res.status(400).json({ success: false, message: "Phone number is required." });
        }

        // Verify the portal token and extract businessId.
        let payload;
        try {
            payload = jwt.verify(conversationToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: "Invalid or expired session token." });
        }
        if (payload.type !== "portal" || !payload.businessId) {
            return res.status(401).json({ success: false, message: "Invalid session token." });
        }

        const normalizedPhone = normalizeToE164(phone.trim());
        // Sanity-check: E.164 numbers are at least 8 digits (+ prefix + 7 digits minimum)
        if (normalizedPhone.replace(/\D/g, "").length < 7) {
            return res.status(400).json({ success: false, message: "Phone number is too short. Please include area code." });
        }

        const result = await initiateVapiOutboundCall(normalizedPhone, payload.businessId);
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
