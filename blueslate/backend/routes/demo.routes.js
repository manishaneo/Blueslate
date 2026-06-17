import { Router } from "express";
import { handleDemoInfo, handleDemoSeed, handleScrape, handleChat } from "../controllers/demo.controller.js";
import { demoScrapeLimiter, demoChatLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// GET /api/demo/info — public, no auth — returns phone number, business context, lead count, recent calls
router.get("/info", handleDemoInfo);

// POST /api/demo/seed    — idempotent; scrapes XP League on first call, no-ops on subsequent calls
router.post("/seed",   demoScrapeLimiter, handleDemoSeed);

// POST /api/demo/scrape  — 5 req / 1 hr per IP (external fetch + bandwidth cost)
router.post("/scrape", demoScrapeLimiter, handleScrape);

// POST /api/demo/chat    — 20 req / 10 min per IP (AI API cost)
router.post("/chat",   demoChatLimiter,   handleChat);

export default router;
