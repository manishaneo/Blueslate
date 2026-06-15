import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./prismaClient.js";
import {
    createBusinessContext,
    getBusinessContexts,
} from "./services/businessContext.service.js";
import {
    extractWebsiteMetadata,
} from "./services/websiteAnalysis.service.js";
import chatRoutes from "./routes/chat.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import leadExtractionRoutes from "./routes/leadExtraction.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import portalRoutes from "./routes/portal.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import knowledgeBaseRoutes from "./routes/knowledgeBase.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import demoRoutes from "./routes/demo.routes.js";
import appAdminRoutes from "./routes/appAdmin.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/authenticate.js";
import { requireRole } from "./middleware/requireRole.js";
import { resolveActiveBusiness } from "./utils/resolveActiveBusiness.js";
import { AppError } from "./middleware/AppError.js";
import { globalLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
// Trust exactly one reverse-proxy hop (Nginx, Cloudflare, etc.).
// Lets Express read X-Forwarded-For and set req.ip to the real client IP.
// '1' is safer than 'true': 'true' would trust any number of hops, allowing
// clients to spoof their IP via a crafted X-Forwarded-For header.
app.set("trust proxy", 1);

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(helmet());
app.use(globalLimiter);   // rate-check before body parsing — rejects bots without wasted CPU
app.use(express.json());  // body parsing runs only for requests that cleared the global limit

// ── Public routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/lead-extraction", authenticate, leadExtractionRoutes);

// ── App Admin routes — require app_admin role ─────────────────────────────────
app.use("/api/app-admin", authenticate, requireRole("app_admin"), appAdminRoutes);

// ── Protected routes — require valid JWT ──────────────────────────────────────
app.use("/api/business", authenticate, businessRoutes);
app.use("/api/chat", authenticate, chatRoutes);
app.use("/api/leads", authenticate, leadRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/settings", authenticate, settingsRoutes);
app.use("/api/conversations", authenticate, conversationsRoutes);
app.use("/api/knowledge-base", authenticate, knowledgeBaseRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);

app.get("/", (req, res) => {
    res.send("Backend Running");
});

const PORT = 5000;

app.post("/api/business-context", authenticate, requireRole("business_admin"), async (req, res) => {
    try {
        const { websiteUrl } = req.body;

        // Resolve the active business from the validated header.
        // Throws AppError(400) if the supplied ID is not owned by this user.
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);

        const metadata = await extractWebsiteMetadata(websiteUrl);

        const businessContext = await createBusinessContext(
            businessId,
            websiteUrl,
            metadata.title,
            metadata.description,
            metadata.content,
            metadata.faqs ?? [],
            new Date()
        );

        res.status(201).json({
            success: true,
            data: businessContext,
        });
    } catch (error) {
        if (error.isOperational) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

app.get("/api/business-context", authenticate, requireRole("business_admin"), async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        if (!businessId) {
            return res.status(400).json({ success: false, message: "No active business found." });
        }
        const businessContexts = await getBusinessContexts(businessId);
        res.json({ success: true, data: businessContexts });
    } catch (error) {
        if (error.isOperational) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post("/api/analyze-website", authenticate, async (req, res) => {
    try {
        const { websiteUrl } = req.body;

        const metadata = await extractWebsiteMetadata(websiteUrl);

        res.json({
            success: true,
            data: metadata,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend connected successfully",
    });
});

// Must be registered LAST — catches all errors forwarded via next(err)
app.use(errorHandler);