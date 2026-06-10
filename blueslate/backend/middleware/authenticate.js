import { verifyToken } from "../utils/jwt.js";

/**
 * Verifies the Bearer token in the Authorization header.
 * On success: populates req.user = { id, role } and calls next().
 * On failure: returns 401 — never calls next().
 */
export function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    const token = header.slice(7); // strip "Bearer "

    try {
        const payload = verifyToken(token);
        req.user = { id: payload.userId, role: payload.role };
        next();
    } catch (err) {
        const message =
            err.name === "TokenExpiredError"
                ? "Session expired. Please log in again."
                : "Invalid token. Please log in again.";

        return res.status(401).json({ success: false, message });
    }
}
