import {
    createInvitation,
    validateInvitationToken,
    acceptInvitation,
} from "../services/invitation.service.js";

// ── POST /api/invitations ─────────────────────────────────────────────────────

export const createInvitationHandler = async (req, res, next) => {
    try {
        const { businessName, email } = req.body; // already validated by Zod

        const result = await createInvitation({ businessName, email });

        return res.status(201).json({
            success: true,
            message: `Invitation created for ${email}. Share the link to complete onboarding.`,
            data:    result,
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/invitations/validate?token= ──────────────────────────────────────

export const validateTokenHandler = async (req, res, next) => {
    try {
        const { token } = req.query; // already validated by Zod

        const result = await validateInvitationToken(token);

        return res.json({
            success: true,
            data:    result,
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/invitations/accept ──────────────────────────────────────────────

export const acceptInvitationHandler = async (req, res, next) => {
    try {
        const { token, name, password } = req.body; // already validated by Zod

        const result = await acceptInvitation({ token, name, password });

        return res.status(201).json({
            success: true,
            message: `Welcome, ${result.user.name}! Your Business Admin account has been created.`,
            data:    result,
        });
    } catch (err) {
        next(err);
    }
};
