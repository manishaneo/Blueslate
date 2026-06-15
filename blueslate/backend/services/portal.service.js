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

// Intents that qualify for opportunity-lead capture even without contact info.
// requiresHuman intents are handled via intentData.requiresHuman — listed here
// are the non-escalation intents that still represent strong purchase/enrollment intent.
const OPPORTUNITY_INTENTS = new Set(["pricing", "admissions", "trial_booking"]);

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

// ── content parsers ───────────────────────────────────────────────────────────
// These extract structured fields from the pre-built content text blob so the
// welcome page can display rich business info without a new DB schema.

// "Services offered: A, B, C." → ["A", "B", "C"]
function parseListSection(content, label) {
    if (!content) return [];
    const re = new RegExp(`^${label}:\\s*(.+?)(?:\\.)?\\s*$`, "m");
    const m  = content.match(re);
    if (!m?.[1]?.trim()) return [];
    return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

// "Contact information:\nPhone: ...\nEmail: ..." → trimmed multiline string
function parseContactFromContent(content) {
    if (!content) return null;
    const m = content.match(/Contact information:\n([\s\S]+?)(?=\nBusiness hours:|\n\n|$)/);
    if (!m?.[1]?.trim()) return null;
    return m[1].replace(/\.\s*$/, "").trim() || null;
}

// "Business hours:\nMon-Fri: 9-5." → trimmed multiline string
function parseHoursFromContent(content) {
    if (!content) return null;
    const m = content.match(/Business hours:\n([\s\S]+?)(?=\n\n|$)/);
    if (!m?.[1]?.trim()) return null;
    return m[1].replace(/\.\s*$/, "").trim() || null;
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
        select:  { id: true, title: true, description: true, content: true, websiteUrl: true },
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

    // Parse structured sections from the content blob for the welcome page.
    const services      = parseListSection(context.content, "Services offered");
    const programs      = parseListSection(context.content, "Programs and classes");
    const contactInfo   = parseContactFromContent(context.content);
    const businessHours = parseHoursFromContent(context.content);

    return {
        businessName:      match.name,
        conversationToken,
        receptionistName,
        businessData: {
            description:   context.description  || null,
            websiteUrl:    context.websiteUrl   || match.website || null,
            services,
            programs,
            contactInfo,
            businessHours,
        },
    };
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
    console.log("[portal-debug] portalChat | intent detected:", intentData.intent, "| requiresHuman:", intentData.requiresHuman, "| confidence:", intentData.confidence);
    let answer;
    let createdLeadId = null;

    if (intentData.intent === "small_talk") {
        answer = getSmallTalkResponse(intentData, businessContext.title);
    } else if (!businessContext.content) {
        answer = "I don't have information available for this business yet.";
    } else {
        // Lead extraction — failure is non-fatal; chat continues regardless
        try {
            const extracted = extractLeadData(question);
            const { name, email, phone, interest } = extracted;
            console.log("[portal-debug] portalChat | raw question:", JSON.stringify(question));
            console.log("[portal-debug] portalChat | extractLeadData result:", JSON.stringify({ name, email, phone }));
            if (email || phone) {
                console.log("[portal-debug] portalChat | email/phone found — checking dedup. businessContextId:", businessContextId);
                const existing = email
                    ? await findLeadByEmail(email, [businessContextId])
                    : null;
                console.log("[portal-debug] portalChat | dedup result:", existing ? `existing id=${existing.id}` : "none");
                if (!existing) {
                    const payload = { businessContextId, name, email, phone, interest };
                    console.log("[portal-debug] portalChat | calling createLead with:", JSON.stringify(payload));
                    const newLead = await createLead(payload);
                    createdLeadId = newLead?.id ?? null;
                    console.log("[portal-debug] portalChat | createLead succeeded — leadId:", createdLeadId);
                }
            } else {
                console.log("[portal-debug] portalChat | no email/phone in question — lead creation skipped");
            }
        } catch (leadErr) {
            console.error("[portal-debug] portalChat | LEAD EXTRACTION ERROR (full object):", leadErr);
            if (leadErr?.stack) console.error("[portal-debug] portalChat | stack:", leadErr.stack);
        }

        // ── Opportunity-lead capture ──────────────────────────────────────────
        // Create a lead even when no email/phone was provided, if the message
        // signals strong purchase/enrollment intent or requires a human.
        // Skip if the conversation already has a linked lead (dedup by conversation).
        if (!createdLeadId) {
            const conversationAlreadyLinked = conversation?.leadId != null;
            const qualifiesAsOpportunity =
                intentData.requiresHuman === true ||
                OPPORTUNITY_INTENTS.has(intentData.intent);

            if (!conversationAlreadyLinked && qualifiesAsOpportunity) {
                const opportunitySource = source === "customer_portal_voice"
                    ? "voice_opportunity"
                    : "chat_opportunity";
                try {
                    const opLead = await createLead({
                        businessContextId,
                        name:     null,
                        email:    null,
                        phone:    null,
                        interest: question,
                        source:   opportunitySource,
                        status:   "NEEDS_CONTACT_INFO",
                    });
                    createdLeadId = opLead?.id ?? null;
                    console.log(
                        "[portal-debug] portalChat | opportunity lead created | leadId:", createdLeadId,
                        "| intent:", intentData.intent,
                        "| requiresHuman:", intentData.requiresHuman,
                        "| reason: high-intent conversation — no contact info (opportunity-only lead)"
                    );
                } catch (opErr) {
                    console.error("[portal-debug] portalChat | opportunity lead creation FAILED:", opErr.message);
                }
            } else {
                console.log(
                    "[portal-debug] portalChat | no lead created | intent:", intentData.intent,
                    "| conversationAlreadyLinked:", conversationAlreadyLinked,
                    "| qualifiesAsOpportunity:", qualifiesAsOpportunity
                );
            }
        } else {
            console.log("[portal-debug] portalChat | lead reason: contact info (email/phone) found | leadId:", createdLeadId);
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
        select: {
            id:                true,
            businessId:        true,
            metadata:          true,
            transcript:        true,
            leadId:            true,
            businessContextId: true,
        },
    });

    if (!conversation || conversation.businessId !== businessId) {
        throw new AppError("Conversation not found.", 404);
    }

    // Fix 4: merge incoming metadata with existing instead of overwriting
    const existingMeta = (typeof conversation.metadata === "object" && conversation.metadata !== null)
        ? conversation.metadata
        : {};
    const merged = { ...existingMeta, ...(metadata ?? {}) };

    const updated = await prisma.conversation.update({
        where:  { id: conversationId },
        data:   { metadata: merged },
        select: { id: true, metadata: true, updatedAt: true },
    });

    // Fix 3: auto-extract leads from the voice transcript when none are linked yet.
    // Scans every user turn; creates and links a lead on the first message that
    // contains a recognisable email or phone number.
    console.log("[portal-debug] portalFinalizeConversation | conversationId:", conversationId, "| existing leadId:", conversation.leadId, "| transcript type:", typeof conversation.transcript, "| isArray:", Array.isArray(conversation.transcript), "| transcript length:", Array.isArray(conversation.transcript) ? conversation.transcript.length : "n/a");
    if (conversation.leadId === null && Array.isArray(conversation.transcript)) {
        console.log("[portal-debug] transcript scan starting — turns:", JSON.stringify(conversation.transcript));
        try {
            for (const turn of conversation.transcript) {
                console.log("[portal-debug] inspecting turn | role:", turn.role, "| content:", JSON.stringify(turn.content ?? turn.text ?? ""));
                if (turn.role !== "user" && turn.role !== "caller") continue;
                const text = (turn.content ?? turn.text ?? "").trim();
                if (!text) continue;
                const { name, email, phone, interest } = extractLeadData(text);
                console.log("[portal-debug] extractLeadData result | text:", JSON.stringify(text), "| name:", name, "| email:", email, "| phone:", phone);
                if (email || phone) {
                    const existing = email
                        ? await findLeadByEmail(email, [conversation.businessContextId])
                        : null;
                    console.log("[portal-debug] dedup check | existing:", existing?.id ?? null);
                    const lead = existing ?? await createLead({
                        businessContextId: conversation.businessContextId,
                        name:     name     ?? null,
                        email:    email    ?? null,
                        phone:    phone    ?? null,
                        interest: interest ?? null,
                        source:   "auto_voice_transcript",
                    });
                    console.log("[portal-debug] lead upserted | leadId:", lead.id);
                    await prisma.conversation.update({
                        where: { id: conversationId },
                        data:  { leadId: lead.id },
                    });
                    console.log("[portal-debug] conversation.leadId updated to:", lead.id);
                    break;
                }
            }
        } catch (err) {
            console.error("[portal-debug] auto voice lead extraction ERROR:", err.message, err.stack);
        }

        // ── Opportunity-lead fallback for voice ───────────────────────────────
        // If no email/phone was found in any turn, check for high-intent messages
        // and create an opportunity lead so the conversation isn't lost.
        const reloaded = await prisma.conversation.findUnique({
            where:  { id: conversationId },
            select: { leadId: true },
        });
        if (reloaded?.leadId === null) {
            try {
                for (const turn of conversation.transcript) {
                    if (turn.role !== "user" && turn.role !== "caller") continue;
                    const text = (turn.content ?? turn.text ?? "").trim();
                    if (!text) continue;
                    const intentData = detectIntent(text);
                    const qualifies =
                        intentData.requiresHuman === true ||
                        OPPORTUNITY_INTENTS.has(intentData.intent);
                    console.log(
                        "[portal-debug] portalFinalizeConversation | opportunity scan | intent:", intentData.intent,
                        "| requiresHuman:", intentData.requiresHuman,
                        "| qualifies:", qualifies
                    );
                    if (qualifies) {
                        const opLead = await createLead({
                            businessContextId: conversation.businessContextId,
                            name:     null,
                            email:    null,
                            phone:    null,
                            interest: text,
                            source:   "voice_opportunity",
                            status:   "NEEDS_CONTACT_INFO",
                        });
                        await prisma.conversation.update({
                            where: { id: conversationId },
                            data:  { leadId: opLead.id },
                        });
                        console.log(
                            "[portal-debug] portalFinalizeConversation | opportunity lead created | leadId:", opLead.id,
                            "| intent:", intentData.intent,
                            "| reason: voice transcript high-intent, no contact info"
                        );
                        break;
                    }
                }
            } catch (opErr) {
                console.error("[portal-debug] portalFinalizeConversation | opportunity lead FAILED:", opErr.message);
            }
        }
    } else {
        console.log("[portal-debug] transcript scan skipped — leadId already set or transcript not an array");
    }

    return updated;
}
