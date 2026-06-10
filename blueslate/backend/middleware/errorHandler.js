import { AppError } from "./AppError.js";

/**
 * Global Express error handler.
 * Must be registered LAST — after all routes — in server.js.
 *
 * Operational errors (AppError): send the exact message + status code.
 * Unexpected errors:             send a generic 500, log the full error.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    // Prisma: record not found
    if (err.code === "P2025") {
        return res.status(404).json({
            success: false,
            message: "Record not found.",
        });
    }

    // Prisma: unique constraint violation
    if (err.code === "P2002") {
        const field = err.meta?.target?.join(", ") ?? "field";
        return res.status(409).json({
            success: false,
            message: `A record with this ${field} already exists.`,
        });
    }

    // Operational errors — safe to expose
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Unknown / programmer errors — never expose internals
    console.error("[Unhandled Error]", err);

    const isDev = process.env.NODE_ENV === "development";

    return res.status(500).json({
        success: false,
        message: "An unexpected error occurred.",
        ...(isDev && { stack: err.stack }),
    });
};
