import { Router } from "express";
import {
    createInvitationHandler,
    validateTokenHandler,
    acceptInvitationHandler,
} from "../controllers/invitation.controller.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
    createInvitationSchema,
    validateTokenSchema,
    acceptInvitationSchema,
} from "../validators/invitation.validator.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { invitationValidateLimiter, invitationAcceptLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST   /api/invitations          — create invitation + business (APP_ADMIN only)
router.post(
    "/",
    authenticate,
    requireRole("app_admin"),
    validateBody(createInvitationSchema),
    createInvitationHandler
);

// GET    /api/invitations/validate  — 20 req / 1 hr per IP (token enumeration guard)
router.get(
    "/validate",
    invitationValidateLimiter,
    validateQuery(validateTokenSchema),
    validateTokenHandler
);

// POST   /api/invitations/accept    — 10 req / 1 hr per IP (token brute-force guard)
router.post(
    "/accept",
    invitationAcceptLimiter,
    validateBody(acceptInvitationSchema),
    acceptInvitationHandler
);

export default router;
