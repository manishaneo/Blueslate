import prisma from "../prismaClient.js";
import { AppError } from "../middleware/AppError.js";
import { resolveActiveBusiness } from "../utils/resolveActiveBusiness.js";

// Helper to format date string to local "YYYY-MM-DD"
function localDateKey(d) {
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getAnalyticsDashboard(userId, activeBusinessId, { startDate, endDate } = {}) {
    const businessId = await resolveActiveBusiness(userId, activeBusinessId);
    if (!businessId) throw new AppError("No business found for this account.", 404);

    const now = new Date();
    
    // Resolve date bounds
    const dateQuery = {};
    if (startDate) dateQuery.gte = new Date(startDate);
    if (endDate) dateQuery.lte = new Date(endDate);

    const hasDateFilter = Object.keys(dateQuery).length > 0;

    // Get Phase-1 Contexts for Leads
    const contexts = await prisma.businessContext.findMany({
        where: { businessId },
        select: { id: true }
    });
    const contextIds = contexts.map((c) => c.id);

    const leadWhere = contextIds.length > 0 ? { businessContextId: { in: contextIds } } : { id: -1 }; // id: -1 effectively returns none if no context

    // Filter queries
    const leadWhereFiltered = { ...leadWhere, ...(hasDateFilter ? { createdAt: dateQuery } : {}) };
    const convWhereFiltered = { businessId, ...(hasDateFilter ? { createdAt: dateQuery } : {}) };
    const reqWhereFiltered = { businessId, ...(hasDateFilter ? { createdAt: dateQuery } : {}) };
    const meetingWhereFiltered = { businessId, ...(hasDateFilter ? { scheduledAt: dateQuery } : {}) };

    // Run parallel queries to fetch aggregated metrics and trends
    // We fetch raw records for some arrays (like leads and requests) so we can group them easily.
    const [
        totalLeadsAllTime,
        leads,
        conversations,
        requests,
        meetings,
        recentFeedback
    ] = await Promise.all([
        prisma.lead.count({ where: leadWhere }),
        prisma.lead.findMany({
            where: leadWhereFiltered,
            select: { id: true, status: true, createdAt: true, source: true }
        }),
        prisma.conversation.findMany({
            where: convWhereFiltered,
            select: { id: true, source: true, createdAt: true, metadata: true, transcript: true }
        }),
        prisma.customerRequest.findMany({
            where: reqWhereFiltered,
            select: { id: true, requestType: true, status: true, priority: true, createdAt: true }
        }),
        prisma.scheduledMeeting.findMany({
            where: meetingWhereFiltered,
            select: { id: true, status: true, scheduledAt: true }
        }),
        // Fetch feedback related to these conversations or requests
        prisma.customerFeedback.findMany({
            where: {
                OR: [
                    { conversation: { businessId, ...(hasDateFilter ? { createdAt: dateQuery } : {}) } },
                    { request: { businessId, ...(hasDateFilter ? { createdAt: dateQuery } : {}) } }
                ]
            },
            select: { rating: true, resolvedStatus: true, wantsHumanContact: true, createdAt: true }
        })
    ]);

    // Calculate Leads Metrics
    let newLeads = 0;
    let contactedLeads = 0;
    let convertedLeads = 0;
    const leadsByDate = {};
    leads.forEach(l => {
        if (l.status === 'NEW') newLeads++;
        if (l.status === 'CONTACTED') contactedLeads++;
        if (l.status === 'CONVERTED') convertedLeads++;
        
        const dk = localDateKey(l.createdAt);
        if (dk) leadsByDate[dk] = (leadsByDate[dk] || 0) + 1;
    });

    // Calculate Conversations Metrics
    let aiResolvedConvs = 0;
    let escalatedConvs = 0;
    let totalMessages = 0;
    const convsByDate = {};
    const peakHours = {};

    conversations.forEach(c => {
        const isEscalated = c.metadata?.outcome === 'ESCALATED';
        if (isEscalated) escalatedConvs++;
        else aiResolvedConvs++;

        const msgCount = Array.isArray(c.transcript) ? c.transcript.length : 0;
        totalMessages += msgCount;

        const dk = localDateKey(c.createdAt);
        if (dk) convsByDate[dk] = (convsByDate[dk] || 0) + 1;

        if (c.createdAt) {
            const hr = c.createdAt.getHours();
            peakHours[hr] = (peakHours[hr] || 0) + 1;
        }
    });

    const averageMessagesPerConversation = conversations.length > 0 ? (totalMessages / conversations.length).toFixed(1) : 0;
    const aiResolutionRate = conversations.length > 0 ? ((aiResolvedConvs / conversations.length) * 100).toFixed(1) : 0;

    // Calculate Requests Metrics
    let complaints = 0;
    let escalations = 0;
    let callbackRequests = 0;
    let generalSupport = 0;
    let resolvedRequests = 0;
    let pendingRequests = 0;

    const requestTrend = {};

    requests.forEach(r => {
        if (r.requestType === 'COMPLAINT') complaints++;
        if (r.requestType === 'ESCALATION') escalations++;
        if (r.requestType === 'CALLBACK_REQUEST') callbackRequests++;
        if (r.requestType === 'GENERAL_SUPPORT') generalSupport++;

        if (r.status === 'RESOLVED') resolvedRequests++;
        else pendingRequests++;

        const dk = localDateKey(r.createdAt);
        if (dk) requestTrend[dk] = (requestTrend[dk] || 0) + 1;
    });

    // Calculate Meeting Metrics
    let meetingsScheduled = meetings.length;
    let meetingsCompleted = meetings.filter(m => m.status === 'COMPLETED').length;

    // Calculate Satisfaction Metrics
    let totalRatings = 0;
    let ratingSum = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let firstContactResolved = 0;

    recentFeedback.forEach(f => {
        if (f.rating) {
            ratingSum += f.rating;
            totalRatings++;
            if (ratingDistribution[f.rating] !== undefined) ratingDistribution[f.rating]++;
        }
        if (f.resolvedStatus) {
            firstContactResolved++;
        }
    });

    const averageRating = totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : 0;
    const fcrRate = totalRatings > 0 ? ((firstContactResolved / totalRatings) * 100).toFixed(1) : 0;

    // Build timeline events for the activity feed (merge recent records)
    // To keep performance high, just take top 100 of each and sort in memory
    const topLeads = [...leads].sort((a,b)=>b.createdAt - a.createdAt).slice(0, 30).map(l => ({ type: 'LEAD', title: 'New Lead Captured', date: l.createdAt }));
    const topReqs = [...requests].sort((a,b)=>b.createdAt - a.createdAt).slice(0, 30).map(r => ({ type: 'REQUEST', title: `New ${r.requestType}`, requestType: r.requestType, date: r.createdAt }));
    const topMeetings = [...meetings].sort((a,b)=>b.scheduledAt - a.createdAt).slice(0, 30).map(m => ({ type: 'MEETING', title: 'Meeting Scheduled', date: m.scheduledAt }));
    const topFeedbacks = [...recentFeedback].filter(f => f.rating).sort((a,b)=>b.createdAt - a.createdAt).slice(0,30).map(f => ({ type: 'RATING', title: `Customer rated ${f.rating}★`, rating: f.rating, date: f.createdAt }));
    
    let activityTimeline = [...topLeads, ...topReqs, ...topMeetings, ...topFeedbacks].sort((a, b) => b.date - a.date).slice(0, 50);

    return {
        // Raw Totals
        totalLeadsAllTime,
        totalLeadsPeriod: leads.length,
        newLeads,
        contactedLeads,
        convertedLeads,
        conversionRate: leads.length > 0 ? ((convertedLeads / leads.length) * 100).toFixed(1) : 0,

        totalConversations: conversations.length,
        aiResolvedConvs,
        escalatedConvs,
        aiResolutionRate,
        averageMessagesPerConversation,

        totalRequests: requests.length,
        complaints,
        escalations,
        callbackRequests,
        generalSupport,
        resolvedRequests,
        pendingRequests,

        meetingsScheduled,
        meetingsCompleted,

        averageRating,
        totalRatings,
        ratingDistribution,
        fcrRate,

        // Charts & Trends
        trends: {
            leads: Object.keys(leadsByDate).map(date => ({ date, count: leadsByDate[date] })).sort((a,b) => a.date.localeCompare(b.date)),
            conversations: Object.keys(convsByDate).map(date => ({ date, count: convsByDate[date] })).sort((a,b) => a.date.localeCompare(b.date)),
            requests: Object.keys(requestTrend).map(date => ({ date, count: requestTrend[date] })).sort((a,b) => a.date.localeCompare(b.date)),
            peakHours: Object.keys(peakHours).map(hour => ({ hour, count: peakHours[hour] }))
        },
        
        activityTimeline
    };
}
