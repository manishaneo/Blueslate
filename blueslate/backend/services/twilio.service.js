import prisma from "../prismaClient.js";

/**
 * Persists a new inbound call record the moment Twilio fires the voice webhook.
 * The record is intentionally minimal at this point — status and duration arrive
 * later via the status callback.
 */
export async function createCallRecord({ callSid, from, to }) {
    return prisma.call.create({
        data: {
            callSid,
            from,
            to,
            status:    "initiated",
            direction: "inbound",
            startedAt: new Date(),
        },
    });
}

/**
 * Updates an existing call record when Twilio fires the status callback.
 * All fields are optional — pass only what changed.
 */
export async function updateCallRecord(callSid, { status, duration, endedAt, recordingUrl } = {}) {
    return prisma.call.update({
        where: { callSid },
        data: {
            ...(status                              && { status }),
            ...(duration != null                   && { duration: Number(duration) }),
            ...(endedAt                            && { endedAt }),
            ...(recordingUrl                       && { recordingUrl }),
        },
    });
}

/**
 * Retrieves paginated call history, newest first.
 * Ready for use by a dashboard or analytics endpoint in a later phase.
 */
export async function getCallHistory({ page = 1, pageSize = 20 } = {}) {
    const skip = (page - 1) * pageSize;
    const [calls, total] = await Promise.all([
        prisma.call.findMany({
            orderBy: { startedAt: "desc" },
            skip,
            take: pageSize,
        }),
        prisma.call.count(),
    ]);
    return { calls, total, page, pageSize };
}
