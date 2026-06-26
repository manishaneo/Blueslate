/**
 * notification.service.js
 */
import prisma from '../prismaClient.js';

export async function generateNotification({ businessId, requestId, title, description, notificationType, priority = 'MEDIUM' }) {
    if (!businessId) throw new Error("businessId is required to generate a notification");

    const notification = await prisma.notification.create({
        data: {
            businessId,
            requestId,
            title,
            description,
            notificationType,
            priority
        }
    });

    return notification;
}

export async function getNotifications(businessId) {
    return prisma.notification.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function markAsRead(notificationId, businessId) {
    return prisma.notification.updateMany({
        where: { id: notificationId, businessId },
        data: { isRead: true }
    });
}

export async function markAllAsRead(businessId) {
    return prisma.notification.updateMany({
        where: { businessId, isRead: false },
        data: { isRead: true }
    });
}
