/**
 * request.routes.js
 */
import express from 'express';
const router = express.Router();
import * as requestController from '../controllers/request.controller.js';
import * as internalNoteController from '../controllers/internalNote.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { authenticate } from '../middleware/authenticate.js';

// All request routes require authentication and BUSINESS_ADMIN role
router.use(authenticate);
router.use(requireRole('business_admin'));

// Requests
router.get('/', requestController.getRequests);
router.get('/:id', requestController.getRequestById);
router.patch('/:id/status', requestController.updateStatus);
router.patch('/:id/assign', requestController.assignRequest);
router.post('/:id/meeting', requestController.scheduleMeetingHandler);

// Internal Notes
router.post('/:id/notes', internalNoteController.addNote);
router.get('/:id/notes', internalNoteController.getNotes);

export default router;
