import Groq from "groq-sdk";

const MODEL = "llama-3.1-8b-instant";

// Lazy — dotenv.config() in server.js runs after ESM imports are hoisted,
// so we must not read process.env at module evaluation time.
let _client = null;
function getClient() {
    if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    return _client;
}

const TONE_STYLES = {
    professional: "clear, professional, and informative",
    friendly:     "warm, friendly, and conversational",
    formal:       "formal, precise, and respectful",
};

const LANGUAGE_NAMES = {
    es: "Spanish", fr: "French",  de: "German",   pt: "Portuguese",
    ar: "Arabic",  zh: "Chinese", hi: "Hindi",    ja: "Japanese",
    ko: "Korean",  it: "Italian", ru: "Russian",  nl: "Dutch",
};

function buildSystemPrompt(businessName, settings = {}) {
    const { aiPersonaName, tone, language, greeting } = settings;
    const name = aiPersonaName || "Auri";
    const identity = businessName
        ? `${name}, the AI receptionist for ${businessName}`
        : `${name}, an AI receptionist`;

    const toneStyle = TONE_STYLES[tone] ?? "warm, natural, conversational";
    const langCode  = language && language !== "en" ? language : null;
    const langName  = langCode ? (LANGUAGE_NAMES[langCode] ?? langCode) : null;
    const langLine  = langName ? ` Respond in ${langName}.` : "";
    const greetLine = greeting ? ` If this is the start of a new conversation, open with: "${greeting}"` : "";

    return (
        `You are ${identity}.` +
        greetLine +
        ` Answer the caller's question using the information in the provided context.` +
        ` Rewrite that information in ${toneStyle} language — never copy the context word for word.` +
        ` Speak directly to the caller: use 'we' for the business and 'you' for the caller.` +
        ` Keep your answer to 1 to 3 sentences.` +
        langLine +
        ` If the context does not contain the answer, say:` +
        ` "I'd be happy to have someone from our team follow up with you on that —` +
        ` could I get your name and email address?"`
    );
}

export async function generateConversationSummary(transcript, businessTitle = "") {
    if (!Array.isArray(transcript) || transcript.length < 2) return null;

    const lines = transcript
        .map((m) => `${m.role === "assistant" ? "AI" : "Customer"}: ${m.content ?? m.text ?? ""}`)
        .filter((l) => l.length > 5)
        .join("\n");

    try {
        const completion = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a concise summarizer. Given a customer service chat transcript, write ONE sentence (≤25 words) summarizing what the customer needed and how it was resolved. Be factual.",
                },
                {
                    role: "user",
                    content: `Business: ${businessTitle || "unknown"}\n\nTranscript:\n${lines}\n\nOne-sentence summary:`,
                },
            ],
            max_tokens:  60,
            temperature: 0.2,
        });
        return completion.choices[0]?.message?.content?.trim() || null;
    } catch {
        return null;
    }
}

export const generateGroqAnswer = async (context, question, businessName = "", settings = {}) => {
    console.log("[DEBUG] GROQ persona:", settings.aiPersonaName || businessName || "(generic)");
    console.log("[DEBUG] GROQ context:", context);
    console.log("[DEBUG] GROQ question:", question);

    // Fail fast with a clear log if the API key is absent — prevents the SDK from
    // making an unauthenticated request that always throws AuthenticationError.
    if (!process.env.GROQ_API_KEY) {
        console.error("[GROQ] GROQ_API_KEY is not set — cannot call Groq API");
        return "I don't have that information handy, but I'd be happy to have someone from our team follow up with you.";
    }

    let completion;
    try {
        completion = await getClient().chat.completions.create({
            model: MODEL,
            messages: [
                { role: "system", content: buildSystemPrompt(businessName, settings) },
                { role: "user",   content: `Context:\n${context}\n\nQuestion: ${question}` },
            ],
            max_tokens: 120,
            temperature: 0.4,
        });
    } catch (err) {
        console.error("[GROQ] chat.completions.create failed");
        console.error("[GROQ] err.name   :", err?.name);
        console.error("[GROQ] err.message:", err?.message);
        console.error("[GROQ] err.status :", err?.status);
        return "I don't have that information handy, but I'd be happy to have someone from our team follow up with you.";
    }

    return (
        completion.choices[0]?.message?.content?.trim() ||
        "I don't have that information handy, but I'd be happy to have someone from our team follow up with you."
    );
};
