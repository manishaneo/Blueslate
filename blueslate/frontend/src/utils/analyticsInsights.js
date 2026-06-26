// Deterministic rule-based insights generation

export function generateInsights(data) {
    if (!data || data.totalConversations === 0) {
        return ["More insights will appear as customer interactions increase."];
    }

    const insights = [];

    // Sales Performance
    if (data.conversionRate > 20) {
        insights.push(`Strong conversion rate at ${data.conversionRate}%. Lead quality is high.`);
    } else if (data.conversionRate > 0 && data.conversionRate < 5) {
        insights.push(`Conversion rate is low (${data.conversionRate}%). Consider reviewing your follow-up process.`);
    }

    if (data.newLeads > 10) {
        insights.push(`High lead volume! You've captured ${data.newLeads} new leads in this period.`);
    }

    // Customer Support
    const complaintRatio = data.totalRequests > 0 ? (data.complaints / data.totalRequests) : 0;
    if (complaintRatio > 0.2) {
        insights.push(`Attention: Complaints make up ${(complaintRatio * 100).toFixed(0)}% of your support requests.`);
    }

    if (data.escalatedConvs > 0) {
        const escRate = ((data.escalatedConvs / data.totalConversations) * 100).toFixed(0);
        if (escRate > 15) {
            insights.push(`Escalation rate is ${escRate}%. Consider adding more FAQs to your Knowledge Base to help AI resolve more queries.`);
        }
    }

    // Satisfaction
    if (data.totalRatings > 5 && parseFloat(data.averageRating) >= 4.5) {
        insights.push(`Excellent customer satisfaction! Your average rating is ${data.averageRating}★.`);
    } else if (data.totalRatings > 5 && parseFloat(data.averageRating) < 3) {
        insights.push(`Customer satisfaction has dropped to ${data.averageRating}★. Review recent feedback to identify issues.`);
    }

    if (data.pendingRequests > 5) {
        insights.push(`You have ${data.pendingRequests} pending requests waiting for your attention.`);
    }

    if (insights.length === 0) {
        insights.push("Your business metrics are stable and performing within normal ranges.");
    }

    return insights;
}

export function generateRecommendations(data) {
    if (!data || data.totalConversations === 0) {
        return [];
    }

    const recs = [];

    if (data.pendingRequests > 0) {
        recs.push({
            id: 'pending-req',
            priority: data.pendingRequests > 5 ? 'High' : 'Medium',
            text: `Follow up with ${data.pendingRequests} pending customer requests.`
        });
    }

    if (data.complaints > 0) {
        recs.push({
            id: 'complaints',
            priority: 'High',
            text: `Investigate ${data.complaints} recent complaints to prevent churn.`
        });
    }

    const escRate = data.totalConversations > 0 ? (data.escalatedConvs / data.totalConversations) : 0;
    if (escRate > 0.1) {
        recs.push({
            id: 'kb-update',
            priority: 'Medium',
            text: `Update Knowledge Base. ${data.escalatedConvs} conversations were escalated from the AI.`
        });
    }

    if (data.meetingsScheduled > data.meetingsCompleted) {
        recs.push({
            id: 'meetings',
            priority: 'Medium',
            text: `Prepare for ${data.meetingsScheduled - data.meetingsCompleted} upcoming scheduled meetings.`
        });
    }
    
    if (data.contactedLeads === 0 && data.newLeads > 0) {
        recs.push({
            id: 'new-leads',
            priority: 'High',
            text: `You have ${data.newLeads} new leads waiting to be contacted.`
        });
    }

    // Sort High > Medium > Low
    const pScore = { High: 3, Medium: 2, Low: 1 };
    return recs.sort((a, b) => pScore[b.priority] - pScore[a.priority]);
}

export function calculateBusinessHealth(data) {
    if (!data) return 0;
    
    let score = 100;
    
    // Penalize for high escalation rate (max penalty -20)
    const escRate = data.totalConversations > 0 ? (data.escalatedConvs / data.totalConversations) : 0;
    score -= Math.min(20, escRate * 100);

    // Penalize for poor ratings (max penalty -30)
    if (data.totalRatings > 0) {
        const ratingNum = parseFloat(data.averageRating);
        if (ratingNum < 4.0) {
            score -= (4.0 - ratingNum) * 15; // e.g. 3.0 rating = -15
        }
    }

    // Penalize for unresolved complaints (max -15)
    if (data.complaints > 0 && data.resolvedRequests < data.totalRequests) {
        const unresolvedRatio = (data.pendingRequests / data.totalRequests);
        score -= unresolvedRatio * 15;
    }

    // Penalize for high pending requests
    if (data.pendingRequests > 10) score -= 10;
    else if (data.pendingRequests > 5) score -= 5;

    // Bonus for high conversion (+5)
    if (parseFloat(data.conversionRate) > 15) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
}
