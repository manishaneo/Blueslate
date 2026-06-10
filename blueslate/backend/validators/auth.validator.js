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
