import jwt                                        from "jsonwebtoken";
import prisma                                     from "../prismaClient.js";
import { AppError }                               from "../middleware/AppError.js";
import { normalizeWebsite }                       from "../utils/normalizeWebsite.js";
import { askGemini }                              from "./ai.service.js";
import { detectIntent, getSmallTalkResponse }     from "./intent.service.js";
import { generateGroqAnswer, generateConversationSummary } from "./groq.service.js";
import { extractLeadData }                        from "./leadExtraction.service.js";
import { createLead, findLeadByEmail }            from "./lead.service.js";

const PORTAL_TOKEN_EXPIRY = "24h";

// ── token helpers ─────────────────────────────────────────────────────────────

function signPortalToken(businessId, businessContextId) {
    return jwt.sign(
        { businessId, businessContextId, type: "portal" },
        process.env.JWT_SECRET,
        { expiresIn: PORTAL_TOKEN_EXPIRY }
    );
}

function decodePortalToken(token) {
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        const message =
            err.name === "TokenExpiredError"
                ? "Session expired. Please search again."
                : "Invalid session token.";
        throw new AppError(message, 401);
    }

    if (
        payload.type          !== "portal" ||
        typeof payload.businessId          !== "string" ||
        typeof payload.businessContextId   !== "number"
    ) {
        throw new AppError("Invalid session token.", 401);
    }

    return payload;
}

// ── lookupBusiness ────────────────────────────────────────────────────────────
//
// 1. Normalize the caller-supplied website URL.
// 2. Fetch all active businesses and compare normalized hostnames in memory —
//    this handles pre-existing data that was stored without normalization
//    (e.g. trailing slashes, www prefixes).
// 3. Find the most recent BusinessContext for the matched business.
// 4. Sign and return a short-lived portal token. businessId is never exposed
//    to the client — only the signed token travels over the wire.

export async function lookupBusiness(websiteInput) {
    let normalized;
    try {
        normalized = normalizeWebsite(websiteInput);
    } catch {
        throw new AppError("Enter a valid website URL.", 400);
    }

    // Fetch all non-deleted businesses so we can distinguish "disabled" from "unknown".
    const businesses = await prisma.business.findMany({
        where:  { deletedAt: null },
        select: { id: true, name: true, website: true, status: true },
    });

    const match = businesses.find((b) => {
        try {
            return normalizeWebsite(b.website) === normalized;
        } catch {
            return false;
        }
    });

    if (!match) {
        throw new AppError("This business is not using Blueslate yet.", 404);
    }

    if (match.status === "disabled") {
        throw new AppError("This business is currently unavailable.", 503);
    }

    if (match.status !== "active") {
        throw new AppError("This business is not using Blueslate yet.", 404);
    }

    // Most recent context (Phase-1 legacy model used by chat + leads)
    const context = await prisma.businessContext.findFirst({
        where:   { businessId: match.id },
        orderBy: { createdAt: "desc" },
        select:  { id: true },
    });

    if (!context) {
        throw new AppError("This business is not using Blueslate yet.", 404);
    }

    const settings = await prisma.businessSettings.upsert({
        where:  { businessId: match.id },
        create: { businessId: match.id },
        update: {},
        select: { aiPersonaName: true },
    });
    const receptionistName = settings.aiPersonaName ?? "Virtual Receptionist";

    const conversationToken = signPortalToken(match.id, context.id);

    return { businessName: match.name, conversationToken, receptionistName };
}

// ── portalChat ────────────────────────────────────────────────────────────────
//
// 1. Validate the portal token — extracts businessId + businessContextId.
// 2. Optionally load an existing Conversation (verified to belong to the same business).
// 3. Run the full AI pipeline: intent detection → lead extraction → Gemini retrieval → Groq answer.
// 4. Append user + assistant turns and persist.

