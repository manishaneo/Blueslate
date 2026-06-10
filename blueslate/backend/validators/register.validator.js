import { z } from "zod";

export const registerSchema = z.object({
    ownerName: z
        .string()
        .trim()
        .min(2,  "Name must be at least 2 characters.")
        .max(255, "Name must be at most 255 characters."),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Must be a valid email address."),

    phone: z
        .string()
        .trim()
        .min(7,  "Enter a valid phone number.")
        .max(20, "Phone number is too long."),

    password: z
        .string()
        .min(8,  "Password must be at least 8 characters.")
        .max(72, "Password must be at most 72 characters."),

    businessName: z
        .string()
        .trim()
        .min(2,  "Business name must be at least 2 characters.")
        .max(255, "Business name must be at most 255 characters."),

    website: z
        .string()
        .trim()
        .url("Enter a valid website URL (include https://).")
        .max(2048, "URL is too long."),
});
