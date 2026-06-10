import { getKnowledgeBase } from "../services/settings.service.js";

export const getKnowledgeBaseHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await getKnowledgeBase(req.user.id, activeBusinessId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};
