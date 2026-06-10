import { getAnalytics } from "../services/analytics.service.js";

export const getAnalyticsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await getAnalytics(req.user.id, activeBusinessId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};
