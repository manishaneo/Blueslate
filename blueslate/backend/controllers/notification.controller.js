/**
 * notification.controller.js
 */
import * as notificationService from '../services/notification.service.js';
import { resolveActiveBusiness } from '../utils/resolveActiveBusiness.js';

export const getNotifications = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const notifications = await notificationService.getNotifications(businessId);
        res.json(notifications);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const { id } = req.params;
        await notificationService.markAsRead(id, businessId);
        res.json({ success: true });
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        await notificationService.markAllAsRead(businessId);
        res.json({ success: true });
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
};
