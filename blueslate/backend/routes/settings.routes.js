import { Router }       from "express";
import { requireRole }  from "../middleware/requireRole.js";
import {
    getSettingsHandler,
    updateSettingsHandler,
    retrainHandler,
} from "../controllers/settings.controller.js";

const router = Router();

// All settings endpoints require business_admin role.
// The JWT stores the lowercase role string ("business_admin").
router.use(requireRole("business_admin"));

router.get("/",         getSettingsHandler);
router.patch("/",       updateSettingsHandler);
router.post("/retrain", retrainHandler);

export default router;
