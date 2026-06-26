/**
 * notification.routes.js
 */
import express from 'express';
const router = express.Router();
import * as notificationController from '../controllers/notification.controller.js';
import { requireRole } from '../middleware/requireRole.js';
import { authenticate } from '../middleware/authenticate.js';

// All notification routes require authentication and BUSINESS_ADMIN role
router.use(authenticate);
router.use(requireRole('business_admin'));

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

// Note: No POST route. Notifications are purely event-driven.

export default router;
