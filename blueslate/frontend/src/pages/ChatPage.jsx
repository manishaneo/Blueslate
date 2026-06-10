import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../services/chatService";
import { getSettings } from "../services/settingsService";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import LeadSummaryModal from "../components/LeadSummaryModal";

const loadContexts = () => {
    try {
        return JSON.parse(localStorage.getItem("businessContexts")) || [];
    } catch {
        return [];
    }
};

function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url || ""; }
}

const SUGGESTED_QUESTIONS = [
    "What programs do you offer?",
    "What are your business hours?",
    "What age groups do you serve?",
    "How can I contact you?",
];

export default function ChatPage() {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [aiPersonaName, setAiPersonaName] = useState(null);
    const navigate = useNavigate();
    const { dark, toggle: toggleTheme } = useTheme();
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const businessContextId = localStorage.getItem("businessContextId");
    const storageKey = `chat_${businessContextId}`;
    const contexts = loadContexts();
    const currentCtx = contexts.find((c) => String(c.id) === String(businessContextId));
    const businessName = currentCtx?.title || extractDomain(currentCtx?.url) || "";

    const conversationIdRef = useRef(null);

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(messages));
    }, [messages, storageKey]);

    useEffect(() => {
        getSettings()
            .then((s) => setAiPersonaName(s.aiPersonaName ?? "Virtual Receptionist"))
            .catch(() => setAiPersonaName("Virtual Receptionist"));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    if (!businessContextId) {
        window.location.href = "/";
        return null;
    }

    const handleSend = async (text) => {
        const content = (typeof text === "string" ? text : question).trim();
        if (!content) return;

        setQuestion("");
        setMessages((prev) => [...prev, { role: "user", content }]);
        setLoading(true);

        try {
            const response = await sendMessage(content, conversationIdRef.current, "business_chat");
            if (response.conversationId) conversationIdRef.current = response.conversationId;
            setMessages((prev) => [...prev, { role: "assistant", content: response.answer }]);
        } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: "Error getting response." }]);
        }

        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">

                {/* Header — sticky, 3-column layout */}
                <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 shrink-0">
                    <div className="relative max-w-2xl mx-auto h-14 flex items-center justify-between gap-3">

                        {/* Left — back button + business name */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                                onClick={() => navigate("/experience")}
                                title="Back to experience selector"
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {businessName}
                            </span>
                        </div>

                        {/* Center — agent name label, hidden on xs */}
                        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
                            <span className="hidden sm:block text-sm font-medium text-gray-400 dark:text-gray-500">
                                {aiPersonaName}
                            </span>
                        </div>

                        {/* Right — theme toggle */}
                        <div className="flex items-center justify-end flex-1">
                            <button
                                onClick={toggleTheme}
                                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors shrink-0"
                            >
                                {dark ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                    <div className="max-w-2xl mx-auto space-y-5">

                        {/* Welcome — shown only before first message */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                                        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                                        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                                    </svg>
                                </div>
                                <div className="max-w-sm">
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                        {currentCtx?.title ? `Welcome to ${currentCtx.title}` : "Welcome"}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                        {aiPersonaName
                                            ? `I'm ${aiPersonaName}. Ask me anything and I'll answer based on the website content.`
                                            : "Ask me anything and I'll answer based on the website content."
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                        Try a suggested question below or type your own.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.role === "assistant" && (
                                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                                            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                                        </svg>
                                    </div>
                                )}
                                <div
                                    className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                                            ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm shadow-sm border border-gray-200 dark:border-gray-700"
                                        }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                                        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                                    </svg>
                                </div>
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Input */}
                <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 shrink-0">
                    <div className="max-w-2xl mx-auto">

                        {/* Suggested questions — shown before first message */}
                        {messages.length === 0 && (
                            <div className="mb-3">
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Try asking:</p>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTED_QUESTIONS.map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => handleSend(q)}
                                            disabled={loading}
                                            className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Text input row */}
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question about the website..."
                                disabled={loading}
                                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:opacity-50 min-w-0"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !question.trim()}
                                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-300 dark:text-gray-600">
                                Press Enter to send · Shift+Enter for new line
                            </p>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="text-xs font-medium px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-all shrink-0"
                            >
                                End Conversation
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <LeadSummaryModal
                open={modalOpen}
                businessName={businessName}
                source="CHAT"
                agentName={aiPersonaName ?? "Virtual Receptionist"}
                onClose={() => navigate("/customer")}
            />
        </>
    );
}
