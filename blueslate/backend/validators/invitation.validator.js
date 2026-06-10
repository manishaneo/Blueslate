import { z } from "zod";

// ── POST /api/invitations ─────────────────────────────────────────────────────

export const createInvitationSchema = z.object({
    businessName: z
        .string({ required_error: "businessName is required." })
        .trim()
        .min(2,  "businessName must be at least 2 characters.")
        .max(255, "businessName must be at most 255 characters."),

    email: z
        .string({ required_error: "email is required." })
        .trim()
        .toLowerCase()
        .email("Must be a valid email address."),
});

// ── GET /api/invitations/validate?token= ──────────────────────────────────────

export const validateTokenSchema = z.object({
    token: z
        .string({ required_error: "token query parameter is required." })
        .min(1, "token cannot be empty."),
});

// ── POST /api/invitations/accept ──────────────────────────────────────────────

export const acceptInvitationSchema = z.object({
    token: z
        .string({ required_error: "token is required." })
        .min(1, "token cannot be empty."),

    name: z
        .string({ required_error: "name is required." })
        .trim()
        .min(2,  "name must be at least 2 characters.")
        .max(255, "name must be at most 255 characters."),

    password: z
        .string({ required_error: "password is required." })
        .min(8,  "password must be at least 8 characters.")
        .max(72, "password must be at most 72 characters."), // bcrypt truncates at 72
});
