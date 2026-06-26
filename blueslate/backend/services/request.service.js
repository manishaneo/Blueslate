/**
 * request.service.js
 */
import prisma from '../prismaClient.js';

export async function getRequests(businessId, filters = {}) {
    return prisma.customerRequest.findMany({
        where: { businessId, ...filters },
        include: {
            lead: true,
            assignedUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getRequestById(requestId, businessId) {
    return prisma.customerRequest.findFirst({
        where: { id: requestId, businessId },
        include: {
            lead: true,
            conversation: { include: { feedback: true } },
            assignedUser: { select: { id: true, name: true, email: true } },
            scheduledMeetings: true,
            feedback: true,
            activities: {
                include: { actor: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            },
            notes: {
                include: { author: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

export async function updateStatus(requestId, businessId, newStatus, adminId) {
    const request = await prisma.customerRequest.findFirst({
        where: { id: requestId, businessId }
    });

    if (!request) throw new Error("Request not found");

    const updated = await prisma.customerRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
    });

    await prisma.requestActivity.create({
        data: {
            requestId,
            type: 'STATUS_CHANGED',
            description: `Status updated to ${newStatus}`,
            actorId: adminId
        }
    });

    return updated;
}

export async function assignRequest(requestId, businessId, assigneeId, adminId) {
    const request = await prisma.customerRequest.findFirst({
        where: { id: requestId, businessId }
    });

    if (!request) throw new Error("Request not found");

    const updated = await prisma.customerRequest.update({
        where: { id: requestId },
        data: { assignedTo: assigneeId, status: 'ASSIGNED' }
    });

    let assigneeName = "a team member";
    if (assigneeId) {
        const user = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (user) assigneeName = user.name;
    }

    await prisma.requestActivity.create({
        data: {
            requestId,
            type: 'ASSIGNED',
            description: `Assigned to ${assigneeName}`,
            actorId: adminId
        }
    });

    return updated;
}
