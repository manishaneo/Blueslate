import prisma                    from "../prismaClient.js";
import { AppError }              from "../middleware/AppError.js";
import { normalizeWebsite }      from "../utils/normalizeWebsite.js";
import { extractWebsiteMetadata } from "./websiteAnalysis.service.js";
import { createBusinessContext }  from "./businessContext.service.js";

/**
 * Add a new business for an already-authenticated user.
 *
 * Never creates a new User row. Takes userId from req.user.id (JWT), not from
 * the request body. A single user may own multiple businesses via BusinessMember.
 *
 * Order of operations:
 *  1. Pre-checks — website + name uniqueness, confirm user exists
 *  2. Scrape website — fail fast before writing any DB records
 *  3. Transaction — Business + BusinessMember (admin) + BusinessSettings
 *  4. BusinessContext — legacy Phase-1 row used by chat and leads
 */
export async function addBusiness({ userId, businessName, website: websiteRaw }) {
    let website;
    try {
        website = normalizeWebsite(websiteRaw);
    } catch {
        throw new AppError("Enter a valid website URL.", 400);
    }

    // ── 1. Pre-checks ─────────────────────────────────────────────────────────

    const [existingWebsite, existingBizName, userExists] = await Promise.all([
        prisma.business.findFirst({
            where:  { website },
            select: { id: true },
        }),
        prisma.business.findFirst({
            where:  { name: { equals: businessName, mode: "insensitive" } },
            select: { id: true },
        }),
        prisma.user.findUnique({
            where:  { id: userId },
            select: { id: true },
        }),
    ]);

    if (!userExists)     throw new AppError("User not found.", 404);
    if (existingWebsite) throw new AppError("A business with this website is already registered.", 409);
    if (existingBizName) throw new AppError("A business with this name already exists.", 409);

    // ── 2. Scrape first — validates URL is reachable before any DB writes ─────

    const metadata = await extractWebsiteMetadata(website);

    // ── 3. Atomic transaction ─────────────────────────────────────────────────

    const business = await prisma.$transaction(async (tx) => {
        const newBusiness = await tx.business.create({
            data: {
                name:   businessName,
                website,
                status: "active",
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
                userId,
                role:       "admin",
            },
        });

        await tx.businessSettings.create({
            data: { businessId: newBusiness.id },
        });

        return newBusiness;
    });

    // ── 4. Legacy BusinessContext (Phase-1 model — used by chat + leads) ──────

    const businessContext = await createBusinessContext(
        business.id,
        website,
        metadata.title,
        metadata.description,
        metadata.content,
    );

    return { business, businessContext };
}
