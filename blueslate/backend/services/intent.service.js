const REQUIRES_HUMAN = new Set([
    "complaint", "support",
    "speak_to_human", "pricing_negotiation", "refund",
    "legal", "emergency", "partnership", "job_inquiry",
]);

// Each intent has:
//   phrases  — multi-word expressions (matched as substrings, weight 2 each)
//   keywords — single words         (matched as whole tokens,  weight 1 each)
const INTENTS = {
    pricing: {
        phrases: [
            "how much", "what does it cost", "price list", "fee structure",
            "payment plan", "monthly fee", "annual fee", "do you charge",
            "is it free", "any discount", "any offer", "what is the cost",
            "how much does", "how much is", "what are your fees",
        ],
        keywords: [
            "price", "prices", "pricing", "cost", "costs", "fee", "fees",
            "rate", "rates", "charge", "charges", "payment", "expensive",
            "cheap", "affordable", "discount", "discounts", "package",
            "packages", "plan", "plans", "subscription", "quote", "tariff",
            "pay", "paid", "billing",
        ],
    },

    admissions: {
        phrases: [
            "enroll my", "how to join", "how do i join", "how to enroll",
            "how to register", "want to join", "want to enroll", "new student",
            "my son", "my daughter", "my child", "my kid", "start classes",
            "begin classes", "getting started", "sign up", "how do i sign",
            "can i join", "can i enroll", "can i register",
        ],
        keywords: [
            "enroll", "enrollment", "register", "registration", "admission",
            "admissions", "apply", "application", "eligible", "eligibility",
            "join", "requirements", "prerequisite", "intake", "onboard",
            "onboarding",
        ],
    },

    trial_booking: {
        phrases: [
            "free trial", "free class", "free session", "book a trial",
            "book an appointment", "try it out", "come in", "drop in",
            "first class", "want to try", "can i visit", "schedule a visit",
            "book a class", "book a session", "make an appointment",
            "set up an appointment", "can i come", "i would like to try",
        ],
        keywords: [
            "trial", "book", "booking", "appointment", "demo", "schedule",
            "reserve", "reservation", "visit", "session", "slot", "tour",
            "walkthrough",
        ],
    },

    support: {
        phrases: [
            "not working", "having trouble", "need help", "having issues",
            "technical issue", "having a problem", "can't access",
            "cannot access", "forgot password", "reset password", "my account",
            "doesn't work", "is not working", "help me with",
        ],
        keywords: [
            "help", "issue", "problem", "trouble", "broken", "fix", "error",
            "technical", "account", "login", "password", "access", "unable",
            "assistance", "support", "bug", "glitch", "stuck",
        ],
    },

    complaint: {
        phrases: [
            "not happy", "very unhappy", "not satisfied", "not good",
            "very bad", "worst experience", "want a refund", "want to cancel",
            "wasted my", "complete waste", "very disappointed",
            "extremely disappointed", "this is unacceptable", "i am angry",
            "so frustrated", "really upset", "terrible service",
            "poor service", "bad service",
        ],
        keywords: [
            "unhappy", "dissatisfied", "disappointed", "complaint", "complain",
            "angry", "upset", "frustrated", "terrible", "awful", "horrible",
            "unacceptable", "rude", "refund", "cancel", "disgusting",
            "useless", "waste", "mistake", "incompetent", "ridiculous",
            "outrageous", "lied", "scam",
        ],
    },

    business_hours: {
        phrases: [
            "what time", "are you open", "are you closed", "opening hours",
            "closing time", "opening time", "how late", "how early",
            "when do you open", "when do you close", "do you open on",
            "open on weekends", "open on saturday", "open on sunday",
            "where are you", "where is your", "your address",
            "how to get there", "get directions", "how to find you",
            "what are your hours",
        ],
        keywords: [
            "hours", "open", "closed", "closing", "opening", "available",
            "availability", "location", "address", "directions", "weekend",
            "weekday", "monday", "tuesday", "wednesday", "thursday", "friday",
            "saturday", "sunday", "timing", "timings", "today", "tomorrow",
            "holiday",
        ],
    },

    speak_to_human: {
        phrases: [
            "talk to a person", "speak to a human", "real person", "human agent",
            "transfer me", "speak to someone", "talk to someone", "get a human",
            "speak to a representative", "real agent", "live agent", "human please",
            "speak to a real person", "connect me to a person", "talk to a real person",
        ],
        keywords: [
            "human", "person", "agent", "representative", "transfer",
            "escalate", "operator", "staff",
        ],
    },

    pricing_negotiation: {
        phrases: [
            "can you do better", "custom quote", "negotiate price", "special rate",
            "better deal", "can we negotiate", "lower the price", "reduce the price",
            "custom pricing", "special pricing", "bulk discount", "volume discount",
            "price match", "match the price", "best price you can do",
        ],
        keywords: [
            "negotiate", "negotiation", "flexibility", "flexible", "barter", "haggle",
        ],
    },

    refund: {
        phrases: [
            "want my money back", "get a refund", "request a refund", "charge back",
            "money back guarantee", "refund request", "return my money",
            "cancel my subscription", "cancel my membership",
        ],
        keywords: [
            "refund", "refunds", "reimbursement", "reimburse", "chargeback",
        ],
    },

    legal: {
        phrases: [
            "legal action", "take legal action", "contact my lawyer", "sue you",
            "contract dispute", "legal department", "file a complaint",
            "consumer protection", "small claims court", "breach of contract",
        ],
        keywords: [
            "legal", "lawyer", "attorney", "lawsuit", "litigation",
            "sue", "court", "violation",
        ],
    },

    emergency: {
        phrases: [
            "this is an emergency", "urgent help needed", "critical issue",
            "need help immediately", "as soon as possible", "safety concern",
            "life safety", "need help right now",
        ],
        keywords: [
            "emergency", "urgent", "critical", "immediate", "asap", "danger", "crisis",
        ],
    },

    partnership: {
        phrases: [
            "partner with you", "business proposal", "partnership opportunity",
            "collaborate with you", "joint venture", "work together",
            "business deal", "white label", "reseller program", "affiliate program",
        ],
        keywords: [
            "partner", "partnership", "collaborate", "collaboration",
            "affiliate", "reseller", "vendor", "supplier", "proposal",
        ],
    },

    job_inquiry: {
        phrases: [
            "apply for a job", "work for you", "job opening", "career opportunity",
            "hiring now", "send my resume", "send my cv", "job application",
            "open positions", "work with your team",
        ],
        keywords: [
            "job", "jobs", "career", "careers", "hiring",
            "employment", "vacancy", "position", "resume", "cv",
        ],
    },

    // Placed last so any business intent wins on equal score.
    small_talk: {
        phrases: [
            "good morning", "good afternoon", "good evening",
            "how are you", "how are you doing", "how is it going",
            "thank you", "appreciate it",
            "see you", "talk later",
        ],
        keywords: ["hi", "hello", "hey", "thanks", "bye", "goodbye"],
    },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function normalize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function scoreIntent(normalized, definition) {
    let score = 0;

    // Phrases match as substrings — weight 2
    for (const phrase of definition.phrases) {
        if (normalized.includes(phrase)) {
            score += 2;
        }
    }

    // Keywords match as whole tokens — weight 1
    const tokens = new Set(normalized.split(" "));
    for (const keyword of definition.keywords) {
        if (tokens.has(keyword)) {
            score += 1;
        }
    }

    return score;
}

// Converts a raw match score to a 0–1 confidence value.
// score 0 → 0.30 (general fallback)
// score 1 → 0.55, score 2 → 0.67, score 3 → 0.79, score 4+ → capped at 0.95
function scoreToConfidence(score) {
    if (score === 0) return 0.30;
    return parseFloat(Math.min(0.95, 0.43 + score * 0.13).toFixed(2));
}

// Sub-type lookup for small_talk. Checked in priority order so "farewell"
// and "thanks" are resolved before falling through to the "greeting" default.
const SMALL_TALK_SUBTYPES = {
    farewell:  ["bye", "goodbye", "see you", "talk later"],
    thanks:    ["thank you", "thanks", "appreciate it"],
    wellbeing: ["how are you", "how are you doing", "how is it going"],
    greeting:  ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
};

function detectSmallTalkSubtype(normalized) {
    for (const [subtype, phrases] of Object.entries(SMALL_TALK_SUBTYPES)) {
        if (phrases.some((p) => normalized.includes(p))) return subtype;
    }
    return "greeting";
}

const SMALL_TALK_RESPONSES = {
    greeting:  (name, persona) => name
        ? `Thank you for calling ${name}! This is ${persona}, your AI receptionist. How can I help you today?`
        : `Thank you for calling! This is ${persona}, your AI receptionist. How can I help you today?`,
    wellbeing: (name, persona) => name
        ? `I'm doing great, thank you for asking! I'm ${persona}, your AI receptionist for ${name}. What can I help you with today?`
        : `I'm doing great, thank you for asking! I'm ${persona}, your AI receptionist. What can I help you with today?`,
    thanks:    ()              => "Of course! Is there anything else I can help you with today?",
    farewell:  ()              => "Thank you for calling. It was a pleasure helping you — have a wonderful day!",
};

// ── public API ───────────────────────────────────────────────────────────────

export const detectIntent = (message) => {
    if (!message || typeof message !== "string" || !message.trim()) {
        throw new Error("message must be a non-empty string");
    }

    const normalized = normalize(message);

    let bestIntent = "general";
    let bestScore  = 0;

    for (const [intent, definition] of Object.entries(INTENTS)) {
        const score = scoreIntent(normalized, definition);
        if (score > bestScore) {
            bestScore  = score;
            bestIntent = intent;
        }
    }

    return {
        intent:        bestIntent,
        confidence:    scoreToConfidence(bestScore),
        requiresHuman: REQUIRES_HUMAN.has(bestIntent),
        ...(bestIntent === "small_talk" && { subtype: detectSmallTalkSubtype(normalized) }),
    };
};

export const getSmallTalkResponse = (intentData, businessName, personaName = null) => {
    const fn = SMALL_TALK_RESPONSES[intentData.subtype] ?? SMALL_TALK_RESPONSES.greeting;
    return fn(businessName || null, personaName || "Auri");
};
