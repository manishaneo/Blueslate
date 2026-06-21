import crypto from "crypto";

/**
 * Validates that an incoming request genuinely originates from VAPI by checking
 * the x-vapi-secret header against VAPI_WEBHOOK_SECRET.
 *
 * VAPI authentication model:
 *   VAPI sends a plain shared secret — configured under "Secret" in the assistant's
 *   Server URL settings in the VAPI dashboard — as the x-vapi-secret header on every
 *   request. There is no HMAC or timestamp; the secret itself is the authentication.
 *
 * Replay attack posture:
 *   VAPI does not send a timestamp or nonce, so request-level replay prevention is
 *   not possible at this layer. Application-level idempotency guards (vapiCallId
 *   checks in handleVapiWebhook, lead dedup in captureLead) are the correct mitigation.
 *
 * Constant-time comparison:
 *   Both buffers are padded to the same length before timingSafeEqual so the
 *   comparison time does not leak the secret length.
 *
 * Local development:
 *   Set SKIP_VAPI_AUTH=true to bypass the check while testing locally without
 *   a real VAPI call. Never set this in production.
 */
export function validateVapiSecret(req, res, next) {
    if (process.env.SKIP_VAPI_AUTH === "true") {
        console.warn("[VAPI Auth] Secret validation SKIPPED (SKIP_VAPI_AUTH=true)");
        return next();
    }

    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (!secret) {
        // Fail closed: if the secret is not configured, reject all requests.
        // A misconfigured production deploy should be locked out, not wide open.
        console.error("[VAPI Auth] VAPI_WEBHOOK_SECRET is not set — rejecting all VAPI requests. Set SKIP_VAPI_AUTH=true for local dev without a secret.");
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const incoming = req.headers["x-vapi-secret"];
    if (!incoming) {
        console.warn("[VAPI Auth] Rejected — missing x-vapi-secret header from", req.ip);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Constant-time comparison — pad both buffers to the same length so
    // timingSafeEqual call time does not vary with secret length.
    let valid = false;
    try {
        const a = Buffer.from(incoming, "utf8");
        const b = Buffer.from(secret,   "utf8");
        const len = Math.max(a.length, b.length);
        const paddedA = Buffer.alloc(len, 0);
        const paddedB = Buffer.alloc(len, 0);
        a.copy(paddedA);
        b.copy(paddedB);
        valid = crypto.timingSafeEqual(paddedA, paddedB);
    } catch {
        valid = false;
    }

    if (!valid) {
        console.warn("[VAPI Auth] Rejected — invalid x-vapi-secret from", req.ip);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    next();
}
