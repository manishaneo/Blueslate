import { Router } from "express";
import {
    createLeadHandler,
    getLeadsHandler,
    exportLeadsHandler,
    updateLeadStatusHandler,
} from "../controllers/lead.controller.js";

const router = Router();

router.get("/export", exportLeadsHandler);
router.post("/", createLeadHandler);
router.get("/", getLeadsHandler);
router.patch("/:id/status", updateLeadStatusHandler);

export default router;
