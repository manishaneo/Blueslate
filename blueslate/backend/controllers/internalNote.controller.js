/**
 * internalNote.controller.js
 */
import * as internalNoteService from '../services/internalNote.service.js';
import { resolveActiveBusiness } from '../utils/resolveActiveBusiness.js';

export const addNote = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const userId = req.user.id;
        const { id: requestId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: "Note content is required" });
        }

        const note = await internalNoteService.addNote(requestId, businessId, userId, content);
        res.json(note);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to add internal note" });
    }
};

export const getNotes = async (req, res) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const businessId = await resolveActiveBusiness(req.user.id, activeBusinessId);
        
        const { id: requestId } = req.params;

        const notes = await internalNoteService.getNotes(requestId, businessId);
        res.json(notes);
    } catch (err) {
        if (err.isOperational) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        res.status(500).json({ error: "Failed to fetch internal notes" });
    }
};
