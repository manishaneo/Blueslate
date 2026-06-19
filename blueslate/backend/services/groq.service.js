import Groq from "groq-sdk";

const MODEL = "llama-3.1-8b-instant";

// Lazy — dotenv.config() in server.js runs after ESM imports are hoisted,
// so we must not read process.env at module evaluation time.
let _client = null;
function getClient() {
    if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    return _client;
}

function buildSystemPrompt(businessName) {
    const identity = businessName
        ? `Auri, the AI receptionist for ${businessName}`
        : "Auri, an AI receptionist";

    return (
        `You are ${identity}. ` +
        "Answer the caller's question using the information in the provided context. " +
        "Rewrite that information in warm, natural, conversational language — never copy the context word for word. " +
        "Speak directly to the caller: use 'we' for the business and 'you' for the caller. " +
        "Keep your answer to 1 to 3 sentences. " +
        "If the context does not contain the answer, say: " +
        "\"I'd be happy to have someone from our team follow up with you on that — " +
        "could I get your name and email address?\""
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

export const generateGroqAnswer = async (context, question, businessName = "") => {
    console.log("[DEBUG] GROQ persona:", businessName || "(generic)");
    console.log("[DEBUG] GROQ context:", context);
    console.log("[DEBUG] GROQ question:", question);

    const completion = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
            { role: "system", content: buildSystemPrompt(businessName) },
            { role: "user",   content: `Context:\n${context}\n\nQuestion: ${question}` },
        ],
        max_tokens: 120,
        temperature: 0.4,
    });

    return (
        completion.choices[0]?.message?.content?.trim() ||
        "I don't have that information handy, but I'd be happy to have someone from our team follow up with you."
    );
};
