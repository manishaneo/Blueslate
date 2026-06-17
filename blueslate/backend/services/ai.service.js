const STOP_WORDS = new Set([
    // question words
    "what", "when", "where", "who", "why", "which", "how",
    // articles / prepositions
    "the", "a", "an", "of", "in", "on", "for", "to", "at", "by",
    "from", "with", "about", "as", "into", "through", "during",
    // conjunctions
    "and", "or", "but", "if", "so", "then", "because",
    // pronouns
    "i", "we", "you", "he", "she", "it", "they",
    "my", "our", "your", "his", "her", "its", "their",
    "this", "that", "these", "those",
    // auxiliary verbs
    "is", "are", "was", "were", "be", "been", "being",
    "do", "does", "did", "have", "has", "had",
    "will", "would", "could", "can", "should", "may", "might",
    // filler
    "not", "no", "more", "also", "than", "there", "here",
    "get", "use", "make", "know", "like", "just", "even", "only", "other",
    "tell", "me", "give", "some", "any", "all", "each",
]);

const MIN_PARAGRAPH_WORDS = 10;
const TOP_N = 3;
const MAX_ANSWER_WORDS = 300;
const JACCARD_THRESHOLD = 0.5;
const MAX_KEYWORDS = 10;

// Generic signals that a paragraph is blog/news/editorial content.
const NOISE_TERMS = new Set([
    // content-type labels
    "blog", "article", "post", "news", "archive", "archives",
    "category", "categories", "tag", "tags", "author", "byline", "editorial",
    // instructional content
    "introduction", "guide", "tips", "tutorial", "overview",
    "walkthrough", "primer", "beginners", "explained",
    // reader-engagement / metadata
    "comment", "comments", "subscribe", "newsletter",
    "podcast", "episode", "share", "follow",
]);

const NOISE_PHRASES = [
    "read more", "click here", "learn more", "see also",
    "related posts", "related articles", "continue reading",
    "in this article", "in this guide", "in this post",
    "table of contents", "written by", "posted by", "filed under",
    "in conclusion", "to summarize", "as we discussed",
    // legal-content indicators — trigger existing 0.1× noise penalty
    "terms and conditions", "privacy policy", "cookie policy",
    "all rights reserved", "by registering you agree",
    "by using this website", "you acknowledge that", "accept these terms",
];

// Month name followed by a day number — strong indicator of a blog publish date.
const NOISE_DATE_RE =
    /\b(?:january|february|march|april|june|july|august|september|october|november|december)\s+\d{1,2}|\b(?:posted|published|updated)\s+(?:on|at)?\s/i;

// Generic signals that a paragraph is core business information.
const BUSINESS_TERMS = new Set([
    // pricing & plans
    "price", "pricing", "cost", "fee", "fees", "rate", "rates",
    "plan", "plans", "package", "packages", "subscription",
    "quote", "discount", "offer", "trial",
    // services & offerings
    "service", "services", "offering", "offerings",
    "program", "programs", "session", "sessions",
    "class", "classes", "course", "courses",
    "appointment", "consultation",
    // contact & location
    "contact", "phone", "email", "address", "location", "directions",
    // hours
    "hours", "open", "closed",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    // booking & enrollment
    "book", "booking", "schedule", "enroll", "register",
    "signup", "apply", "join", "reserve", "reservation",
    // informational business pages
    "faq", "about",
    "mission", "team", "staff", "certified", "licensed",
]);

// Structural label patterns that strongly indicate factual business content
// e.g. "Phone:", "Hours:", "Price:", "Address:"
const BUSINESS_STRUCT_RE =
    /\b(?:phone|email|address|hours?|price|fee|cost|fax|open|closed|location)\s*:/i;

