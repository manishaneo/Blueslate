import prisma       from "../prismaClient.js";
import { AppError } from "../middleware/AppError.js";

const DISABLED_MSG = "This business account has been disabled.";

/**
 * Resolve the business to scope a request against.
 *
 * If requestedId is provided:
 *   - Valid member + active/pending_setup → return businessId.
 *   - Valid member + disabled             → throw AppError(403).
 *   - Not a member                        → throw AppError(400).
 *
 * If requestedId is omitted (null/undefined):
 *   - First business active/pending_setup → return businessId.
 *   - First business disabled             → throw AppError(403).
 *   - No memberships at all              → return null.
 *
 * This is the single enforcement point for disabled-business access.
 * Every service that calls this function inherits the check automatically.
 */
export async function resolveActiveBusiness(userId, requestedId) {
    if (requestedId) {
        const member = await prisma.businessMember.findFirst({
            where:  { userId, businessId: requestedId },
            select: {
                businessId: true,
                business:   { select: { status: true } },
            },
        });

        if (!member) throw new AppError("Invalid active business.", 400);

        if (member.business.status === "disabled") {
            throw new AppError(DISABLED_MSG, 403);
        }

        return member.businessId;
    }

    // No ID supplied — default to the user's first business by membership order.
    const first = await prisma.businessMember.findFirst({
        where:   { userId },
        orderBy: { createdAt: "asc" },
        select: {
            businessId: true,
            business:   { select: { status: true } },
        },
    });

    if (!first) return null;

    if (first.business.status === "disabled") {
        throw new AppError(DISABLED_MSG, 403);
    }

    return first.businessId;
}
