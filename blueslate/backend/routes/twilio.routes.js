import { Router } from "express";
import { validateTwilioSignature } from "../middleware/twilioSignature.js";
import {
    handleInboundCall,
    handleGather,
    handleStatusCallback,
} from "../controllers/twilio.controller.js";
import { twilioWebhookLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// express.urlencoded() is registered in server.js and runs before this router,
// so req.body is already populated when these handlers execute.

// POST /api/twilio/voice — incoming call webhook (configure in Twilio console)
router.post("/voice",        twilioWebhookLimiter, validateTwilioSignature, handleInboundCall);

// POST /api/twilio/voice/gather — <Gather> input callback
router.post("/voice/gather", twilioWebhookLimiter, validateTwilioSignature, handleGather);

// POST /api/twilio/voice/status — call status callback (configure in Twilio console)
router.post("/voice/status", twilioWebhookLimiter, validateTwilioSignature, handleStatusCallback);

export default router;
