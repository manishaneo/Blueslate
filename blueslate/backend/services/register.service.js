import bcrypt               from "bcryptjs";
import prisma               from "../prismaClient.js";
import { AppError }         from "../middleware/AppError.js";
import { normalizeWebsite } from "../utils/normalizeWebsite.js";

const BCRYPT_ROUNDS = 12;

const ROLE_MAP = {
    APP_ADMIN:      "app_admin",
    BUSINESS_ADMIN: "business_admin",
};

export async function registerBusiness({ ownerName, email, phone, password, businessName, website: websiteRaw }) {
    let website;
    try {
        website = normalizeWebsite(websiteRaw);
    } catch {
        throw new AppError("Enter a valid website URL.", 400);
    }

    // ── 1. Uniqueness pre-checks (outside transaction — fast, cheap) ──────────

    const [existingUser, existingWebsite, existingBizName] = await Promise.all([
        prisma.user.findUnique({
            where:  { email },
            select: { id: true },
        }),
        prisma.business.findFirst({
            where:  { website },
            select: { id: true },
        }),
        prisma.business.findFirst({
            where:  { name: { equals: businessName, mode: "insensitive" } },
            select: { id: true },
        }),
    ]);

    if (existingUser)    throw new AppError("An account with this email already exists.", 409);
    if (existingWebsite) throw new AppError("A business with this website is already registered.", 409);
    if (existingBizName) throw new AppError("A business with this name already exists.", 409);

    // ── 2. Hash password ──────────────────────────────────────────────────────

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── 3. Atomic transaction: User + Business + BusinessMember + BusinessSettings

    const { user, business } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                name:          ownerName,
                email,
                passwordHash,
                role:          "BUSINESS_ADMIN",
                emailVerified: true,
            },
            select: {
                id:        true,
                email:     true,
                name:      true,
                role:      true,
                createdAt: true,
            },
        });

        const newBusiness = await tx.business.create({
            data: {
                name:    businessName,
                website,
                status:  "active",
            },
            select: {
                id:        true,
                name:      true,
                website:   true,
                status:    true,
                createdAt: true,
            },
        });

        await tx.businessMember.create({
            data: {
                businessId: newBusiness.id,
                userId:     newUser.id,
                role:       "admin",
            },
        });

        await tx.businessSettings.create({
            data: {
                businessId:     newBusiness.id,
                escalationPhone: phone,
                // aiPersonaName, tone, language use schema defaults
            },
        });

        return { user: newUser, business: newBusiness };
    });

    return {
        user: {
            id:    user.id,
            email: user.email,
            name:  user.name,
            role:  ROLE_MAP[user.role] ?? user.role.toLowerCase(),
        },
        business: {
            id:      business.id,
            name:    business.name,
            website: business.website,
            status:  business.status,
        },
    };
}
