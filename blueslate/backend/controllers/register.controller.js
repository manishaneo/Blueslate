import { registerBusiness } from "../services/register.service.js";
import { signToken }         from "../utils/jwt.js";

// ── POST /api/auth/register ───────────────────────────────────────────────────

export const registerHandler = async (req, res, next) => {
    try {
        const { ownerName, email, phone, password, businessName, website } = req.body;

        const result = await registerBusiness({
            ownerName,
            email,
            phone,
            password,
            businessName,
            website,
        });

        const token = signToken({ userId: result.user.id, role: result.user.role });

        return res.status(201).json({
            success:  true,
            token,
            user:     result.user,
            business: result.business,
        });
    } catch (err) {
        next(err);
    }
};
