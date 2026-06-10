import { AppError } from "./AppError.js";

// Formats Zod issues into { field, message } pairs (Zod v4: .issues, not .errors)
function formatZodErrors(error) {
    return error.issues.map((issue) => ({
        field:   issue.path.join(".") || "body",
        message: issue.message,
    }));
}

/**
 * Validates req.body against a Zod schema.
 * Replaces req.body with the parsed (coerced + stripped) value on success.
 */
export const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
            errors:  formatZodErrors(result.error),
        });
    }
    req.body = result.data;
    next();
};

/**
 * Validates req.query against a Zod schema.
 * Replaces req.query with the parsed value on success.
 */
export const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
            errors:  formatZodErrors(result.error),
        });
    }
    req.query = result.data;
    next();
};
