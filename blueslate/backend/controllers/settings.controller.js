import {
    getSettings,
    updateSettings,
    retrainKnowledgeBase,
} from "../services/settings.service.js";

export const getSettingsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await getSettings(req.user.id, activeBusinessId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const updateSettingsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await updateSettings(req.user.id, activeBusinessId, req.body);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const retrainHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const result = await retrainKnowledgeBase(req.user.id, activeBusinessId);
        res.json({ success: true, message: result.message });
    } catch (err) {
        next(err);
    }
};