export async function portalChat(conversationToken, question, conversationId, source = "customer_portal_chat") {
    // 1. Decode and validate token
    const { businessId, businessContextId } = decodePortalToken(conversationToken);

    // 2. Re-check that the business is still active (token may pre-date a disable action)
    const bizStatus = await prisma.business.findUnique({
        where:  { id: businessId },
        select: { status: true },
    });
    if (!bizStatus || bizStatus.status === "disabled") {
        throw new AppError("This business is currently unavailable.", 503);
    }

    // 3. Verify context still exists in DB
    const businessContext = await prisma.businessContext.findUnique({
        where: { id: businessContextId },
    });
    if (!businessContext) {
        throw new AppError("This business is not using Blueslate yet.", 404);
    }

    // 3. Load existing conversation (security: only if it belongs to this token's business)
    let conversation = null;
    if (conversationId) {
        const existing = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (existing && existing.businessId === businessId) {
            conversation = existing;
        }
    }

    // 4. AI pipeline
    const intentData = await detectIntent(question);
    let answer;
    let createdLeadId = null;

    if (intentData.intent === "small_talk") {
        answer = getSmallTalkResponse(intentData, businessContext.title);
    } else if (!businessContext.content) {
        answer = "I don't have information available for this business yet.";
    } else {
        // Lead extraction — failure is non-fatal; chat continues regardless
        try {
            const { name, email, phone, interest } = extractLeadData(question);
            if (email || phone) {
                const existing = email
                    ? await findLeadByEmail(email, [businessContextId])
                    : null;
                if (!existing) {
                    const newLead = await createLead({ businessContextId, name, email, phone, interest });
                    createdLeadId = newLead?.id ?? null;
                }
            }
        } catch (leadErr) {
            console.error("[portal] lead extraction:", leadErr.message);
        }

        const retrieved = await askGemini(businessContext.content, question);
        try {
            answer = await generateGroqAnswer(
                retrieved,
                question,
                businessContext.title ?? ""
            );
        } catch {
            answer = retrieved;
        }
    }

    // 5. Build new turns
    const now           = Math.floor(Date.now() / 1000);
    const userTurn      = { role: "user",      content: question, ts: now     };
    const assistantTurn = { role: "assistant",  content: answer,   ts: now + 1 };

    const priorTranscript = Array.isArray(conversation?.transcript)
        ? conversation.transcript
        : [];
    const updatedTranscript = [...priorTranscript, userTurn, assistantTurn];

    // 6. Persist conversation (link lead and write escalation metadata if applicable)
    const leadId = conversation?.leadId ?? (createdLeadId ?? null);

    const escalationMeta = intentData.requiresHuman ? {
        outcome:          "ESCALATED",
        escalationIntent: intentData.intent,
        escalatedAt:      new Date().toISOString(),
    } : null;

    const existingMeta = (typeof conversation?.metadata === "object" && conversation?.metadata !== null)
        ? conversation.metadata
        : {};

    if (conversation) {
        conversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                transcript: updatedTranscript,
                ...(leadId !== null && conversation.leadId === null ? { leadId } : {}),
                ...(escalationMeta ? { metadata: { ...existingMeta, ...escalationMeta } } : {}),
            },
        });
    } else {
        conversation = await prisma.conversation.create({
            data: {
                businessId,
                businessContextId,
                source,
                transcript: updatedTranscript,
                ...(leadId !== null ? { leadId } : {}),
                ...(escalationMeta ? { metadata: escalationMeta } : {}),
            },
        });
    }

    // Fire-and-forget summary generation
    generateConversationSummary(updatedTranscript, businessContext.title)
        .then((summary) => {
            if (summary) {
                return prisma.conversation.update({
                    where: { id: conversation.id },
                    data:  { summary },
                });
            }
        })
        .catch(() => {});

    return {
        answer,
        intent:         intentData,
        conversationId: conversation.id,
        leadCaptured:   conversation.leadId !== null,
    };
}

// ── portalCreateLead ──────────────────────────────────────────────────────────
// Creates a lead from the post-conversation form and links it to the
// conversation. Deduplicates by email within the same business context.

export async function portalCreateLead(token, { name, email, phone, notes, conversationId }) {
    const { businessId, businessContextId } = decodePortalToken(token);

    const bizStatus = await prisma.business.findUnique({
        where:  { id: businessId },
        select: { status: true },
    });
    if (!bizStatus || bizStatus.status === "disabled") {
        throw new AppError("This business is currently unavailable.", 503);
    }

    // Fetch conversation once — used for both source derivation and lead linking.
    const conv = conversationId
        ? await prisma.conversation.findUnique({
              where:  { id: conversationId },
              select: { id: true, businessId: true, leadId: true, source: true, metadata: true },
          })
        : null;

    // Derive lead source from conversation channel + escalation state.
    let leadSource = null;
    if (conv && conv.businessId === businessId) {
        const isEscalated = conv.metadata?.outcome === "ESCALATED";
        if (conv.source === "customer_portal_chat") {
            leadSource = isEscalated ? "form_chat_escalation" : "form_post_chat";
        } else if (conv.source === "customer_portal_voice") {
            leadSource = isEscalated ? "form_voice_escalation" : "form_post_voice";
        }
    }

    // Dedup by email within this business context
    const existing = email ? await findLeadByEmail(email, [businessContextId]) : null;
    const lead = existing ?? await createLead({
        businessContextId,
        name:     name    ?? null,
        email:    email   ?? null,
        phone:    phone   ?? null,
        notes:    notes   ?? null,
        source:   leadSource,
        interest: null,
    });

    // Link lead to conversation if not already linked
    if (conv && conv.businessId === businessId && conv.leadId === null) {
        await prisma.conversation.update({
            where: { id: conversationId },
            data:  { leadId: lead.id },
        });
    }

    return { lead };
}

// ── portalFinalizeConversation ─────────────────────────────────────────────────
// Writes call metadata (outcome, duration, intent, lead) to a portal voice
// conversation. Uses the portal token to verify ownership — no JWT required.

export async function portalFinalizeConversation(token, conversationId, metadata) {
    const { businessId } = decodePortalToken(token);

    const bizStatus = await prisma.business.findUnique({
        where:  { id: businessId },
        select: { status: true },
    });
    if (!bizStatus || bizStatus.status === "disabled") {
        throw new AppError("This business is currently unavailable.", 503);
    }

    const conversation = await prisma.conversation.findUnique({
        where:  { id: conversationId },
        select: { id: true, businessId: true },
    });

    if (!conversation || conversation.businessId !== businessId) {
        throw new AppError("Conversation not found.", 404);
    }

    return prisma.conversation.update({
        where:  { id: conversationId },
        data:   { metadata: metadata ?? {} },
        select: { id: true, metadata: true, updatedAt: true },
    });
}
