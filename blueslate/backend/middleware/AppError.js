/**
 * AppError — operational errors that are safe to expose to the client.
 *
 * Non-operational errors (programmer mistakes, unexpected DB failures, etc.)
 * are caught by the global errorHandler and returned as a generic 500.
 */
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode   = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
