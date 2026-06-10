import { randomBytes }  from "crypto";
import bcrypt           from "bcryptjs";
import prisma           from "../prismaClient.js";
import { AppError }     from "../middleware/AppError.js";

const BCRYPT_ROUNDS     = 12;
const TOKEN_BYTES       = 32;              // 256-bit hex token
const EXPIRY_DAYS       = 7;
const EXPIRY_MS         = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ── helpers ───────────────────────────────────────────────────────────────────

function buildInvitationLink(token) {
    const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
    return `${base}/accept-invite?token=${token}`;
}

function isExpired(invitation) {
    return new Date(invitation.expiresAt) < new Date();
}

// Safe public shape returned to callers (never expose the token in lists)
function publicInvitation(inv) {
    return {
        id:           inv.id,
        email:        inv.email,
        businessName: inv.businessName,
        businessId:   inv.businessId,
        status:       inv.status,
        expiresAt:    inv.expiresAt,
        createdAt:    inv.createdAt,
    };
}

// ── createInvitation ──────────────────────────────────────────────────────────
// POST /api/invitations
// 1. Reject duplicate pending (non-expired) invitations for the same email.
// 2. Find-or-create the Business.
// 3. Generate a cryptographically random token with a 7-day expiry.
// 4. Return the invitation link so the caller can forward it manually.

export async function createInvitation({ businessName, email }) {
    // 1. Duplicate pending check
    const existingPending = await prisma.invitation.findFirst({
        where: {
            email,
            status:    "pending",
            expiresAt: { gt: new Date() },
        },
    });

    if (existingPending) {
        throw new AppError(
            `A pending invitation for ${email} already exists. ` +
            `It expires at ${existingPending.expiresAt.toISOString()}.`,
            409
        );
    }

    // 2. Find or create the business
    //    website defaults to '' — updated when the Business Admin completes setup.
    let business = await prisma.business.findFirst({
        where: {
            name: { equals: businessName, mode: "insensitive" },
        },
    });

    if (!business) {
        business = await prisma.business.create({
            data: {
                name:    businessName,
                website: "",              // filled in during business setup flow
                status:  "pending_setup",
            },
        });
    }

    // 3. Generate invitation
    const token     = randomBytes(TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_MS);

    const invitation = await prisma.invitation.create({
        data: {
            email,
            businessName,
            businessId: business.id,
            token,
            status:     "pending",
            expiresAt,
        },
    });

    return {
        invitation:     publicInvitation(invitation),
        invitationLink: buildInvitationLink(token),
        expiresInDays:  EXPIRY_DAYS,
    };
}

// ── validateInvitationToken ───────────────────────────────────────────────────
// GET /api/invitations/validate?token=
// Verifies: exists · pending · not expired

export async function validateInvitationToken(token) {
    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
            business: {
                select: { id: true, name: true, status: true },
            },
        },
    });

    if (!invitation) {
        throw new AppError("Invitation not found. The link may be invalid.", 404);
    }

    if (invitation.status === "accepted") {
        throw new AppError("This invitation has already been accepted.", 400);
    }

    if (invitation.status === "expired" || isExpired(invitation)) {
        // Lazily mark expired in the DB
        if (invitation.status !== "expired") {
            await prisma.invitation.update({
                where: { id: invitation.id },
                data:  { status: "expired" },
            });
        }
        throw new AppError("This invitation has expired. Please request a new one.", 400);
    }

    return {
        invitation: publicInvitation(invitation),
        business:   invitation.business,
    };
}

// ── acceptInvitation ──────────────────────────────────────────────────────────
// POST /api/invitations/accept
// 1. Validate token.
// 2. Ensure email is not already registered.
// 3. Hash password.
// 4. Atomically: create User → create BusinessMember → mark Invitation accepted.

export async function acceptInvitation({ token, name, password }) {
    // 1. Validate token (reuse the same guard)
    const invitation = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invitation) {
        throw new AppError("Invitation not found. The link may be invalid.", 404);
    }
    if (invitation.status === "accepted") {
        throw new AppError("This invitation has already been accepted.", 400);
    }
    if (invitation.status === "expired" || isExpired(invitation)) {
        throw new AppError("This invitation has expired. Please request a new one.", 400);
    }
    if (!invitation.businessId) {
        throw new AppError("This invitation is not linked to a business. Contact support.", 500);
    }

    // 2. Prevent duplicate accounts
    const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
    });
    if (existingUser) {
        throw new AppError(
            `An account for ${invitation.email} already exists. Please log in instead.`,
            409
        );
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 4. Atomic transaction: user + membership + invitation update
    const { user, business } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                name,
                email:         invitation.email,
                passwordHash,
                role:          "BUSINESS_ADMIN",
                emailVerified: true,
            },
            select: {
                id:        true,
                name:      true,
                email:     true,
                role:      true,
                createdAt: true,
            },
        });

        await tx.businessMember.create({
            data: {
                businessId: invitation.businessId,
                userId:     newUser.id,
                role:       "admin",
            },
        });

        await tx.invitation.update({
            where: { id: invitation.id },
            data:  { status: "accepted", acceptedAt: new Date() },
        });

        const biz = await tx.business.findUnique({
            where:  { id: invitation.businessId },
            select: { id: true, name: true, status: true },
        });

        return { user: newUser, business: biz };
    });

    return { user, business };
}
