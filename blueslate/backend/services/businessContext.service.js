import prisma from "../prismaClient.js";

export const createBusinessContext = async (
    businessId,
    websiteUrl,
    title,
    description,
    content,
    faqs = [],
    lastScrapedAt = new Date()
) => {
    if (!websiteUrl.startsWith("http")) {
        websiteUrl = `https://${websiteUrl}`;
    }

    try {
        new URL(websiteUrl);
    } catch {
        throw new Error("Invalid website URL");
    }

    return prisma.businessContext.create({
        data: {
            businessId: businessId ?? null,
            websiteUrl,
            title,
            description,
            content,
            faqs,
            lastScrapedAt,
        },
    });
};

export const getBusinessContexts = async (businessId) => {
    return prisma.businessContext.findMany({
        where:   { businessId },
        orderBy: { createdAt: "desc" },
    });
};

export const getBusinessContextById = async (id, businessId) => {
    const parsedId = Number.parseInt(String(id), 10);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return null;
    }

    const record = await prisma.businessContext.findUnique({
        where: { id: parsedId },
    });

    // Return null whether the record doesn't exist or belongs to another tenant.
    // Callers get the same result either way — no cross-tenant information leaks.
    if (!record || record.businessId !== businessId) return null;

    return record;
};