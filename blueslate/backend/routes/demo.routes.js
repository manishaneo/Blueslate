import { Router } from "express";
import { handleScrape, handleChat } from "../controllers/demo.controller.js";
import { demoScrapeLimiter, demoChatLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST /api/demo/scrape  — 5 req / 1 hr per IP (external fetch + bandwidth cost)
router.post("/scrape", demoScrapeLimiter, handleScrape);

// POST /api/demo/chat    — 20 req / 10 min per IP (AI API cost)
router.post("/chat",   demoChatLimiter,   handleChat);

export default router;
