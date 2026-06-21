import rateLimit from "express-rate-limit";

// Shared handler — every limit breach returns the same JSON shape.
// Do NOT leak which limit was hit; a generic message is intentional.
const handler = (_req, res) => {
    res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
    });
};

const defaults = {
    standardHeaders: "draft-7", // emit RateLimit header (RFC 9110)
    legacyHeaders:   false,     // suppress X-RateLimit-* headers
    handler,
};

// ── Global baseline ────────────────────────────────────────────────────────────
// Applied to every route in server.js before any route handler.
// Acts as a backstop against volumetric abuse on endpoints not covered by a
// tighter limiter below.
//
// Limit: 500 req / 15 min per IP
export const globalLimiter = rateLimit({
    ...defaults,
    windowMs: 15 * 60 * 1000,
    limit:    500,
});

// ── Auth ───────────────────────────────────────────────────────────────────────
// Tight windows to block credential stuffing and mass registration.
//
// Login:          10 req / 15 min per IP
// Register:        5 req / 1 hr  per IP
// Forgot password: 5 req / 1 hr  per IP  — limits email-bombing and user enumeration
// Reset password:  5 req / 1 hr  per IP  — limits token brute-forcing
export const authLoginLimiter = rateLimit({
    ...defaults,
    windowMs: 15 * 60 * 1000,
    limit:    10,
});

export const authRegisterLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    5,
});

export const authForgotPasswordLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    5,
});

export const authResetPasswordLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    5,
});

// ── Portal ─────────────────────────────────────────────────────────────────────
// All portal routes are public (portal-token auth only).
// Chat gets two limiters: one IP-based (shared-WiFi safety) and one keyed on
// the conversationToken (per-session AI cost cap).
//
// Lookup:   30 req / 10 min per IP   — business hostname enumeration
// Chat IP:  60 req / 10 min per IP
// Chat tok: 30 req / 10 min per token — one session can't burn AI budget alone
// Finalize: 20 req / 10 min per IP   — one expected call per session
// Leads:    10 req / 10 min per IP   — one lead form per conversation
export const portalLookupLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    30,
});

export const portalChatIpLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    60,
});

// Keyed on the signed conversationToken from the request body.
// Falls back to req.ip if the token is absent (malformed request).
export const portalChatTokenLimiter = rateLimit({
    ...defaults,
    windowMs:     10 * 60 * 1000,
    limit:        30,
    keyGenerator: (req) => req.body?.conversationToken || req.ip,
});

export const portalFinalizeLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    20,
});

export const portalLeadsLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    10,
});

// Call Me: 5 req / 10 min per IP — each request places a real outbound call
export const portalCallMeLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    5,
});

// ── Demo ───────────────────────────────────────────────────────────────────────
// Both endpoints are fully public and expensive:
//   /scrape — fetches external URLs at the server's bandwidth cost (SSRF risk)
//   /chat   — calls Gemini + Groq on every request
//
// Scrape:  5 req / 1 hr  per IP
// Chat:   20 req / 10 min per IP
export const demoScrapeLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    5,
});

export const demoChatLimiter = rateLimit({
    ...defaults,
    windowMs: 10 * 60 * 1000,
    limit:    20,
});

// ── Twilio webhooks ────────────────────────────────────────────────────────────
// Server-to-server from Twilio's infrastructure — one event per call state
// transition. 300 req / 15 min comfortably handles ~20 concurrent calls
// (voice + status callback per call) while still blocking rogue traffic.
export const twilioWebhookLimiter = rateLimit({
    ...defaults,
    windowMs: 15 * 60 * 1000,
    limit:    300,
});

// ── VAPI webhooks ──────────────────────────────────────────────────────────────
// Server-to-server from VAPI infrastructure — tool calls + end-of-call reports.
// A single active call can generate ~1 tool-call request per conversation turn.
// 300 req / 15 min handles ~15 concurrent active calls with up to 20 turns each.
// Secret validation (validateVapiSecret) runs after this limiter.
export const vapiWebhookLimiter = rateLimit({
    ...defaults,
    windowMs: 15 * 60 * 1000,
    limit:    300,
});

// ── Invitations ────────────────────────────────────────────────────────────────
// Both validate and accept are public; limiting prevents token brute-forcing.
//
// Validate: 20 req / 1 hr per IP
// Accept:   10 req / 1 hr per IP
export const invitationValidateLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    20,
});

export const invitationAcceptLimiter = rateLimit({
    ...defaults,
    windowMs: 60 * 60 * 1000,
    limit:    10,
});
