import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../services/chatService";
import { useSpeechRecognition, useSpeechSynthesis } from "../hooks/useVoice";

const loadContexts = () => {
    try {
        return JSON.parse(localStorage.getItem("businessContexts")) || [];
    } catch {
        return [];
    }
};

// Intents that warrant a proactive lead-capture follow-up
const LEAD_CAPTURE_INTENTS = new Set(["trial_booking", "admissions", "pricing"]);

export default function ReceptionistPage() {
    const [callStarted, setCallStarted]             = useState(false);
    const [messages, setMessages]                   = useState([]);
    const [loading, setLoading]                     = useState(false);
    const [voiceActive, setVoiceActive]             = useState(false);
    const [voicePhase, setVoicePhase]               = useState(null); // 'listening'|'thinking'|'speaking'
    const [question, setQuestion]                   = useState("");
    const [showEscalation, setShowEscalation]       = useState(false);
    const [awaitingLeadCapture, setAwaitingLeadCapture] = useState(false);

    // Refs for safe use inside async callbacks / TTS onend handlers
    const voiceActiveRef          = useRef(false);
    const handleSendVoiceRef      = useRef(null);
    const micStartRef             = useRef(null);
    const awaitingLeadCaptureRef  = useRef(false);
    const bottomRef               = useRef(null);
    const inputRef                = useRef(null);
    const noSpeechRetries         = useRef(0);
    const prevMicListeningRef     = useRef(false);

    const navigate = useNavigate();

    // ── business context ──────────────────────────────────────────────────────
    const businessContextId = localStorage.getItem("businessContextId");
    const contexts          = loadContexts();
    const currentCtx        = contexts.find((c) => String(c.id) === String(businessContextId));
    const businessName      = currentCtx?.title || currentCtx?.url || "";

    // ── effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
    useEffect(() => { awaitingLeadCaptureRef.current = awaitingLeadCapture; }, [awaitingLeadCapture]);

    // ── voice hooks ───────────────────────────────────────────────────────────
    const {
        listening: micListening,
        supported: micSupported,
        error: micError,
        start: micStart,
        stop: micStop,
    } = useSpeechRecognition((transcript) => {
        if (voiceActiveRef.current) {
            setVoicePhase("thinking");
            handleSendVoiceRef.current?.(transcript);
        } else {
            // Text-mode fallback: append transcript to input field
            setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
    });

    useEffect(() => { micStartRef.current = micStart; }, [micStart]);

    // Bug 1 fix: detect when recognition stops without a transcript while the
    // voice loop expects it to be running, and either retry (no-speech timeout)
    // or reset the phase (hard error like permission denied).
    useEffect(() => {
        if (micListening) {
            // Recognition started successfully — reset counters
            noSpeechRetries.current = 0;
            prevMicListeningRef.current = true;
            return;
        }
        if (!prevMicListeningRef.current) return; // was already stopped, not a new event
        prevMicListeningRef.current = false;

        // Recognition just stopped (true → false). Only act if the voice loop
        // still expects to be listening and the call is still active.
        if (voicePhase !== "listening" || !voiceActiveRef.current) return;

        if (micError) {
            // Hard error (e.g. permission denied) — stop the listening phase
            noSpeechRetries.current = 0;
            setVoicePhase(null);
        } else if (noSpeechRetries.current < 3) {
            // Transient no-speech timeout — silently retry
            noSpeechRetries.current += 1;
            micStartRef.current?.();
        } else {
            // Exhausted 3 retries — give up and hide the listening bar
            noSpeechRetries.current = 0;
            setVoicePhase(null);
        }
    }, [micListening, micError, voicePhase]);

    const { speakingIndex: ttsIndex, supported: ttsSupported, speak: ttsSpeak } =
        useSpeechSynthesis();

    // ── redirect guard ────────────────────────────────────────────────────────
    if (!businessContextId) {
        window.location.href = "/";
        return null;
    }

    // ── helpers ───────────────────────────────────────────────────────────────
    const greeting = businessName
        ? `Thank you for calling ${businessName}! This is Alex, your AI receptionist. How can I help you today?`
        : "Thank you for calling! This is Alex, your AI receptionist. How can I help you today?";

    // Speak text, call onDone when the utterance ends or errors out
    const speakAndThen = (text, onDone) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.onend  = onDone;
        u.onerror = onDone;
        window.speechSynthesis.speak(u);
    };

    const startListening = () => {
        setVoicePhase("listening");
        micStartRef.current?.();
    };

    // ── call lifecycle ────────────────────────────────────────────────────────
    const startCall = (withVoice) => {
        setCallStarted(true);
        setMessages([{ role: "assistant", content: greeting }]);

        if (!withVoice) return; // text-only mode: greeting injected but not spoken

        voiceActiveRef.current = true;
        setVoiceActive(true);
        setVoicePhase("speaking");
        speakAndThen(greeting, () => {
            if (voiceActiveRef.current) startListening();
        });
    };

    const endCall = () => {
        voiceActiveRef.current         = false;
        awaitingLeadCaptureRef.current = false;
        setVoiceActive(false);
        setVoicePhase(null);
        setCallStarted(false);
        setMessages([]);
        setShowEscalation(false);
        setAwaitingLeadCapture(false);
        micStop();
        window.speechSynthesis.cancel();
        navigate("/");
    };

    // ── voice send pipeline ───────────────────────────────────────────────────
    const handleSendVoice = async (text) => {
        const content = text.trim();
        if (!content || !voiceActiveRef.current) return;

        setMessages((prev) => [...prev, { role: "user", content }]);
        setLoading(true);

        let aiText = "I apologize, I'm having trouble connecting right now. Please try again.";
        let intent = null;
        try {
            const res = await sendMessage(Number(businessContextId), content);
            aiText = res.answer;
            intent = res.intent;
        } catch {}

        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        setLoading(false);

        if (!voiceActiveRef.current) return;

        setVoicePhase("speaking");
        speakAndThen(aiText, () => {
            if (!voiceActiveRef.current) return;

            if (intent?.requiresHuman) {
                // Escalation: speak a handoff line, then surface the escalation banner
                const handoff = "I completely understand. Let me get you connected with someone from our team who can help directly.";
                setMessages((prev) => [...prev, { role: "assistant", content: handoff }]);
                setVoicePhase(null);
                speakAndThen(handoff, () => {
                    if (voiceActiveRef.current) setShowEscalation(true);
                });

            } else if (LEAD_CAPTURE_INTENTS.has(intent?.intent) && !awaitingLeadCaptureRef.current) {
                // High-value intent: ask for contact info once, then resume listening
                awaitingLeadCaptureRef.current = true;
                setAwaitingLeadCapture(true);
                const followUp = "I'd love to help with that. Could I get your name and a good phone number or email so our team can follow up with you?";
                setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
                setVoicePhase("speaking");
                speakAndThen(followUp, () => {
                    if (voiceActiveRef.current) startListening();
                });

            } else {
                // Normal turn: restart listening
                startListening();
            }
        });
    };
    // Always keep the ref pointing at the latest closure
    handleSendVoiceRef.current = handleSendVoice;

    // ── text send (fallback) ──────────────────────────────────────────────────
    const handleSend = async (text) => {
        const content = (typeof text === "string" ? text : question).trim();
        if (!content || loading) return;

        setQuestion("");
        setMessages((prev) => [...prev, { role: "user", content }]);
        setLoading(true);

        let aiText = "I apologize, I'm having trouble connecting right now. Please try again.";
        let intent = null;
        try {
            const res = await sendMessage(Number(businessContextId), content);
            aiText = res.answer;
            intent = res.intent;
        } catch {}

        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        setLoading(false);

        if (intent?.requiresHuman) {
            const handoff = "I completely understand. Let me get you connected with someone from our team who can help directly.";
            setMessages((prev) => [...prev, { role: "assistant", content: handoff }]);
            setShowEscalation(true);
        } else if (LEAD_CAPTURE_INTENTS.has(intent?.intent) && !awaitingLeadCaptureRef.current) {
            awaitingLeadCaptureRef.current = true;
            setAwaitingLeadCapture(true);
            const followUp = "I'd love to help with that. Could I get your name and a good phone number or email so our team can follow up with you?";
            setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canStartVoice = micSupported && ttsSupported;

    // ── pre-call screen ───────────────────────────────────────────────────────
    if (!callStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4">
                <div className="flex flex-col items-center gap-6 text-center max-w-xs w-full">

                    {/* Avatar with pulsing ring */}
                    <div className="relative">
                        <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-200 dark:shadow-blue-900/50">
                            <span className="text-3xl font-bold text-white">A</span>
                        </div>
                    </div>

                    {/* Identity */}
                    <div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">Alex</p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">AI Receptionist</p>
                        {businessName && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[220px]">
                                {businessName}
                            </p>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Incoming call — tap Answer to begin
                    </p>

                    {/* Answer / text-only CTAs */}
                    <div className="flex flex-col items-center gap-3 w-full">
                        {canStartVoice && (
                            <button
                                onClick={() => startCall(true)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                                </svg>
                                Answer
                            </button>
                        )}
                        <button
                            onClick={() => startCall(false)}
                            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
                        >
                            Type instead
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── in-call screen ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">

            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                        <span className="text-sm font-bold text-white">A</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                            Alex · AI Receptionist
                        </h1>
                        {businessName && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate max-w-[180px] sm:max-w-xs">
                                {businessName}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    onClick={endCall}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium transition-colors shadow-sm shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 rotate-[135deg]">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">End Call</span>
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                <div className="max-w-2xl mx-auto space-y-5">

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "assistant" && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                                    <span className="text-xs font-bold text-white">A</span>
                                </div>
                            )}
                            <div className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed ${
                                msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm shadow-sm border border-gray-200 dark:border-gray-700"
                            }`}>
                                {msg.content}
                            </div>
                            {msg.role === "assistant" && ttsSupported && !voiceActive && (
                                <button
                                    type="button"
                                    onClick={() => ttsSpeak(i, msg.content)}
                                    title={ttsIndex === i ? "Stop speaking" : "Read aloud"}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                        ttsIndex === i
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

                    {/* Thinking indicator */}
                    {loading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/50">
                                <span className="text-xs font-bold text-white">A</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}

                    {/* Escalation banner */}
                    {showEscalation && (
                        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                    Connecting to a human agent
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                                    Our team will be in touch shortly.
                                    {currentCtx?.url && (
                                        <> You can also reach us directly at{" "}
                                            <span className="font-medium">{currentCtx.url}</span>.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Bottom bar */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 shrink-0">
                <div className="max-w-2xl mx-auto">

                    {/* Voice status bar — only shown while voice loop is running */}
                    {voiceActive && voicePhase && (
                        <div className="mb-3 flex items-center gap-3 bg-blue-600 dark:bg-blue-700 rounded-2xl px-4 py-3 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
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
                                {voicePhase === "thinking"  && "Thinking..."}
                                {voicePhase === "speaking"  && "Speaking..."}
                            </span>
                        </div>
                    )}

                    {/* Text input — always available as fallback; hidden after escalation */}
                    {!showEscalation && (
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
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
                    )}

                    {micError && (
                        <p className="text-center text-xs mt-2 text-red-400">{micError}</p>
                    )}
                </div>
            </div>

        </div>
    );
}
