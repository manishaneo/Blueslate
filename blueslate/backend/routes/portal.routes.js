import { Router }           from "express";
import { handleLookup,
         handlePortalChat,
         handlePortalFinalize,
         handlePortalLeadCreate,
         handleCallMe,
         handleFollowUp,
         handleCallStatus } from "../controllers/portal.controller.js";
import {
    portalLookupLimiter,
    portalChatIpLimiter,
    portalChatTokenLimiter,
    portalFinalizeLimiter,
    portalLeadsLimiter,
    portalCallMeLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

// Public — no authenticate middleware on any route.
// Business identity is conveyed via a signed portal token, not by JWT auth.

// POST /api/portal/lookup           — 30 req / 10 min per IP
router.post  ("/lookup",                   portalLookupLimiter,                                handleLookup);

// POST /api/portal/chat             — 60 req / 10 min per IP + 30 req / 10 min per token
router.post  ("/chat",                     portalChatIpLimiter, portalChatTokenLimiter,         handlePortalChat);

// PATCH /api/portal/finalize/:id    — 20 req / 10 min per IP
router.patch ("/finalize/:conversationId", portalFinalizeLimiter,                              handlePortalFinalize);

// POST /api/portal/leads            — 10 req / 10 min per IP
router.post  ("/leads",                    portalLeadsLimiter,                                 handlePortalLeadCreate);

// POST /api/portal/call-me          — 5 req / 10 min per IP (each request dials a real phone)
router.post  ("/call-me",                  portalCallMeLimiter,                                handleCallMe);

// POST /api/portal/follow-up
router.post  ("/follow-up",                portalLeadsLimiter,                                 handleFollowUp);

// GET /api/portal/call-status/:token
router.get   ("/call-status/:token",       portalLookupLimiter,                                handleCallStatus);

export default router;
