import { loginUser, getMyBusinesses }                 from "../services/auth.service.js";
import { requestPasswordReset, resetPassword }         from "../services/passwordReset.service.js";
import { signToken }                                   from "../utils/jwt.js";

// ── GET /api/auth/me/businesses ───────────────────────────────────────────────

export const getMyBusinessesHandler = async (req, res, next) => {
    try {
        const businesses = await getMyBusinesses(req.user.id);
        return res.json({ success: true, data: businesses });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

export const forgotPasswordHandler = async (req, res, next) => {
    try {
        const { email } = req.body;
        await requestPasswordReset(email);
        // Always 200 — never reveal whether the address is registered
        return res.json({
            success: true,
            message: "If that email address is registered, you'll receive a reset link shortly.",
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

export const resetPasswordHandler = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        await resetPassword(token, password);
        return res.json({
            success: true,
            message: "Your password has been updated. You can now sign in.",
        });
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
