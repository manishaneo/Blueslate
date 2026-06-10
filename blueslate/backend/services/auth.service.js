import bcrypt      from "bcryptjs";
import prisma       from "../prismaClient.js";
import { AppError } from "../middleware/AppError.js";

// Maps Prisma enum values → frontend role strings
const ROLE_MAP = {
    APP_ADMIN:      "app_admin",
    BUSINESS_ADMIN: "business_admin",
};

// Generic message used for all credential failures — prevents user enumeration.
const INVALID_CREDS = "Invalid email or password.";

export async function loginUser({ email, password }) {
    // 1. Find user by email (include only the fields we need)
    const user = await prisma.user.findUnique({
        where:  { email },
        select: {
            id:           true,
            email:        true,
            name:         true,
            role:         true,
            passwordHash: true,
            deletedAt:    true,
        },
    });

    // 2. Unknown email — same message as wrong password (no enumeration)
    if (!user) {
        throw new AppError(INVALID_CREDS, 401);
    }

    // 3. Soft-deleted account
    if (user.deletedAt !== null) {
        throw new AppError(INVALID_CREDS, 401);
    }

    // 4. Compare plaintext password against stored hash
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw new AppError(INVALID_CREDS, 401);
    }

    // 5. Fetch ALL businesses the user belongs to, ordered by first joined.
    //    App admins have no memberships — businesses will be [] for them.
    const memberships = await prisma.businessMember.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: {
            business: {
                select: { id: true, name: true, website: true, status: true },
            },
        },
    });

    const businesses    = memberships.map((m) => m.business);
    const firstBusiness = businesses[0] ?? null;

    // 5.5  Reject login if every business belonging to this user is disabled.
    //      App Admins have no memberships, so this check is skipped for them.
    if (user.role === "BUSINESS_ADMIN" && businesses.length > 0) {
        const allDisabled = businesses.every((b) => b.status === "disabled");
        if (allDisabled) {
            throw new AppError(
                "Your business account has been disabled. Please contact support.",
                403
            );
        }
    }

    // 6. Return only the public shape — never expose passwordHash
    return {
        id:         user.id,
        email:      user.email,
        name:       user.name,
        role:       ROLE_MAP[user.role] ?? user.role.toLowerCase(),
        business:   firstBusiness,
        businesses,
    };
}
