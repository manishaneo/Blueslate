/**
 * internalNote.service.js
 */
import prisma from '../prismaClient.js';

export async function addNote(requestId, businessId, authorId, content) {
    const request = await prisma.customerRequest.findFirst({
        where: { id: requestId, businessId }
    });

    if (!request) throw new Error("Request not found");

    const note = await prisma.internalNote.create({
        data: {
            requestId,
            authorId,
            content
        }
    });

    const author = await prisma.user.findUnique({ where: { id: authorId } });
    await prisma.requestActivity.create({
        data: {
            requestId,
            type: 'NOTE_ADDED',
            description: `Internal note added by ${author?.name || 'Admin'}`,
            actorId: authorId
        }
    });

    return note;
}

export async function getNotes(requestId, businessId) {
    const request = await prisma.customerRequest.findFirst({
        where: { id: requestId, businessId }
    });

    if (!request) throw new Error("Request not found");

    return prisma.internalNote.findMany({
        where: { requestId },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
    });
}
