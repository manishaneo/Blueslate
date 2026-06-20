import prisma                    from "../prismaClient.js";
import { AppError }             from "../middleware/AppError.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";

const VALID_SOURCES = new Set(["customer_portal", "customer_portal_chat", "customer_portal_voice", "business_chat", "receptionist"]);
const VALID_SORTS   = new Set(["newest", "oldest", "messages"]);

// ── GET /api/conversations ────────────────────────────────────────────────────
// Supports: page, limit, source, sort (newest|oldest|messages),
//           hasLead (true|false), search (summary + lead name/email),
//           dateFrom, dateTo.

export async function getConversations(userId, activeBusinessId, {
    page = 1, limit = 20,
    source   = null,
    hasLead  = null,
    dateFrom = null,
    dateTo   = null,
    search   = null,
    sort     = "newest",
    escalated = null,
} = {}) {
    console.log("CONVERSATIONS SERVICE VERSION 2026-06-07");
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const safePage  = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip      = (safePage - 1) * safeLimit;
    const safeSort  = VALID_SORTS.has(sort) ? sort : "newest";

    // ── Build Prisma ORM where clause ────────────────────────────────────────
    const where = { businessId };

    if (source) {
        const arr = Array.isArray(source) ? source : [source];
        const valid = arr.filter((s) => VALID_SOURCES.has(s));
        if (valid.length === 1) {
            where.source = valid[0];
        } else if (valid.length > 1) {
            where.source = { in: valid };
        }
    }

    if (hasLead === true)       where.leadId = { not: null };
    else if (hasLead === false) where.leadId = null;

    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }

    if (search) {
        const s = search.trim();
        if (s) {
            where.OR = [
                { summary: { contains: s, mode: "insensitive" } },
                { lead: { name:  { contains: s, mode: "insensitive" } } },
                { lead: { email: { contains: s, mode: "insensitive" } } },
            ];
        }
    }

    if (escalated === true) {
        where.metadata = { path: ["outcome"], equals: "ESCALATED" };
    }

    // ── Determine sort order ─────────────────────────────────────────────────
    // "messages" sort: fetch all matching rows, post-sort by transcript length in JS.
    // Acceptable for current scale; revisit with a generated column if volumes grow.
    const isMsgSort = safeSort === "messages";
    const orderBy = safeSort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

    const leadSelect = {
        id:       true,
        name:     true,
        email:    true,
        phone:    true,
        status:   true,
        interest: true,
        notes:    true,
        source:   true,
    };

    const [total, fetched] = await Promise.all([
        prisma.conversation.count({ where }),
        isMsgSort
            ? prisma.conversation.findMany({
                where,
                orderBy,
                include: { lead: { select: leadSelect } },
            })
            : prisma.conversation.findMany({
                where,
                orderBy,
                skip,
                take: safeLimit,
                include: { lead: { select: leadSelect } },
            }),
    ]);

    // Post-sort + paginate for the "messages" path.
    const rows = isMsgSort
        ? fetched
            .sort((a, b) => {
                const aLen = Array.isArray(a.transcript) ? a.transcript.length : 0;
                const bLen = Array.isArray(b.transcript) ? b.transcript.length : 0;
                return bLen - aLen || (new Date(b.createdAt) - new Date(a.createdAt));
            })
            .slice(skip, skip + safeLimit)
        : fetched;

    const conversations = rows.map((c) => {
        const transcript   = Array.isArray(c.transcript) ? c.transcript : [];
        const messageCount = transcript.length;
        const firstUser    = transcript.find((t) => t.role === "user" || t.role === "customer");
        const preview      = firstUser?.content?.slice(0, 120) ?? null;

        return {
            id:                c.id,
            source:            c.source,
            summary:           c.summary,
            preview,
            messageCount,
            transcript,
            metadata:          c.metadata ?? null,
            leadId:            c.leadId   ?? null,
            lead:              c.lead     ?? null,
            createdAt:         c.createdAt,
            updatedAt:         c.updatedAt,
            businessContextId: c.businessContextId,
        };
    });

    return {
        conversations,
        pagination: {
            page:       safePage,
            limit:      safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    };
}

// ── GET /api/conversations/:id ────────────────────────────────────────────────
// Returns full conversation including linked lead details (if leadId is set).

export async function getConversationById(userId, activeBusinessId, conversationId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const conversation = await prisma.conversation.findUnique({
        where:  { id: conversationId },
        select: {
            id:                true,
            businessId:        true,
            source:            true,
            summary:           true,
            transcript:        true,
            metadata:          true,
            leadId:            true,
            createdAt:         true,
            updatedAt:         true,
            businessContextId: true,
        },
    });

    // Same 404 whether the record doesn't exist or belongs to a different business.
    if (!conversation || conversation.businessId !== businessId) {
        throw new AppError("Conversation not found.", 404);
    }

    let lead = null;
    if (conversation.leadId) {
        lead = await prisma.lead.findUnique({
            where:  { id: conversation.leadId },
            select: {
                id:        true,
                name:      true,
                email:     true,
                phone:     true,
                interest:  true,
                notes:     true,
                source:    true,
                status:    true,
                createdAt: true,
            },
        });
    }

    const transcript = Array.isArray(conversation.transcript) ? conversation.transcript : [];

    return {
        id:                conversation.id,
        source:            conversation.source,
        summary:           conversation.summary,
        transcript,
        messageCount:      transcript.length,
        metadata:          conversation.metadata ?? null,
        leadId:            conversation.leadId   ?? null,
        lead:              lead ?? null,
        createdAt:         conversation.createdAt,
        updatedAt:         conversation.updatedAt,
        businessContextId: conversation.businessContextId,
    };
}

// ── PATCH /api/conversations/:id ─────────────────────────────────────────────
// Used by the Receptionist to persist call metadata after the call ends.

export async function finalizeConversation(userId, activeBusinessId, conversationId, { metadata } = {}) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const conversation = await prisma.conversation.findUnique({
        where:  { id: conversationId },
        select: { id: true, businessId: true },
    });

    if (!conversation || conversation.businessId !== businessId) {
        throw new AppError("Conversation not found.", 404);
    }

    const updated = await prisma.conversation.update({
        where:  { id: conversationId },
        data:   { metadata: metadata ?? {} },
        select: { id: true, metadata: true, updatedAt: true },
    });

    return updated;
}
