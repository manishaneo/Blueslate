import axios from "axios";
import { AppError } from "../middleware/AppError.js";

const VAPI_BASE = "https://api.vapi.ai";

/**
 * Initiate an outbound phone call via VAPI.
 * VAPI will call `customerPhone` using our purchased phone number,
 * then run `VAPI_ASSISTANT_ID` as the AI receptionist.
 *
 * `metadata.businessId` is forwarded so that the VAPI tool handler
 * (`_resolveBusinessContext`) can scope knowledge-base lookups to the
 * correct business when VAPI fires `getBusinessInfo` / `captureLead`.
 *
 * @param {string} customerPhone  E.164 phone number ("+15551234567")
 * @param {string} businessId     UUID of the business whose assistant answers
 * @returns {{ callId: string }}
 */
export async function initiateVapiOutboundCall(customerPhone, businessId) {
    const apiKey        = process.env.VAPI_API_KEY;
    const assistantId   = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!apiKey || !assistantId || !phoneNumberId) {
        console.error("[Outbound] Missing VAPI env vars — VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID required");
        throw new AppError("Voice calling is not configured. Please try again later.", 503);
    }

    let response;
    try {
        response = await axios.post(
            `${VAPI_BASE}/call/phone`,
            {
                assistantId,
                phoneNumberId,
                customer:  { number: customerPhone },
                metadata:  { businessId },
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 10_000,
            },
        );
    } catch (err) {
        const status  = err.response?.status;
        const message = err.response?.data?.message ?? err.message;
        console.error("[Outbound] VAPI call creation failed:", status, message);

        if (status === 400) {
            const vapiMsg = (err.response?.data?.message ?? "").toLowerCase();
            const msg = vapiMsg.includes("international") || vapiMsg.includes("geo")
                ? "This number cannot be reached from our calling service. Please contact support."
                : "Invalid phone number. Please check the number and try again.";
            throw new AppError(msg, 400);
        }
        throw new AppError("Could not place the call. Please try again in a moment.", 502);
    }

    const callId = response.data?.id;
    if (!callId) {
        console.error("[Outbound] VAPI returned no call id:", response.data);
        throw new AppError("Call could not be placed. Please try again.", 502);
    }

    console.log("[Outbound] VAPI call created — id:", callId, "| to:", customerPhone, "| businessId:", businessId);
    return { callId };
}
