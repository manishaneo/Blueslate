import crypto from "crypto";

/**
 * Validates that an incoming request genuinely originates from VAPI.
 *
 * VAPI sends the configured credential on every tool-call and webhook request.
 * Two credential types are supported — whichever is configured in the VAPI
 * dashboard under Assistant → Advanced → Webhook Server → Authorization:
 *
 *   Bearer Token  (recommended):
 *     Header: Authorization: Bearer <secret>
 *     Middleware extracts the token after the "Bearer " prefix.
 *
 *   Custom Header (alternative):
 *     Header: x-vapi-secret: <secret>
 *     Middleware reads the value directly.
 *
 * Both are checked on every request so the same middleware works regardless of
 * which credential type is used in the dashboard.
 *
 * Replay attack posture:
 *   VAPI sends no timestamp or nonce, so request-level replay prevention is not
 *   possible here. Application-level idempotency guards (vapiCallId uniqueness in
 *   handleVapiWebhook, lead dedup in captureLead) are the correct mitigation.
 *
 * Constant-time comparison:
 *   Both buffers are zero-padded to the same length before timingSafeEqual so
 *   comparison time does not vary with secret or candidate length.
 *
 * Local development:
 *   Set SKIP_VAPI_AUTH=true to bypass the check when testing without a real VAPI
 *   call (e.g. curl). Never set this in production.
 */
export function validateVapiSecret(req, res, next) {
    if (process.env.SKIP_VAPI_AUTH === "true") {
        console.warn("[VAPI Auth] Secret validation SKIPPED (SKIP_VAPI_AUTH=true)");
        return next();
    }

    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (!secret) {
        // Fail closed: an unconfigured secret locks out all requests rather than
        // silently accepting everything.
        console.error("[VAPI Auth] VAPI_WEBHOOK_SECRET is not set — rejecting request. Set SKIP_VAPI_AUTH=true for local dev.");
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ── Extract candidate token ────────────────────────────────────────────────
    // Try Bearer Token format first (Authorization: Bearer <token>), then fall
    // back to the custom-header format (x-vapi-secret: <token>).
    let candidate = null;

    const authHeader = req.headers["authorization"] ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
        candidate = authHeader.slice(7); // strip "Bearer " prefix (7 chars)
    }

    if (!candidate) {
        candidate = req.headers["x-vapi-secret"] ?? null;
    }

    // ── Diagnostic log (redacted) ──────────────────────────────────────────────
    // Logs which headers were present without leaking values. Remove once the
    // auth flow is confirmed working in production.
    if (!candidate) {
        const presentHeaders = Object.keys(req.headers)
            .filter((h) => ["authorization", "x-vapi-secret"].includes(h));
        console.warn(
            "[VAPI Auth] Rejected — no credential found.",
            `IP: ${req.ip} | Path: ${req.path}`,
            `| Auth-related headers present: [${presentHeaders.join(", ") || "none"}]`,
            `| Authorization prefix: ${authHeader ? authHeader.slice(0, 10) + "…" : "(absent)"}`,
        );
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ── Constant-time comparison ───────────────────────────────────────────────
    // Zero-pad both buffers to the same length so timingSafeEqual runtime does
    // not vary with the length of the candidate or the secret.
    let valid = false;
    try {
        const a = Buffer.from(candidate, "utf8");
        const b = Buffer.from(secret,    "utf8");
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
        console.warn("[VAPI Auth] Rejected — credential mismatch from", req.ip);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    next();
}
