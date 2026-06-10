import { Router }           from "express";
import { handleLookup,
         handlePortalChat,
         handlePortalFinalize,
         handlePortalLeadCreate } from "../controllers/portal.controller.js";
import {
    portalLookupLimiter,
    portalChatIpLimiter,
    portalChatTokenLimiter,
    portalFinalizeLimiter,
    portalLeadsLimiter,
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

export default router;
