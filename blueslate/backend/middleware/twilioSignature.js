import twilio from "twilio";

/**
 * Validates that an incoming request genuinely originates from Twilio by verifying
 * the X-Twilio-Signature HMAC. Must run AFTER express.urlencoded() so req.body
 * is populated — the HMAC covers the exact POST params Twilio sent.
 *
 * URL reconstruction:
 *   Set TWILIO_WEBHOOK_BASE_URL in production to the exact public URL configured
 *   in the Twilio console (e.g. https://blueslate-api.onrender.com).
 *   This avoids subtle mismatches when Render rewrites the Host header.
 *
 * Local development:
 *   Set SKIP_TWILIO_VALIDATION=true to bypass the check while using ngrok.
 */
export function validateTwilioSignature(req, res, next) {
    if (process.env.SKIP_TWILIO_VALIDATION === "true") {
        console.warn("[Twilio] Signature validation SKIPPED (dev mode)");
        return next();
    }

    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const signature  = req.headers["x-twilio-signature"];

    if (!signature) {
        console.warn("[Twilio] Rejected — missing X-Twilio-Signature");
        return res
            .status(403)
            .type("text/xml")
            .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // Build the canonical URL exactly as registered in the Twilio console.
    const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "");
    const url  = base
        ? `${base}${req.originalUrl}`
        : `${req.protocol}://${req.headers.host}${req.originalUrl}`;

    const isValid = twilio.validateRequest(authToken, signature, url, req.body ?? {});

    if (!isValid) {
        console.warn("[Twilio] Rejected — invalid signature for:", url);
        return res
            .status(403)
            .type("text/xml")
            .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    next();
}
