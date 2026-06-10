import { getDashboardStats } from "../services/dashboard.service.js";

export const getDashboardStatsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const stats = await getDashboardStats(req.user.id, activeBusinessId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};
