import { Router } from "express";
import { handleVapiToolCall, handleVapiWebhook } from "../controllers/vapi.controller.js";
import { validateVapiSecret } from "../middleware/vapiAuth.js";
import { vapiWebhookLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST /api/vapi/tool — VAPI calls this during a conversation when the
// assistant needs business information to answer a caller question.
// Authenticated via x-vapi-secret header (VAPI_WEBHOOK_SECRET env var).
router.post("/tool",    vapiWebhookLimiter, validateVapiSecret, handleVapiToolCall);

// POST /api/vapi/webhook — VAPI posts call lifecycle events here (end-of-call-report, etc.)
// Configure this URL as the "Server URL" in the VAPI assistant settings.
// Authenticated via x-vapi-secret header (VAPI_WEBHOOK_SECRET env var).
router.post("/webhook", vapiWebhookLimiter, validateVapiSecret, handleVapiWebhook);

export default router;
