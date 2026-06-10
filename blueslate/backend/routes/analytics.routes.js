import { Router }               from "express";
import { requireRole }          from "../middleware/requireRole.js";
import { getAnalyticsHandler }  from "../controllers/analytics.controller.js";

const router = Router();

router.use(requireRole("business_admin"));
router.get("/", getAnalyticsHandler);

export default router;
