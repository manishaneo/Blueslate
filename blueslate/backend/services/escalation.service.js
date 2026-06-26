/**
 * escalation.service.js
 */
import prisma from '../prismaClient.js';
import { calculatePriority } from './priority.engine.js';
import { generateNotification } from './notification.service.js';

export async function triggerEscalation(payload) {
    console.log("[ESCALATION PIPELINE] triggerEscalation called with payload:", JSON.stringify(payload, null, 2));
    const {
        businessId,
        leadId,
        conversationId,
        requestType,
        aiSummary,
        aiReason,
        suggestedAction,
        snapshotName,
        snapshotPhone,
        snapshotEmail,
        activities = []
    } = payload;

    if (!businessId || !requestType) {
        console.error("[ESCALATION PIPELINE] Missing businessId or requestType");
        throw new Error("businessId and requestType are required for escalation.");
    }

    try {
        // ── Duplicate Prevention ──────────────────────────────────────────────────
        // Only deduplicate if we have a context (leadId or conversationId)
        const conditions = [];
        if (leadId) conditions.push({ leadId });
        if (conversationId) conditions.push({ conversationId });

        let existingUnresolved = null;
        if (conditions.length > 0) {
            console.log(`[ESCALATION PIPELINE] Checking for duplicates with conditions:`, JSON.stringify(conditions));
            existingUnresolved = await prisma.customerRequest.findFirst({
                where: {
                    businessId,
                    requestType,
                    status: { not: "RESOLVED" },
                    OR: conditions
                }
            });
        } else {
            console.log("[ESCALATION PIPELINE] No leadId or conversationId provided; skipping deduplication.");
        }

        if (existingUnresolved) {
            console.log(`[ESCALATION PIPELINE] Duplicate request skipped. businessId: ${businessId}, requestType: ${requestType}, existingId: ${existingUnresolved.id}`);
            
            // Optionally add a timeline activity indicating another escalation happened
            if (activities.length > 0) {
                await prisma.requestActivity.createMany({
                    data: activities.map(act => ({
                        requestId: existingUnresolved.id,
                        type: act.type || "SYSTEM",
                        description: act.description,
                        actorId: null
                    }))
                });
                console.log(`[ESCALATION PIPELINE] Added ${activities.length} new activities to existing request ${existingUnresolved.id}`);
            } else {
                await prisma.requestActivity.create({
                    data: {
                        requestId: existingUnresolved.id,
                        type: "SYSTEM",
                        description: `Repeated escalation detected (${requestType})`,
                        actorId: null
                    }
                });
                console.log(`[ESCALATION PIPELINE] Added repeated escalation activity to existing request ${existingUnresolved.id}`);
            }
            
            return existingUnresolved;
        }

        console.log(`[ESCALATION PIPELINE] No duplicate found. Proceeding to create new request.`);

    // ── Create New Request ───────────────────────────────────────────────────
    const priority = calculatePriority(requestType, aiReason, aiSummary);

    const customerRequest = await prisma.customerRequest.create({
        data: {
            businessId,
            leadId,
            conversationId,
            requestType,
            status: "NEW",
            priority,
            aiSummary,
            aiReason,
            suggestedAction,
            snapshotName: !leadId ? snapshotName : null,
            snapshotPhone: !leadId ? snapshotPhone : null,
            snapshotEmail: !leadId ? snapshotEmail : null,
        }
    });

    console.log(`[ESCALATION] CustomerRequest created. id: ${customerRequest.id}, type: ${requestType}, priority: ${priority}`);

    // ── Create Timeline Activities ───────────────────────────────────────────
    let defaultDescription = `Request created via AI Escalation (${requestType})`;
    if (requestType === "NEW_LEAD") defaultDescription = "Lead Created";
    else if (requestType === "COMPLAINT") defaultDescription = "Complaint Logged";
    else if (requestType === "CALLBACK_REQUEST") defaultDescription = "Callback Requested";

    const actsToCreate = activities.length > 0 ? activities : [{ type: "CREATED", description: defaultDescription }];

    await prisma.requestActivity.createMany({
        data: actsToCreate.map(act => ({
            requestId: customerRequest.id,
            type: act.type || "CREATED",
            description: act.description,
            actorId: null
        }))
    });

    // ── Generate Notification ────────────────────────────────────────────────
    let notificationTitle = "New Request";
    if (requestType === "COMPLAINT") notificationTitle = "Customer Complaint";
    else if (requestType === "CALLBACK_REQUEST") notificationTitle = "Callback Requested";
    else if (requestType === "ESCALATION") notificationTitle = "AI Escalation";
    else if (requestType === "NEW_LEAD") notificationTitle = "New Lead Captured";

    await generateNotification({
        businessId,
        requestId: customerRequest.id,
        title: notificationTitle,
        description: aiSummary || aiReason || "A new customer request needs your attention.",
        notificationType: requestType,
        priority
    });
    
    console.log(`[ESCALATION] Notification generated for request ${customerRequest.id}`);
    
    return customerRequest;

    } catch (error) {
        console.error("[ESCALATION PIPELINE] Error inside triggerEscalation:", error.message);
        throw error;
    }
}
