/**
 * priority.engine.js
 * 
 * Determines the priority of a customer request based on its intent,
 * reason, or type.
 */

export const PRIORITY_LEVELS = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
};

/**
 * Calculates priority based on text content (reason, summary, transcript snippets).
 * @param {string} requestType - type of the request
 * @param {string} reason - AI reasoning
 * @param {string} summary - AI summary
 * @returns {string} Priority level
 */
export function calculatePriority(requestType, reason = "", summary = "") {
    const combinedText = `${reason} ${summary}`.toLowerCase();

    if (
        combinedText.includes("sue") ||
        combinedText.includes("lawyer") ||
        combinedText.includes("legal action") ||
        combinedText.includes("attorney") ||
        combinedText.includes("police") ||
        combinedText.includes("emergency")
    ) {
        return PRIORITY_LEVELS.CRITICAL;
    }

    if (
        requestType === "COMPLAINT" ||
        combinedText.includes("unhappy") ||
        combinedText.includes("terrible") ||
        combinedText.includes("manager") ||
        combinedText.includes("supervisor") ||
        combinedText.includes("angry") ||
        combinedText.includes("refund")
    ) {
        return PRIORITY_LEVELS.HIGH;
    }

    if (requestType === "CALLBACK_REQUEST" || requestType === "ESCALATION") {
        return PRIORITY_LEVELS.MEDIUM;
    }

    if (requestType === "GENERAL") {
        return PRIORITY_LEVELS.LOW;
    }

    return PRIORITY_LEVELS.MEDIUM;
}
