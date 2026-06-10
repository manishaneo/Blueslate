import { Router }      from "express";
import { requireRole } from "../middleware/requireRole.js";
import {
    getConversationsHandler,
    getConversationByIdHandler,
    finalizeConversationHandler,
} from "../controllers/conversations.controller.js";

const router = Router();

// JWT stores lowercase role string — must match.
router.use(requireRole("business_admin"));

router.get("/",       getConversationsHandler);
router.get("/:id",    getConversationByIdHandler);
router.patch("/:id",  finalizeConversationHandler);

export default router;
