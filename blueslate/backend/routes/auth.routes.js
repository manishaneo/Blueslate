import { Router }                from "express";
import { loginHandler, getMyBusinessesHandler } from "../controllers/auth.controller.js";
import { registerHandler }       from "../controllers/register.controller.js";
import { validateBody }          from "../middleware/validate.js";
import { loginSchema }           from "../validators/auth.validator.js";
import { registerSchema }        from "../validators/register.validator.js";
import { authLoginLimiter, authRegisterLimiter } from "../middleware/rateLimiter.js";
import { authenticate }          from "../middleware/authenticate.js";

const router = Router();

// POST /api/auth/login     — 10 req / 15 min per IP
router.post("/login",    authLoginLimiter,    validateBody(loginSchema),    loginHandler);

// POST /api/auth/register  — 5 req / 1 hr per IP
router.post("/register", authRegisterLimiter, validateBody(registerSchema), registerHandler);

// GET  /api/auth/me/businesses — returns fresh business membership list (requires auth)
router.get("/me/businesses", authenticate, getMyBusinessesHandler);

export default router;
