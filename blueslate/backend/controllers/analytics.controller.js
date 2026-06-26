import { getAnalytics } from "../services/analytics.service.js";
import { getAnalyticsDashboard } from "../services/analyticsDashboard.service.js";

export const getAnalyticsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await getAnalytics(req.user.id, activeBusinessId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const getAnalyticsDashboardHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const { startDate, endDate } = req.query;
        const data = await getAnalyticsDashboard(req.user.id, activeBusinessId, { startDate, endDate });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};
