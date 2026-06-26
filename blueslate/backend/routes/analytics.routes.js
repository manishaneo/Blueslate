import { Router }               from "express";
import { requireRole }          from "../middleware/requireRole.js";
import { getAnalyticsHandler, getAnalyticsDashboardHandler }  from "../controllers/analytics.controller.js";

const router = Router();

router.use(requireRole("business_admin"));
router.get("/", getAnalyticsHandler);
router.get("/dashboard", getAnalyticsDashboardHandler);

export default router;
