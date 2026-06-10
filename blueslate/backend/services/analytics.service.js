import prisma from "../prismaClient.js";
import { AppError }              from "../middleware/AppError.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";

// Build a 30-item array (oldest → newest) with a count per local calendar day.
// Days with no records get count: 0.
function localDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayBuckets(records, now, days = 30) {
    const map = {};
    for (const r of records) {
        const key = localDateKey(r.createdAt);
        map[key] = (map[key] ?? 0) + 1;
    }
    return Array.from({ length: days }, (_, i) => {
        const d   = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const key = localDateKey(d);
        return { date: key, count: map[key] ?? 0 };
    });
}

export async function getAnalytics(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    // Leads are Phase-1 model: scoped through BusinessContext IDs, not businessId directly.
    const contexts = await prisma.businessContext.findMany({
        where:  { businessId },
        select: { id: true },
    });
    const contextIds = contexts.map((c) => c.id);
    const hasContext = contextIds.length > 0;

    const now           = new Date();
    const startOfWeek   = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const convWhere     = { businessId };

    // Conversations are Phase-2 model: scoped directly by businessId.
    const [
        totalConversations,
        conversationsThisWeek,
        escalatedConversations,
        portalLegacyCount,
        portalChatCount,
        portalVoiceCount,
        chatCount,
        receptionistCount,
        allConvs30,
    ] = await Promise.all([
        prisma.conversation.count({ where: convWhere }),
        prisma.conversation.count({ where: { ...convWhere, createdAt: { gte: startOfWeek } } }),
        prisma.conversation.count({ where: { ...convWhere, metadata: { path: ["outcome"], equals: "ESCALATED" } } }),
        prisma.conversation.count({ where: { ...convWhere, source: "customer_portal" } }),
        prisma.conversation.count({ where: { ...convWhere, source: "customer_portal_chat" } }),
        prisma.conversation.count({ where: { ...convWhere, source: "customer_portal_voice" } }),
        prisma.conversation.count({ where: { ...convWhere, source: "business_chat" } }),
        prisma.conversation.count({ where: { ...convWhere, source: "receptionist" } }),
        prisma.conversation.findMany({
            where:  { ...convWhere, createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        }),
    ]);

    let totalLeads     = 0;
    let leadsThisWeek  = 0;
    let recentLeads    = [];
    let newCount       = 0;
    let contactedCount = 0;
    let convertedCount = 0;
    let leads30        = [];

    if (hasContext) {
        const leadWhere = { businessContextId: { in: contextIds } };
        [
            totalLeads,
            leadsThisWeek,
            recentLeads,
            newCount,
            contactedCount,
            convertedCount,
            leads30,
        ] = await Promise.all([
            prisma.lead.count({ where: leadWhere }),
            prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: startOfWeek } } }),
            prisma.lead.findMany({
                where:   leadWhere,
                orderBy: { createdAt: "desc" },
                take:    10,
                select:  { id: true, name: true, email: true, phone: true, interest: true, status: true, createdAt: true },
            }),
            prisma.lead.count({ where: { ...leadWhere, status: "NEW" } }),
            prisma.lead.count({ where: { ...leadWhere, status: "CONTACTED" } }),
            prisma.lead.count({ where: { ...leadWhere, status: "CONVERTED" } }),
            prisma.lead.findMany({
                where:  { ...leadWhere, createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true },
            }),
        ]);
    }

    return {
        totalLeads,
        leadsThisWeek,
        totalConversations,
        conversationsThisWeek,
        escalatedConversations,
        recentLeads,
        conversationSources: {
            customer_portal: portalLegacyCount + portalChatCount + portalVoiceCount,
            business_chat:   chatCount,
            receptionist:    receptionistCount,
        },
        leadsByDay:         buildDayBuckets(leads30, now),
        conversationsByDay: buildDayBuckets(allConvs30, now),
        leadsByStatus: {
            NEW:       newCount,
            CONTACTED: contactedCount,
            CONVERTED: convertedCount,
        },
    };
}