// Maps common indirect-question words to the business vocabulary likely found
// in content. Enables "Can my 10 year old join?" to surface age-eligibility
// paragraphs that never use the word "old" or "year".
const SYNONYM_MAP = {
    // age / eligibility
    "old":      ["age", "ages", "youth", "children", "kid", "requirement"],
    "young":    ["age", "ages", "youth", "children"],
    "kid":      ["age", "ages", "youth", "children", "program"],
    "child":    ["age", "ages", "youth", "children", "program"],
    "teen":     ["age", "ages", "youth"],
    "year":     ["age", "ages"],
    "adult":    ["age", "ages", "requirement"],
    "age":      ["youth", "children", "requirement", "eligibility"],
    // cost / payment
    "much":     ["price", "pricing", "cost", "fee", "rate"],
    "cheap":    ["price", "pricing", "cost", "discount"],
    "afford":   ["price", "pricing", "cost", "payment", "plan"],
    "pay":      ["price", "pricing", "cost", "fee"],
    "free":     ["price", "pricing", "cost", "trial", "discount"],
    "money":    ["price", "pricing", "cost", "fee"],
    // joining / booking
    "join":     ["enroll", "register", "membership", "signup"],
    "sign":     ["register", "signup", "enroll"],
    "start":    ["enroll", "register", "booking", "schedule"],
    "try":      ["trial", "session", "appointment"],
    "attend":   ["schedule", "session", "class", "program"],
    "begin":    ["enroll", "register", "schedule"],
    // location / contact
    "find":     ["location", "address", "directions", "contact"],
    "near":     ["location", "address", "directions"],
    "call":     ["phone", "contact"],
    "reach":    ["contact", "phone", "email"],
    // hours / availability
    "visit":    ["hours", "location", "address", "schedule"],
    "come":     ["hours", "location", "address"],
    // services
    "offer":    ["service", "services", "program", "class"],
    "provide":  ["service", "services", "program"],
    "help":     ["service", "services", "consultation"],
};

// Lightweight suffix-stripping stemmer — collapses common inflections so
// "pricing" matches "price", "services" matches "service", etc.
function stem(word) {
    if (word.length <= 4) return word;

    const rules = [
        ["tions", ""],
        ["tion",  ""],
        ["sion",  ""],
        ["ness",  ""],
        ["ment",  ""],
        ["ful",   ""],
        ["ing",   ""],
        ["ied",   "y"],
        ["ies",   "y"],
        ["ed",    ""],
        ["er",    ""],
        ["ly",    ""],
    ];

    for (const [suffix, replacement] of rules) {
        if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
            return word.slice(0, -suffix.length) + replacement;
        }
    }
    // "es" handling: only strip both chars when the base is ≥ 4 chars AND doesn't end
    // in a vowel. This keeps game/games, league/leagues on the same stem instead of
    // producing mismatched "gam" and "leagu".
    if (word.endsWith("es") && word.length - 2 >= 4) {
        const base = word.slice(0, -2);
        if (!/[aeiou]$/.test(base)) return base;
    }
    if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) {
        return word.slice(0, -1);
    }
    return word;
}

function tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
}

// Returns a relevance score for one paragraph against the stemmed keyword list.
// Rewards matching more distinct keywords and repeated hits; normalised by
// how many keywords were asked so scores are comparable across questions.
function scoreParagraph(paragraph, stemmedKeywords) {
    const stemmedTokens = tokenize(paragraph).map(stem);

    let matchedKeywords = 0;
    let totalHits = 0;

    for (const kw of stemmedKeywords) {
        const hits = stemmedTokens.filter((t) => t === kw).length;
        if (hits > 0) {
            matchedKeywords++;
            totalHits += hits;
        }
    }

    if (matchedKeywords === 0) return 0;

    // log(totalHits + 1) gives diminishing returns for repeated matches
    let score = (matchedKeywords * (1 + Math.log(totalHits + 1))) / stemmedKeywords.length;

    const lower = paragraph.toLowerCase();
    const tokenSet = new Set(tokenize(lower));

    const isNoisy =
        [...NOISE_TERMS].some((t) => tokenSet.has(t)) ||
        NOISE_PHRASES.some((p) => lower.includes(p)) ||
        NOISE_DATE_RE.test(paragraph);
    if (isNoisy) score *= 0.1;

    const isBusiness =
        [...BUSINESS_TERMS].some((t) => tokenSet.has(t)) ||
        BUSINESS_STRUCT_RE.test(paragraph);
    if (isBusiness) score *= 1.5;

    return score;
}

