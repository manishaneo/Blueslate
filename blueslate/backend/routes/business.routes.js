import { Router }              from "express";
import { validateBody }        from "../middleware/validate.js";
import { addBusinessSchema }   from "../validators/addBusiness.validator.js";
import { addBusinessHandler }  from "../controllers/addBusiness.controller.js";

const router = Router();

// POST /api/business
// Adds a new business for an already-authenticated user.
// JWT is required (enforced by the authenticate middleware in server.js).
router.post("/", validateBody(addBusinessSchema), addBusinessHandler);

export default router;
