import prisma from "../prismaClient.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";
import { AppError }              from "../middleware/AppError.js";

/**
 * Resolve the Phase-1 BusinessContext IDs for the active business.
 *
 * Delegates business ownership validation to resolveActiveBusiness, which
 * verifies the client-supplied activeBusinessId against BusinessMember rows
 * before using it, and falls back to the user's first business otherwise.
 * Returns [] when the user has no businesses or the business has no context.
 */
async function resolveContextIds(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);

    if (!businessId) return [];

    const contexts = await prisma.businessContext.findMany({
        where:  { businessId },
        select: { id: true },
    });

    return contexts.map((c) => c.id);
}

// Internal use only — caller must supply a server-resolved businessContextId.
// Used by chat.service, which already resolves the context before calling this.
export const createLead = async (data) => {
    return prisma.lead.create({ data });
};

/**
 * Create a lead scoped to the authenticated user's active business.
 *
 * Resolves: userId + activeBusinessId → BusinessMember → BusinessContext
 * Throws AppError(400) if the activeBusinessId is invalid.
 * Throws AppError(404) if the business has no scraped context yet.
 * Never trusts a businessContextId from the client.
 */
export const createLeadForActiveContext = async (userId, activeBusinessId, leadData) => {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);

    if (!businessId) {
        throw new AppError("No business context found. Please complete your business setup first.", 404);
    }

    const context = await prisma.businessContext.findFirst({
        where:   { businessId },
        orderBy: { createdAt: "desc" },
        select:  { id: true },
    });

    if (!context) {
        throw new AppError("No business context found for this business.", 404);
    }

    return prisma.lead.create({
        data: {
            businessContextId: context.id,
            name:     leadData.name     ?? null,
            email:    leadData.email    ?? null,
            phone:    leadData.phone    ?? null,
            interest: leadData.interest ?? null,
            notes:    leadData.notes    ?? null,
            source:   leadData.source   ?? null,
        },
    });
};

/**
 * Find a lead by email, scoped to a specific set of business context IDs.
 *
 * Pass contextIds to scope the search to one business — this ensures
 * alice@example.com can be captured independently by Business A and B.
 *
 * contextIds = null  → legacy global search (chat.service, until that task lands)
 * contextIds = []    → user has no contexts; always returns null
 * contextIds = [...]  → scoped to that business's contexts
 */
export const findLeadByEmail = async (email, contextIds = null) => {
    if (contextIds !== null && contextIds.length === 0) return null;

    const where = { email };
    if (contextIds !== null) {
        where.businessContextId = { in: contextIds };
    }

    return prisma.lead.findFirst({ where });
};

/**
 * Return all leads belonging to the active business.
 * Returns [] when the user has no membership or no scraped context yet.
 */
export const getLeads = async (userId, activeBusinessId) => {
    const contextIds = await resolveContextIds(userId, activeBusinessId);
    if (contextIds.length === 0) return [];

    return prisma.lead.findMany({
        where:   { businessContextId: { in: contextIds } },
        orderBy: { createdAt: "desc" },
    });
};

/**
 * Update a lead's status, verifying the lead belongs to the active business.
 * Throws a P2025-coded error (caught as 404 by the controller) if the lead
 * does not exist or belongs to a different business.
 */
export const updateLeadStatus = async (id, status, userId, activeBusinessId) => {
    const contextIds = await resolveContextIds(userId, activeBusinessId);

    const owned = contextIds.length > 0
        ? await prisma.lead.findFirst({
              where:  { id, businessContextId: { in: contextIds } },
              select: { id: true },
          })
        : null;

    if (!owned) {
        const err = new Error("Lead not found.");
        err.code = "P2025";
        throw err;
    }

    return prisma.lead.update({
        where: { id },
        data:  { status },
    });
};