// Proportion of shared words between two paragraphs (0 = nothing in common, 1 = identical).
function jaccardSimilarity(a, b) {
    const setA = new Set(tokenize(a));
    const setB = new Set(tokenize(b));
    let intersection = 0;
    for (const w of setA) {
        if (setB.has(w)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function truncateToWords(text, maxWords) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
}

function formatParagraph(p) {
    p = p.trim();
    p = p.charAt(0).toUpperCase() + p.slice(1);
    if (!/[.!?]$/.test(p)) p += ".";
    return p;
}

// Split a paragraph into individual sentences on . ! ?
function splitSentences(text) {
    const raw = text.match(/[^.!?]+[.!?]+(?=\s|$)/g);
    if (!raw || raw.length === 0) return [text];
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

// Count how many stemmed question keywords appear in a sentence
function scoreSentence(sentence, stemmedKeywords) {
    const tokens = new Set(tokenize(sentence).map(stem));
    return stemmedKeywords.filter((kw) => tokens.has(kw)).length;
}

// True for sentences that look like blog metadata, breadcrumbs, or title fragments
function isNoiseSentence(sentence) {
    if (/[|»›·—–]/.test(sentence)) return true;
    if (tokenize(sentence).length < 4) return true;
    if (/^(?:read more|share|tags?|categor|author|posted|filed|related|see also|click here|learn more|subscribe|follow us)/i.test(sentence)) return true;
    return false;
}

export const askGemini = async (businessContent, question) => {
    // 1. Split into paragraphs; discard short fragments and exact duplicates.
    //    Pre-process: merge Q:/A: FAQ pairs into one paragraph so the question
    //    keywords are scored alongside the answer (Q lines alone are too short
    //    to pass the word-count filter and would otherwise be dropped).
    const preprocessed = businessContent.replace(/^(Q:[^\n]+)\n+(A:[^\n]+)/gm, "$1 $2");

    const paragraphs = [
        ...new Set(
            preprocessed
                .split(/\n+/)
                .map((p) => p.trim())
                .filter((p) => tokenize(p).length >= MIN_PARAGRAPH_WORDS || /^[A-Z][A-Za-z ]*:/.test(p))
        ),
    ];

    if (paragraphs.length === 0) {
        return "I don't have that information available.";
    }

    // 2. Build stemmed keyword list.
    //    a) Original tokens: stop-word filtered, stemmed, deduplicated.
    //    b) Expanded synonyms: stop-word filtered, stemmed, deduplicated,
    //       excluding any stem already in the originals.
    //    c) Capped at MAX_KEYWORDS total; originals always have priority.
    const rawTokens = tokenize(question).filter((w) => !STOP_WORDS.has(w));

    const originalStems = [...new Set(rawTokens.map(stem))];

    const originalSet   = new Set(originalStems);
    const expandedSeen  = new Set();
    const expandedStems = [];
    for (const token of rawTokens) {
        const synonyms = SYNONYM_MAP[token];
        if (!synonyms) continue;
        for (const syn of synonyms) {
            if (STOP_WORDS.has(syn)) continue;                        // stop-word guard
            const s = stem(syn);
            if (originalSet.has(s) || expandedSeen.has(s)) continue; // dedup
            expandedSeen.add(s);
            expandedStems.push(s);
        }
    }

    const slotsForExpanded = Math.max(0, MAX_KEYWORDS - originalStems.length);
    const stemmedKeywords  = [
        ...originalStems,
        ...expandedStems.slice(0, slotsForExpanded),
    ];

    if (stemmedKeywords.length === 0) {
        return "I don't have that information available.";
    }

    // 3. Score every paragraph and keep only those with at least one match
    const scored = paragraphs
        .map((paragraph) => ({
            paragraph,
            score: scoreParagraph(paragraph, stemmedKeywords),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
        return "I don't have that information available.";
    }

    // 4. Require a meaningful match: top paragraph must reach at least 20 % of
    //    what a paragraph matching every keyword once would score.
    const perfectScore =
        (stemmedKeywords.length * (1 + Math.log(stemmedKeywords.length + 1))) /
        stemmedKeywords.length;

    if (scored[0].score < perfectScore * 0.2) {
        return "I don't have that information available.";
    }

    // 5. Pick up to TOP_N paragraphs, skipping near-duplicates
    const selected = [];
    for (const item of scored) {
        if (selected.length >= TOP_N) break;
        const isDuplicate = selected.some(
            (s) => jaccardSimilarity(s.paragraph, item.paragraph) > JACCARD_THRESHOLD
        );
        if (!isDuplicate) selected.push(item);
    }

    // 6. Extract the most relevant sentences from the selected paragraphs.
    //    Scores each sentence individually against the question keywords,
    //    filters noise, deduplicates, and returns at most 3 sentences.
    const allSentences = [];
    for (const item of selected) {
        for (const sentence of splitSentences(item.paragraph)) {
            if (isNoiseSentence(sentence)) continue;
            allSentences.push({ sentence, score: scoreSentence(sentence, stemmedKeywords) });
        }
    }

    if (allSentences.length === 0) {
        return truncateToWords(formatParagraph(selected[0].paragraph), MAX_ANSWER_WORDS);
    }

    allSentences.sort((a, b) => b.score - a.score);

    const finalSentences = [];
    for (const item of allSentences) {
        if (finalSentences.length >= 3) break;
        const isDup = finalSentences.some(
            (s) => jaccardSimilarity(s, item.sentence) > JACCARD_THRESHOLD
        );
        if (!isDup) finalSentences.push(item.sentence);
    }

    const answer = finalSentences.map(formatParagraph).join(" ");
    return truncateToWords(answer, MAX_ANSWER_WORDS);
};
