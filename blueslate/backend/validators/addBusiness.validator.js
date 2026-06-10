import { z } from "zod";

export const addBusinessSchema = z.object({
    businessName: z
        .string()
        .trim()
        .min(2,   "Business name must be at least 2 characters.")
        .max(255, "Business name must be at most 255 characters."),

    website: z
        .string()
        .trim()
        .url("Enter a valid website URL (include https://).")
        .max(2048, "URL is too long."),
});
