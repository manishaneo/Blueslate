import { Router } from "express";
import { handleVapiToolCall, handleVapiWebhook } from "../controllers/vapi.controller.js";

const router = Router();

// POST /api/vapi/tool — VAPI calls this during a conversation when the
// assistant needs business information to answer a caller question.
// No JWT auth — validated by VAPI_WEBHOOK_SECRET header check instead.
router.post("/tool", handleVapiToolCall);

// POST /api/vapi/webhook — VAPI posts call lifecycle events here (end-of-call-report, etc.)
// Configure this URL as the "Server URL" in the VAPI assistant settings.
router.post("/webhook", handleVapiWebhook);

export default router;
