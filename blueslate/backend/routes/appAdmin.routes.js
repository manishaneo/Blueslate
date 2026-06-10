import { Router } from "express";
import {
    listBusinessesHandler,
    getAnalyticsHandler,
    setStatusHandler,
} from "../controllers/appAdmin.controller.js";

const router = Router();

// All routes here are already guarded by authenticate + requireRole("app_admin")
// applied in server.js at the mount point.

// GET  /api/app-admin/businesses
router.get("/businesses", listBusinessesHandler);

// GET  /api/app-admin/analytics
router.get("/analytics", getAnalyticsHandler);

// PATCH /api/app-admin/businesses/:id/status   body: { status: "active" | "disabled" }
router.patch("/businesses/:id/status", setStatusHandler);

export default router;
