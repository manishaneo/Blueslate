import { Router } from "express";
import {
    createLeadHandler,
    getLeadsHandler,
    getLeadHandler,
    exportLeadsHandler,
    updateLeadStatusHandler,
    getLeadConversationsHandler,
} from "../controllers/lead.controller.js";

const router = Router();

router.get("/export", exportLeadsHandler);
router.post("/", createLeadHandler);
router.get("/", getLeadsHandler);
router.get("/:id", getLeadHandler);
router.patch("/:id/status", updateLeadStatusHandler);
router.get("/:id/conversations", getLeadConversationsHandler);

export default router;
