import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../services/chatService";
import { useNavigate } from "react-router-dom";
import { useSpeechRecognition, useSpeechSynthesis } from "../hooks/useVoice";

const loadContexts = () => {
    try {
        return JSON.parse(localStorage.getItem("businessContexts")) || [];
    } catch {
        return [];
    }
};


const SUGGESTED_QUESTIONS = [
    "What programs do you offer?",
    "What are your business hours?",
    "What age groups do you serve?",
    "How can I contact you?",
];

export default function ChatPage() {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [voicePhase, setVoicePhase] = useState(null); // 'listening' | 'thinking' | 'speaking'
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    // Refs for voice mode coordination (avoid stale closures across async boundaries)
    const voiceActiveRef      = useRef(false);
    const handleSendVoiceRef  = useRef(null);
    const micStartRef         = useRef(null);

    const businessContextId = localStorage.getItem("businessContextId");
    const storageKey = `chat_${businessContextId}`;
    const contexts = loadContexts();
    const currentCtx = contexts.find((c) => String(c.id) === String(businessContextId));

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
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Keep voiceActiveRef in sync with state
    useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);

    const { listening: micListening, supported: micSupported, error: micError, toggle: micToggle, start: micStart, stop: micStop } =
        useSpeechRecognition((transcript) => {
            if (voiceActiveRef.current) {
                // Voice mode: route transcript through voice pipeline
                setVoicePhase("thinking");
                handleSendVoiceRef.current?.(transcript);
            } else {
                // Regular mode: append transcript to text input
                setQuestion((prev) => {
                    const next = prev ? `${prev} ${transcript}` : transcript;
                    requestAnimationFrame(() => {
                        if (inputRef.current) {
                            inputRef.current.focus();
                            inputRef.current.setSelectionRange(next.length, next.length);
                        }
                    });
                    return next;
                });
            }
        });

    // Keep micStartRef fresh (micStart is stable, but use ref for closure safety)
    useEffect(() => { micStartRef.current = micStart; }, [micStart]);

    const { speakingIndex: ttsIndex, supported: ttsSupported, speak: ttsSpeak } =
        useSpeechSynthesis();

    if (!businessContextId) {
        window.location.href = "/";
        return null;
    }

    // Voice pipeline: send transcript → get AI response → speak → restart listening
    const handleSendVoice = async (text) => {
        const content = text.trim();
        if (!content || !voiceActiveRef.current) return;

        setMessages((prev) => [...prev, { role: "user", content }]);
        setLoading(true);

        let aiText = "Error getting response.";
        try {
            const response = await sendMessage(Number(businessContextId), content);
            aiText = response.answer;
        } catch {}

        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        setLoading(false);

        if (!voiceActiveRef.current) return;

        setVoicePhase("speaking");
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiText);
        const onSpeakEnd = () => {
            if (voiceActiveRef.current) {
                setVoicePhase("listening");
                micStartRef.current?.();
            }
        };
        utterance.onend   = onSpeakEnd;
        utterance.onerror = onSpeakEnd;
        window.speechSynthesis.speak(utterance);
    };
    // Always keep ref pointing to latest version
    handleSendVoiceRef.current = handleSendVoice;

    const startVoiceMode = () => {
        if (!micSupported || !ttsSupported) return;
        voiceActiveRef.current = true;
        setVoiceActive(true);
        setVoicePhase("listening");
        micStart();
    };

    const endVoiceMode = () => {
        voiceActiveRef.current = false;
        setVoiceActive(false);
        setVoicePhase(null);
        micStop();
        window.speechSynthesis.cancel();
    };

    const handleSend = async (text) => {
        const content = (typeof text === "string" ? text : question).trim();
        if (!content) return;

        const userMessage = { role: "user", content };
        setQuestion("");
        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);

        try {
            console.log("[ChatPage] sending businessContextId:", businessContextId, "→", Number(businessContextId));
            const response = await sendMessage(Number(businessContextId), content);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: response.answer },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Error getting response." },
            ]);
        }

        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSwitch = (ctx) => {
        localStorage.setItem("businessContextId", ctx.id);
        setShowSwitcher(false);
        window.location.reload();
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">

            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">AI Website Assistant</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {currentCtx ? (
                                <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate max-w-[160px] sm:max-w-xs">
                                    {currentCtx.url}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">Context #{businessContextId}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Context switcher */}
                    {contexts.length > 1 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowSwitcher((v) => !v)}
                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">Switch</span>
                            </button>

                            {showSwitcher && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Switch website</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {contexts.map((ctx) => {
                                            const isActive = String(ctx.id) === String(businessContextId);
                                            return (
                                                <button
                                                    key={ctx.id}
                                                    onClick={() => handleSwitch(ctx)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                        isActive
                                                            ? "bg-blue-50 dark:bg-blue-900/30 cursor-default"
                                                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    }`}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-100 dark:bg-gray-700"}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${isActive ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                                                            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"}`}>
                                                            {ctx.url}
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ID #{ctx.id}</p>
                                                    </div>
                                                    {isActive && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0">
                                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => navigate("/")}
                                            className="w-full text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                            </svg>
                                            Add new website
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => navigate("/leads")}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                            <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                        </svg>
                        <span className="hidden sm:inline">View Leads</span>
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" onClick={() => setShowSwitcher(false)}>
                <div className="max-w-2xl mx-auto space-y-5">

                    {/* Welcome section — shown only before first message, not stored in chat history */}
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
                                    I'm your AI assistant. Ask me anything about this business and I'll answer based on the website content.
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
                                className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed ${
                                    message.role === "user"
                                        ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm shadow-sm border border-gray-200 dark:border-gray-700"
                                }`}
                            >
                                {message.content}
                            </div>
                            {message.role === "assistant" && ttsSupported && (
                                <button
                                    type="button"
                                    onClick={() => ttsSpeak(index, message.content)}
                                    title={ttsIndex === index ? "Stop speaking" : "Read aloud"}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                        ttsIndex === index
                                            ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                                            : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                                    </svg>
                                </button>
                            )}
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

                    {/* Voice Agent Status Bar — shown when voice mode is active */}
                    {voiceActive && (
                        <div className="mb-3 flex items-center justify-between bg-blue-600 dark:bg-blue-700 rounded-2xl px-4 py-3 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
                            <div className="flex items-center gap-3">
                                {voicePhase === "listening" && (
                                    <span className="relative flex h-3 w-3 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                                    </span>
                                )}
                                {voicePhase === "thinking" && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                    </div>
                                )}
                                {voicePhase === "speaking" && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white animate-pulse shrink-0">
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                                    </svg>
                                )}
                                <span className="text-sm font-semibold text-white">
                                    {voicePhase === "listening" && "Listening..."}
                                    {voicePhase === "thinking" && "Thinking..."}
                                    {voicePhase === "speaking" && "Speaking..."}
                                </span>
                            </div>
                            <button
                                onClick={endVoiceMode}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-colors shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                                </svg>
                                End Conversation
                            </button>
                        </div>
                    )}

                    {/* Start Voice Conversation button — shown when voice mode is off */}
                    {!voiceActive && micSupported && ttsSupported && (
                        <div className="mb-3">
                            <button
                                onClick={startVoiceMode}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white text-sm font-semibold shadow shadow-blue-200 dark:shadow-blue-900/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                                </svg>
                                Start Voice Conversation
                            </button>
                        </div>
                    )}

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
                        {/* Hide mic toggle during voice mode to avoid confusion */}
                        {micSupported && !voiceActive && (
                            <button
                                type="button"
                                onClick={micToggle}
                                disabled={loading}
                                title={micListening ? "Stop listening" : "Speak your message"}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                    micListening
                                        ? "bg-red-100 text-red-500 ring-2 ring-red-300"
                                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            >
                                {micListening ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                                    </svg>
                                )}
                            </button>
                        )}
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
                    <p className={`text-center text-xs mt-2 ${micError ? "text-red-400" : "text-gray-300 dark:text-gray-600"}`}>
                        {micError ?? "Press Enter to send · Shift+Enter for new line"}
                    </p>
                </div>
            </div>

        </div>
    );
}
