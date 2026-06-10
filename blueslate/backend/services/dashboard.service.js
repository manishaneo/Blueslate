import prisma from "../prismaClient.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";

const ZERO_STATS = {
    totalLeads: 0,
    leadsToday: 0,
    leadsThisWeek: 0,
    emailsCaptured: 0,
    phonesCaptured: 0,
    newLeads: 0,
    contactedLeads: 0,
    convertedLeads: 0,
};

/**
 * Resolve Phase-1 BusinessContext IDs for the active business.
 *
 * Delegates business ownership validation to resolveActiveBusiness, which
 * verifies the client-supplied activeBusinessId against BusinessMember rows
 * before using it, and falls back to the user's first business otherwise.
 */
async function resolveContextIds(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);

    if (!businessId) return null;

    const contexts = await prisma.businessContext.findMany({
        where:  { businessId },
        select: { id: true },
    });

    return contexts.length > 0 ? contexts.map((c) => c.id) : null;
}

export const getDashboardStats = async (userId, activeBusinessId) => {
    const contextIds = await resolveContextIds(userId, activeBusinessId);

    // No context scraped yet — return safe zeros instead of throwing.
    if (contextIds === null) return ZERO_STATS;

    const now = new Date();

    // Midnight UTC of the current day
    const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // Exactly 7 days ago from now
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const scope = { businessContextId: { in: contextIds } };

    const [
        totalLeads,
        leadsToday,
        leadsThisWeek,
        emailsCaptured,
        phonesCaptured,
        newLeads,
        contactedLeads,
        convertedLeads,
    ] = await prisma.$transaction([
        prisma.lead.count({ where: { ...scope } }),
        prisma.lead.count({ where: { ...scope, createdAt: { gte: startOfToday } } }),
        prisma.lead.count({ where: { ...scope, createdAt: { gte: startOfWeek } } }),
        prisma.lead.count({ where: { ...scope, email: { not: null } } }),
        prisma.lead.count({ where: { ...scope, phone: { not: null } } }),
        prisma.lead.count({ where: { ...scope, status: "NEW" } }),
        prisma.lead.count({ where: { ...scope, status: "CONTACTED" } }),
        prisma.lead.count({ where: { ...scope, status: "CONVERTED" } }),
    ]);

    return {
        totalLeads,
        leadsToday,
        leadsThisWeek,
        emailsCaptured,
        phonesCaptured,
        newLeads,
        contactedLeads,
        convertedLeads,
    };
};
