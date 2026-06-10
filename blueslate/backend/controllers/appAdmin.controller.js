import {
    listBusinesses,
    getAnalytics,
    setBusinessStatus,
} from "../services/appAdmin.service.js";

// ── GET /api/app-admin/businesses ─────────────────────────────────────────────

export const listBusinessesHandler = async (req, res, next) => {
    try {
        const businesses = await listBusinesses();
        return res.json({ success: true, data: businesses });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/app-admin/analytics ──────────────────────────────────────────────

export const getAnalyticsHandler = async (req, res, next) => {
    try {
        const analytics = await getAnalytics();
        return res.json({ success: true, data: analytics });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/app-admin/businesses/:id/status ────────────────────────────────

export const setStatusHandler = async (req, res, next) => {
    try {
        const { id }     = req.params;
        const { status } = req.body;

        const updated = await setBusinessStatus(id, status);
        return res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};
