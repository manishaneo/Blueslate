import { Router }                  from "express";
import { requireRole }             from "../middleware/requireRole.js";
import { getKnowledgeBaseHandler } from "../controllers/knowledgeBase.controller.js";

const router = Router();

router.use(requireRole("business_admin"));

router.get("/", getKnowledgeBaseHandler);

export default router;
