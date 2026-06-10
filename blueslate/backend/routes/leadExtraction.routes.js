import { Router } from "express";
import { extractLeadHandler } from "../controllers/leadExtraction.controller.js";

const router = Router();

router.post("/", extractLeadHandler);

export default router;
