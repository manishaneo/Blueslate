import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Must be a valid email address."),

    password: z
        .string()
        .min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Must be a valid email address."),
});

export const resetPasswordSchema = z.object({
    token: z
        .string()
        .trim()
        .min(1, "Reset token is required.")
        .regex(/^[0-9a-f]{64}$/, "Invalid reset token format."),

    password: z
        .string()
        .min(8,  "Password must be at least 8 characters.")
        .max(72, "Password must be at most 72 characters."),
});
