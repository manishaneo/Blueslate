import prisma from "../prismaClient.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";
import { askGemini } from "./ai.service.js";
import { extractLeadData } from "./leadExtraction.service.js";
import { createLead, findLeadByEmail } from "./lead.service.js";
import { detectIntent, getSmallTalkResponse } from "./intent.service.js";
import { generateGroqAnswer, generateConversationSummary } from "./groq.service.js";

async function resolveBusinessAndContext(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) return { businessId: null, businessContext: null };

    const businessContext = await prisma.businessContext.findFirst({
        where:   { businessId },
        orderBy: { createdAt: "desc" },
    });
    return { businessId, businessContext };
}

async function persistConversationTurn(businessId, businessContextId, conversationId, source, question, answer, createdLeadId, businessTitle = "") {
    const now  = Math.floor(Date.now() / 1000);
    const newTurns = [
        { role: "user",      content: question, ts: now },
        { role: "assistant", content: answer,   ts: now + 1 },
    ];

    let existing = null;
    if (conversationId) {
        existing = await prisma.conversation.findUnique({ where: { id: conversationId } }).catch(() => null);
        // Discard silently if it belongs to a different context
        if (existing && existing.businessContextId !== businessContextId) existing = null;
    }

    const prior         = Array.isArray(existing?.transcript) ? existing.transcript : [];
    const newTranscript = [...prior, ...newTurns];
    const leadId        = existing?.leadId ?? (createdLeadId ?? null);

    let conversation;
    if (existing) {
        conversation = await prisma.conversation.update({
            where: { id: existing.id },
            data: {
                transcript: newTranscript,
                ...(leadId !== null && existing.leadId === null ? { leadId } : {}),
            },
        });
    } else {
        conversation = await prisma.conversation.create({
            data: {
                businessId,
                businessContextId,
                source,
                transcript: newTranscript,
                ...(leadId !== null ? { leadId } : {}),
            },
        });
    }

    // Fire-and-forget summary generation
    generateConversationSummary(newTranscript, businessTitle)
        .then((summary) => {
            if (summary) {
                return prisma.conversation.update({
                    where: { id: conversation.id },
                    data:  { summary },
                });
            }
        })
        .catch(() => {});

    return conversation.id;
}

export const answerQuestionNoStore = async (userId, question, activeBusinessId) => {
    const { businessId, businessContext } = await resolveBusinessAndContext(userId, activeBusinessId);

    if (!businessContext) {
        throw new Error("No business context found. Please complete your business setup first.");
    }

    const intentData = detectIntent(question);
    const leadData   = extractLeadData(question);

    if (intentData.intent === "small_talk") {
        const answer = getSmallTalkResponse(intentData, businessContext.title);
        return { answer, intent: intentData, conversationId: null, leadData };
    }

    if (!businessContext.content) {
        throw new Error("This business context has no scraped content to search");
    }

    const retrievedContext = await askGemini(businessContext.content, question);

    let answer;
    try {
        answer = await generateGroqAnswer(retrievedContext, question, businessContext.title ?? "");
    } catch {
        answer = retrievedContext;
    }

    return { answer, intent: intentData, conversationId: null, leadData };
};

export const answerQuestion = async (userId, question, activeBusinessId, conversationId = null, source = "business_chat") => {
    const { businessId, businessContext } = await resolveBusinessAndContext(userId, activeBusinessId);

    if (!businessContext) {
        throw new Error("No business context found. Please complete your business setup first.");
    }

    const intentData = detectIntent(question);

    if (intentData.intent === "small_talk") {
        const answer  = getSmallTalkResponse(intentData, businessContext.title);
        const savedId = await persistConversationTurn(
            businessId, businessContext.id, conversationId, source, question, answer, null,
            businessContext.title ?? ""
        );
        return { answer, intent: intentData, conversationId: savedId };
    }

    if (!businessContext.content) {
        throw new Error("This business context has no scraped content to search");
    }

    let createdLeadId = null;
    const { name, email, phone, interest } = extractLeadData(question);
    console.log("[LEAD EXTRACTION]", { name, email, phone, interest });

    if (email || phone) {
        console.log("[LEAD CHECK]", { email });
        const existing = email ? await findLeadByEmail(email, [businessContext.id]) : null;
        console.log("[EXISTING LEAD]", existing);

        if (!existing) {
            console.log("[CREATING LEAD]", { businessContextId: businessContext.id, name, email, phone, interest });
            const newLead = await createLead({ businessContextId: businessContext.id, name, email, phone, interest });
            createdLeadId = newLead?.id ?? null;
        }
    }

    const retrievedContext = await askGemini(businessContext.content, question);

    let answer;
    try {
        console.log("[DEBUG] retrievedContext:", retrievedContext);
        console.log("[DEBUG] question:", question);
        answer = await generateGroqAnswer(retrievedContext, question, businessContext.title ?? "");
        console.log("[GROQ USED]");
    } catch (err) {
        console.log("[GROQ FALLBACK]");
        answer = retrievedContext;
    }

    const savedId = await persistConversationTurn(
        businessId, businessContext.id, conversationId, source, question, answer, createdLeadId,
        businessContext.title ?? ""
    );

    return { answer, intent: intentData, conversationId: savedId };
};
