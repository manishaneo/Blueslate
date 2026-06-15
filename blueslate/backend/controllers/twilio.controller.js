import twilio from "twilio";
import { createCallRecord, updateCallRecord } from "../services/twilio.service.js";

const VoiceResponse = twilio.twiml.VoiceResponse;

// Terminal statuses that mark the call as ended.
const TERMINAL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);

/**
 * POST /api/twilio/voice
 * Twilio fires this the moment an inbound call is connected.
 *
 * Responsibilities:
 *   1. Persist the call record (best-effort — DB failure must not block the call).
 *   2. Respond with TwiML: play greeting, then open a <Gather> for user speech.
 *
 * Phase 2 hook: replace handleGather with an AI voice processing endpoint that
 * receives SpeechResult and returns the next TwiML turn in real-time.
 */
export async function handleInboundCall(req, res) {
    const { CallSid, From, To } = req.body;
    const response = new VoiceResponse();

    try {
        await createCallRecord({ callSid: CallSid, from: From, to: To });
        console.log(`[Twilio] Inbound call ${CallSid} from ${From} to ${To}`);
    } catch (err) {
        // DB failure must not block the caller — log and continue.
        console.error("[Twilio] createCallRecord failed:", err.message);
    }

    try {
        const businessName  = process.env.TWILIO_BUSINESS_NAME     || "our business";
        const agentName     = process.env.TWILIO_RECEPTIONIST_NAME  || "Auri";
        const gatherAction  = _webhookUrl(req, "/api/twilio/voice/gather");
        const voice         = "Polly.Joanna";

        // Greeting plays before the gather window opens.
        response.say(
            { voice },
            `Hi! Thank you for calling ${businessName}. This is ${agentName}, your AI receptionist.`,
        );

        // <Gather> listens for speech or key-presses.
        // Phase 2: set action to the AI voice handler that processes SpeechResult.
        const gather = response.gather({
            input:         "speech dtmf",
            timeout:       5,
            speechTimeout: "auto",
            action:        gatherAction,
            method:        "POST",
        });

        gather.say(
            { voice },
            "How can I help you today?",
        );

        // Fallback if the caller says nothing within the timeout.
        response.say(
            { voice },
            `I'm sorry, I didn't catch that. Please call ${businessName} back and I'll be happy to assist. Goodbye!`,
        );
        response.hangup();
    } catch (err) {
        console.error("[Twilio] Error building TwiML in handleInboundCall:", err);
        _fallbackTwiml(response);
    }

    res.type("text/xml").send(response.toString());
}

/**
 * POST /api/twilio/voice/gather
 * Receives the caller's speech or DTMF input after the <Gather> window closes.
 *
 * Phase 1: placeholder — acknowledges the input and ends the call gracefully.
 * Phase 2: send SpeechResult to the AI service, get a text reply, <Say> it,
 *          then open another <Gather> to continue the conversation loop.
 */
export async function handleGather(req, res) {
    const { CallSid, SpeechResult, Digits } = req.body;
    const response = new VoiceResponse();

    console.log(`[Twilio] Gather input ${CallSid} — speech="${SpeechResult}" digits="${Digits}"`);

    try {
        const agentName = process.env.TWILIO_RECEPTIONIST_NAME || "Auri";
        const voice     = "Polly.Joanna";

        // Phase 2: replace this block with an AI call.
        //   const aiReply = await getAiVoiceResponse(SpeechResult, CallSid);
        //   response.say({ voice }, aiReply);
        //   const gather = response.gather({ ... });  // keep the conversation loop alive
        response.say(
            { voice },
            `Thank you for calling. ${agentName} is currently being upgraded with full AI capabilities. Please call back soon. Goodbye!`,
        );
        response.hangup();
    } catch (err) {
        console.error("[Twilio] Error in handleGather:", err);
        _fallbackTwiml(response);
    }

    res.type("text/xml").send(response.toString());
}

/**
 * POST /api/twilio/voice/status
 * Twilio fires this on every call-state transition (ringing → in-progress → completed, etc.)
 * and again at the end of the call with final duration.
 *
 * Configure this URL in the Twilio console as the "Status Callback" for the phone number.
 * Twilio does not read the response body — 204 is the correct reply.
 */
export async function handleStatusCallback(req, res) {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;

    console.log(`[Twilio] Status ${CallSid}: ${CallStatus}${CallDuration ? ` (${CallDuration}s)` : ""}`);

    try {
        await updateCallRecord(CallSid, {
            status:       CallStatus,
            duration:     CallDuration ? parseInt(CallDuration, 10) : undefined,
            endedAt:      TERMINAL_STATUSES.has(CallStatus) ? new Date() : undefined,
            recordingUrl: RecordingUrl || undefined,
        });
    } catch (err) {
        // Log only — Twilio retries status callbacks for up to 24 hours on non-2xx.
        // Returning 204 even on DB error prevents infinite retries for a transient glitch.
        console.error("[Twilio] updateCallRecord failed:", err.message);
    }

    res.sendStatus(204);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _webhookUrl(req, path) {
    const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "");
    return base ? `${base}${path}` : `${req.protocol}://${req.headers.host}${path}`;
}

function _fallbackTwiml(response) {
    response.say("We are experiencing a technical issue. Please call back shortly. Goodbye.");
    response.hangup();
}
