import prisma     from "../prismaClient.js";
import { AppError } from "../middleware/AppError.js";

// ── listBusinesses ────────────────────────────────────────────────────────────
// Returns all non-deleted businesses, each with their primary admin's name/email.
// A business may have zero admin members if it was created via invitation and the
// invite was never accepted — ownerName / ownerEmail will be null in that case.

export async function listBusinesses() {
    const rows = await prisma.business.findMany({
        where:   { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
            id:        true,
            name:      true,
            website:   true,
            status:    true,
            createdAt: true,
            members: {
                where:  { role: "admin" },
                take:   1,
                select: {
                    user: {
                        select: { name: true, email: true },
                    },
                },
            },
        },
    });

    return rows.map((b) => {
        const owner = b.members[0]?.user ?? null;
        return {
            id:           b.id,
            businessName: b.name,
            website:      b.website || null,
            status:       b.status,
            createdAt:    b.createdAt,
            ownerName:    owner?.name  ?? null,
            ownerEmail:   owner?.email ?? null,
        };
    });
}

// ── getAnalytics ──────────────────────────────────────────────────────────────
// Aggregate counts for the App Admin dashboard.

export async function getAnalytics() {
    const now            = new Date();
    const startOfMonth   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const base           = { deletedAt: null };

    const [total, active, disabled, pendingSetup, thisMonth] =
        await prisma.$transaction([
            prisma.business.count({ where: { ...base } }),
            prisma.business.count({ where: { ...base, status: "active"        } }),
            prisma.business.count({ where: { ...base, status: "disabled"      } }),
            prisma.business.count({ where: { ...base, status: "pending_setup" } }),
            prisma.business.count({ where: { ...base, createdAt: { gte: startOfMonth } } }),
        ]);

    return {
        totalBusinesses:        total,
        activeBusinesses:       active,
        disabledBusinesses:     disabled,
        pendingSetupBusinesses: pendingSetup,
        businessesJoinedThisMonth: thisMonth,
    };
}

// ── setBusinessStatus ─────────────────────────────────────────────────────────
// Toggles a business between "active" and "disabled".
// Throws if the business does not exist or is in pending_setup (can't toggle setup state).

export async function setBusinessStatus(businessId, newStatus) {
    if (!["active", "disabled"].includes(newStatus)) {
        throw new AppError("status must be 'active' or 'disabled'.", 400);
    }

    const business = await prisma.business.findUnique({
        where:  { id: businessId },
        select: { id: true, status: true, deletedAt: true },
    });

    if (!business || business.deletedAt) {
        throw new AppError("Business not found.", 404);
    }

    const updated = await prisma.business.update({
        where: { id: businessId },
        data:  { status: newStatus },
        select: {
            id:        true,
            name:      true,
            website:   true,
            status:    true,
            createdAt: true,
        },
    });

    return updated;
}
