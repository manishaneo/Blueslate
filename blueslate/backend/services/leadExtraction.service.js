// ── Speech-recognition normalization ─────────────────────────────────────────
// Voice transcripts never contain @ or . the way typed text does.
// Normalize spoken email / phone patterns before running regexes.

function normalizeSpeech(text) {
    let s = text;

    // Email: "abc at the rate gmail dot com" → "abc@gmail.com"
    s = s.replace(/\bat\s+the\s+rate\b/gi, "@");
    s = s.replace(/\bat\s+rate\b/gi,       "@");
    s = s.replace(/\bat\s+sign\b/gi,       "@");
    s = s.replace(/\s*@\s*/g, "@");

    // Normalize dots in the domain portion only (everything after the last @)
    const atIdx = s.lastIndexOf("@");
    if (atIdx !== -1) {
        const before = s.slice(0, atIdx + 1);
        const after  = s.slice(atIdx + 1)
            .replace(/\s+dot\s+/gi, ".")
            .replace(/\s+\.\s+/g,   ".")
            .replace(/\s+\./g,      ".")
            .replace(/\.\s+/g,      ".");
        s = before + after;
    }

    // Phone: spoken digit-word sequences → digit string
    // "nine eight seven..." → "987..."
    const DIGIT_WORDS = {
        zero: "0", one: "1", two: "2", three: "3", four: "4",
        five: "5", six: "6", seven: "7", eight: "8", nine: "9",
    };
    s = s.replace(
        /\b(zero|one|two|three|four|five|six|seven|eight|nine)(\s+(zero|one|two|three|four|five|six|seven|eight|nine))+\b/gi,
        (match) => match.toLowerCase().split(/\s+/).map((w) => DIGIT_WORDS[w] ?? w).join("")
    );

    return s;
}

// ── Context-aware phone extraction ────────────────────────────────────────────
// Speech-to-text breaks phone numbers into arbitrary groupings:
//   "7205 672015", "720 567 2015", "72 05 67 20 15", etc.
// Standard N-N-N-NNNN regexes only match US-style groupings and miss these.
//
// Strategy:
//   1. Detect a phone-context trigger phrase ("phone number is", etc.)
//   2. Capture the digit/space/punctuation sequence that follows
//   3. Strip all non-digit characters → raw digit string
//   4. If digit count matches a known valid length, accept as phone number

// Phrases that introduce a phone number in spoken language
const PHONE_TRIGGERS = [
    // "my phone number is ...", "mobile number is ...", "contact number is ..."
    /(?:my\s+)?(?:phone|mobile|cell(?:phone)?|contact|whatsapp)\s+(?:number|num|no\.?)\s+(?:is\s+)?([\d\s+\-\.\(\)]+)/i,
    // "my number is ..."
    /(?:my\s+)?number\s+is\s+([\d\s+\-\.\(\)]+)/i,
    // "reach me at / call me on / contact me at ..."
    /(?:call|reach|contact|text|ping)\s+(?:me\s+)?(?:at|on)\s+([\d\s+\-\.\(\)]+)/i,
];

function validateAndNormalizePhone(candidate) {
    // Strip everything except digits and a possible leading +
    const stripped = candidate.trim().replace(/[^\d+]/g, "");
    console.log("[portal-debug] normalized digits:", stripped);

    if (!stripped) return null;

    // International notation: +CC followed by digits
    if (stripped.startsWith("+")) {
        // Accept +CC + exactly 10 digits (covers +91 India, +1 US, etc.)
        const intl = stripped.match(/^(\+\d{1,3})(\d{10})$/);
        if (intl) {
            console.log("[portal-debug] accepted phone (international):", stripped);
            return stripped;
        }
        return null;
    }

    const digits = stripped;

    // Exactly 10 digits → Indian mobile number or US 10-digit local
    if (digits.length === 10) {
        console.log("[portal-debug] accepted phone (10-digit):", digits);
        return digits;
    }

    // 11 digits starting with 1 → US with country code (1AAANNNNNNN)
    if (digits.length === 11 && digits.startsWith("1")) {
        const phone = "+" + digits;
        console.log("[portal-debug] accepted phone (US 11-digit):", phone);
        return phone;
    }

    // 12 digits starting with 91 → India with country code (917XXXXXXXXX)
    if (digits.length === 12 && digits.startsWith("91")) {
        const phone = "+" + digits;
        console.log("[portal-debug] accepted phone (IN 12-digit):", phone);
        return phone;
    }

    return null;
}

function extractPhoneFromContext(text) {
    for (const pattern of PHONE_TRIGGERS) {
        const match = text.match(pattern);
        if (!match) continue;

        const candidate = match[1];
        console.log("[portal-debug] phone candidate:", JSON.stringify(candidate));

        const phone = validateAndNormalizePhone(candidate);
        if (phone) return phone;
    }
    return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export const extractLeadData = (message) => {
    const normalized = normalizeSpeech(message);
    console.log("[portal-debug] extractLeadData | raw:", JSON.stringify(message));
    console.log("[portal-debug] extractLeadData | normalized:", JSON.stringify(normalized));

    // Email
    const emailMatch = normalized.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    // Phone: context-aware extraction first (handles speech groupings),
    // then fall back to the standard typed-format regex.
    let phone = extractPhoneFromContext(normalized);
    if (!phone) {
        const phoneMatch = normalized.match(/(\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/);
        phone = phoneMatch ? phoneMatch[0].trim() : null;
    }

    // Name
    const nameMatch = normalized.match(/(?:my name is|i am|i'm)\s+([a-z]+)/i);
    const name = nameMatch
        ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase()
        : null;

    console.log("[portal-debug] extractLeadData | result:", JSON.stringify({ name, email, phone }));

    return {
        name,
        email,
        phone,
        interest: message,
    };
};
