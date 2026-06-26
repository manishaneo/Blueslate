/**
 * request.controller.js
 */
import * as requestService from '../services/request.service.js';
import { resolveActiveBusiness } from '../utils/resolveActiveBusiness.js';
import { scheduleMeeting } from '../services/meeting.service.js';
import prisma from '../prismaClient.js';

export const getRequests = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const requests = await requestService.getRequests(businessId, req.query);
        res.json(requests);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const { id } = req.params;
        const request = await requestService.getRequestById(id, businessId);
        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }
        res.json(request);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to fetch request" });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;
        const updated = await requestService.updateStatus(id, businessId, status, userId);
        res.json(updated);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to update request status" });
    }
};

export const assignRequest = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const userId = req.user.id;
        const { id } = req.params;
        const { assigneeId } = req.body;
        const updated = await requestService.assignRequest(id, businessId, assigneeId, userId);
        res.json(updated);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to assign request" });
    }
};

export const scheduleMeetingHandler = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const { id } = req.params;
        const { scheduledAt, durationMinutes, notes } = req.body;

        const request = await requestService.getRequestById(id, businessId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        const customerEmail = request.snapshotEmail || request.lead?.email;
        const customerPhone = request.snapshotPhone || request.lead?.phone;

        if (!customerEmail) {
            return res.status(400).json({ error: "Customer email is required to schedule a meeting." });
        }

        const admin = await prisma.user.findUnique({ where: { id: req.user.id } });
        const business = await prisma.business.findUnique({ where: { id: businessId } });

        const meeting = await scheduleMeeting({
            requestId: id,
            businessId,
            customerEmail,
            customerPhone,
            scheduledAt,
            durationMinutes: parseInt(durationMinutes, 10),
            notes,
            adminEmail: admin.email,
            businessName: business.name
        });

        res.json(meeting);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: err.message || "Failed to schedule meeting" });
    }
};
