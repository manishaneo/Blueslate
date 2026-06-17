import { Router } from "express";
import { handleVapiToolCall } from "../controllers/vapi.controller.js";

const router = Router();

// POST /api/vapi/tool — VAPI calls this during a conversation when the
// assistant needs business information to answer a caller question.
// No JWT auth — validated by VAPI_WEBHOOK_SECRET header check instead.
router.post("/tool", handleVapiToolCall);

export default router;
