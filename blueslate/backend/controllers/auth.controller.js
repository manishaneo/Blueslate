import { loginUser, getMyBusinesses } from "../services/auth.service.js";
import { signToken } from "../utils/jwt.js";

// ── GET /api/auth/me/businesses ───────────────────────────────────────────────

export const getMyBusinessesHandler = async (req, res, next) => {
    try {
        const businesses = await getMyBusinesses(req.user.id);
        return res.json({ success: true, data: businesses });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export const loginHandler = async (req, res, next) => {
    try {
        const { email, password } = req.body; // already validated by Zod

        const result = await loginUser({ email, password });
        const token  = signToken({ userId: result.id, role: result.role });

        const { business, businesses, ...user } = result;

        return res.json({
            success:    true,
            token,
            user,
            business,
            businesses,
        });
    } catch (err) {
        next(err);
    }
};
