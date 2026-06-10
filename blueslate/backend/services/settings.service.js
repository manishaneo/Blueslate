import prisma                     from "../prismaClient.js";
import { AppError }               from "../middleware/AppError.js";
import { resolveActiveBusiness }  from "../utils/resolveActiveBusiness.js";
import { extractWebsiteMetadata } from "./websiteAnalysis.service.js";

// ── GET /api/settings ─────────────────────────────────────────────────────────

export async function getSettings(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const [business, settings, context] = await Promise.all([
        prisma.business.findUnique({
            where:  { id: businessId },
            select: { id: true, name: true, website: true, status: true },
        }),
        prisma.businessSettings.findUnique({
            where:  { businessId },
            select: { aiPersonaName: true, tone: true, language: true, greeting: true },
        }),
        prisma.businessContext.findFirst({
            where:   { businessId },
            orderBy: { createdAt: "desc" },
            select:  { id: true, createdAt: true, lastScrapedAt: true, content: true },
        }),
    ]);

    if (!business) throw new AppError("Business not found.", 404);

    return {
        business: {
            id:      business.id,
            name:    business.name,
            website: business.website,
            status:  business.status,
        },
        settings: {
            aiPersonaName: settings?.aiPersonaName ?? "Auri",
            tone:          settings?.tone          ?? "professional",
            language:      settings?.language      ?? "en",
            greeting:      settings?.greeting      ?? "",
        },
        knowledgeBase: {
            businessContextId: context?.id ?? null,
            // lastScrapedAt is null for rows created before this field was added;
            // fall back to createdAt so the UI always shows a meaningful date.
            lastScrapedAt:     context?.lastScrapedAt ?? context?.createdAt ?? null,
            contentLength:     context?.content?.length ?? 0,
            hasContent:        !!(context?.content),
            preview:           context?.content?.slice(0, 1000) ?? null,
        },
    };
}

// ── PATCH /api/settings ───────────────────────────────────────────────────────

const ALLOWED_FIELDS = ["aiPersonaName", "tone", "language", "greeting"];

export async function updateSettings(userId, activeBusinessId, body) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    // Only pick explicitly allowed fields — never touch businessId or other columns.
    const data = {};
    for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
        throw new AppError("No valid fields provided for update.", 400);
    }

    const updated = await prisma.businessSettings.update({
        where:  { businessId },
        data,
        select: { aiPersonaName: true, tone: true, language: true, greeting: true },
    });

    return updated;
}

// ── POST /api/settings/retrain ────────────────────────────────────────────────

export async function retrainKnowledgeBase(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const business = await prisma.business.findUnique({
        where:  { id: businessId },
        select: { website: true },
    });

    if (!business?.website) {
        throw new AppError("Business has no website configured.", 400);
    }

    let metadata;
    try {
        metadata = await extractWebsiteMetadata(business.website);
    } catch {
        throw new AppError("Website unreachable. Please check the URL.", 500);
    }

    const now = new Date();

    const existing = await prisma.businessContext.findFirst({
        where:   { businessId },
        orderBy: { createdAt: "desc" },
        select:  { id: true },
    });

    if (existing) {
        await prisma.businessContext.update({
            where: { id: existing.id },
            data: {
                title:         metadata.title,
                description:   metadata.description,
                content:       metadata.content,
                faqs:          metadata.faqs ?? [],
                lastScrapedAt: now,
            },
        });
    } else {
        // First-time scrape for businesses that skipped the onboarding scrape flow.
        await prisma.businessContext.create({
            data: {
                businessId,
                websiteUrl:    business.website,
                title:         metadata.title,
                description:   metadata.description,
                content:       metadata.content,
                faqs:          metadata.faqs ?? [],
                lastScrapedAt: now,
            },
        });
    }

    return { message: "Website retrained successfully." };
}

// ── GET /api/knowledge-base ───────────────────────────────────────────────────
// Returns the full content blob and structured FAQs for the active business.
// Kept separate from getSettings so the Settings page payload stays small.

export async function getKnowledgeBase(userId, activeBusinessId) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const context = await prisma.businessContext.findFirst({
        where:   { businessId },
        orderBy: { createdAt: "desc" },
        select:  { id: true, createdAt: true, lastScrapedAt: true, content: true, faqs: true },
    });

    return {
        businessContextId: context?.id ?? null,
        lastScrapedAt:     context?.lastScrapedAt ?? context?.createdAt ?? null,
        content:           context?.content ?? null,
        faqs:              Array.isArray(context?.faqs) ? context.faqs : [],
    };
}
