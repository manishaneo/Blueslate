import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage as sendMessageAuth, sendTestMessage, finalizeConversation } from "../services/chatService";
import { useSpeechRecognition, useSpeechSynthesis } from "../hooks/useVoice";
import {
    Mic, MicOff, PhoneOff, Volume2, VolumeX, User, Phone,
    ChevronDown, ChevronUp, AlertCircle, Keyboard, LayoutDashboard, Loader2,
    Moon, Sun,
} from "lucide-react";
import LeadSummaryModal from "./LeadSummaryModal";
import { useTheme } from "../hooks/useTheme";

const LEAD_CAPTURE_INTENTS = new Set(["trial_booking", "admissions", "pricing"]);

function Toast({ message }) {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-red-600 text-white">
            <AlertCircle size={16} />
            {message}
        </div>
    );
}

const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const formatTimer = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ── Demo call layout — phone-call style, transcript secondary ─────────────────
function DemoCallLayout({
    messages, loading, voicePhase, muted, speakerEnabled,
    callSeconds, businessName, agentName, showEscalation,
    question, setQuestion, handleSend,
    toggleMute, toggleSpeaker, endCall,
    micError, bottomRef, inputRef,
    onBack,
}) {
    const { dark, toggle } = useTheme();
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [showTextInput,      setShowTextInput]      = useState(false);
    const autoCollapseRef = useRef(null);

    const lastMsg     = messages[messages.length - 1];
    const totalMsgs   = messages.length;
    const isThinking  = voicePhase === "thinking" || loading;

    // Auto-collapse transcript after 10s of no interaction
    useEffect(() => {
        if (!transcriptExpanded) { clearTimeout(autoCollapseRef.current); return; }
        clearTimeout(autoCollapseRef.current);
        autoCollapseRef.current = setTimeout(() => setTranscriptExpanded(false), 10000);
        return () => clearTimeout(autoCollapseRef.current);
    }, [transcriptExpanded]);

    const sendAndCollapse = () => { handleSend(); setShowTextInput(false); };

    const avatarRing =
        muted                      ? "ring-4 ring-gray-400/30"
      : voicePhase === "listening" ? "ring-4 ring-green-400/70 animate-pulse"
      : voicePhase === "speaking"  ? "ring-4 ring-blue-400/70 animate-pulse"
      : isThinking                 ? "ring-4 ring-yellow-400/60 animate-pulse"
      :                              "ring-2 ring-white/10";

    const statusLabel =
        muted                      ? "Microphone muted"
      : voicePhase === "listening" ? "Listening..."
      : voicePhase === "speaking"  ? "Speaking..."
      : isThinking                 ? "Checking information..."
      :                              "Ready";

    const statusColor =
        muted                      ? "text-gray-500"
      : voicePhase === "listening" ? "text-green-400"
      : voicePhase === "speaking"  ? "text-blue-400"
      : isThinking                 ? "text-yellow-400"
      :                              "text-gray-400";

    // Strip marketing taglines (em/en dash, pipe) — keep only the primary business name
    const displayName = businessName
        ? businessName.split(/\s*[–—|]\s*/)[0].trim()
        : businessName;

    return (
        <div className="flex flex-col bg-[#060c17]" style={{ height: "100dvh" }}>

            {/* ── HEADER STRIP ─────────────────────────────────────────────── */}
            <div className="shrink-0 h-11 flex items-center justify-between px-4 sm:px-5 bg-white/3 border-b border-white/8">

                {/* Left: Back button or Live Demo badge */}
                {onBack ? (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <ChevronDown size={13} className="rotate-90" />
                        Back
                    </button>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-blue-400 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Live Demo
                    </span>
                )}

                {/* Center: Blueslate wordmark */}
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                        <LayoutDashboard size={9} className="text-white" />
                    </div>
                    <span className="text-[13px] font-bold text-white tracking-tight">Blueslate</span>
                </div>

                {/* Right: theme toggle */}
                <button
                    onClick={toggle}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-all"
                    title={dark ? "Light mode" : "Dark mode"}
                >
                    {dark ? <Sun size={13} /> : <Moon size={13} />}
                </button>
            </div>

            {/* ── CONTENT AREA: flex-col, upper centers primary UI, lower holds transcript+input ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Upper — avatar, identity, status, timer, escalation */}
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden px-5 py-4">
                    <div className="w-full max-w-[320px] flex flex-col items-center gap-4">

                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {isThinking && (
                                <div
                                    className="absolute inset-0 rounded-full ring-4 ring-yellow-400 animate-ping opacity-40"
                                    style={{ animationDuration: "1.2s" }}
                                />
                            )}
                            <div
                                className={`w-[84px] h-[84px] rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-600/30 transition-all duration-300 ${avatarRing}`}
                            >
                                <span className="text-3xl font-black text-white select-none">A</span>
                            </div>
                        </div>

                        {/* Business + agent identity */}
                        <div className="text-center leading-none shrink-0 w-full max-w-xs">
                            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight truncate">
                                {displayName}
                            </p>
                            <p className="text-base font-medium text-gray-400 mt-2">
                                {agentName}
                                <span className="text-gray-700 font-normal"> · Virtual Receptionist</span>
                            </p>
                        </div>

                        {/* Status card */}
                        <div
                            className="w-full flex items-center justify-center gap-3 px-5 rounded-xl bg-white/5 border border-white/8 shrink-0"
                            style={{ height: "52px" }}
                        >
                            {muted ? (
                                <MicOff size={14} className="text-gray-500 shrink-0" />
                            ) : (voicePhase === "listening" || voicePhase === "speaking") ? (
                                <VoiceWaveform phase={voicePhase} />
                            ) : isThinking ? (
                                <Loader2 size={14} className="animate-spin text-yellow-400 shrink-0" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            )}
                            <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
                        </div>

                        {/* Call timer */}
                        <p className="text-2xl font-black font-mono text-gray-600 tracking-tight shrink-0">
                            {formatTimer(callSeconds)}
                        </p>

                        {/* Escalation notice */}
                        {showEscalation && (
                            <div className="w-full shrink-0 flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                                <Phone size={13} className="text-blue-400 shrink-0" />
                                <p className="text-sm font-medium text-blue-300">Connecting you to our team</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower — transcript + text input. shrink-0 so controls dock never moves. */}
                <div className="shrink-0 flex flex-col items-center gap-2 px-5 pb-3 w-full">
                    <div className="w-full max-w-sm">

                        {/* Transcript panel — expands internally, never pushes input down */}
                        {totalMsgs > 0 && (
                            transcriptExpanded ? (
                                <div
                                    className="w-full flex flex-col bg-gray-900/90 border border-white/10 rounded-xl overflow-hidden"
                                    style={{ maxHeight: "300px" }}
                                >
                                    <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-white/8">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                            Conversation ({totalMsgs})
                                        </span>
                                        <button
                                            onClick={() => setTranscriptExpanded(false)}
                                            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 transition-colors"
                                            aria-label="Collapse transcript"
                                        >
                                            <ChevronUp size={12} />
                                        </button>
                                    </div>
                                    <div
                                        className="overflow-y-auto portal-scrollbar-dark px-3 py-2.5 space-y-2.5"
                                        onScroll={() => clearTimeout(autoCollapseRef.current)}
                                    >
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex items-end gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                                    msg.role === "assistant" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-700"
                                                }`}>
                                                    {msg.role === "assistant"
                                                        ? <span className="text-[8px] font-bold text-white">A</span>
                                                        : <User size={9} className="text-gray-400" />}
                                                </div>
                                                <div className={`max-w-[82%] px-2.5 py-1.5 text-xs leading-relaxed rounded-lg ${
                                                    msg.role === "user"
                                                        ? "bg-blue-600 text-white rounded-br-sm"
                                                        : "bg-white/8 text-gray-300 rounded-bl-sm"
                                                }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {loading && (
                                            <div className="flex items-end gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                                                    <span className="text-[8px] font-bold text-white">A</span>
                                                </div>
                                                <div className="bg-white/8 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                                                    {["-0.3s", "-0.15s", "0s"].map((d, idx) => (
                                                        <span key={idx} className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: d }} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div ref={bottomRef} />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setTranscriptExpanded(true)}
                                    className="w-full flex items-center gap-2 px-4 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors text-left"
                                    style={{ height: "48px" }}
                                    aria-label="Show conversation"
                                >
                                    <ChevronDown size={11} className="text-gray-600 shrink-0" />
                                    <span className="text-xs font-semibold text-gray-600 shrink-0">
                                        Conversation ({totalMsgs})
                                    </span>
                                    {lastMsg && (
                                        <>
                                            <span className="text-gray-700 text-xs shrink-0">·</span>
                                            <span className="text-xs text-gray-700 truncate min-w-0">{lastMsg.content}</span>
                                        </>
                                    )}
                                </button>
                            )
                        )}
                    </div>

                    {/* Text input — always visible below transcript */}
                    {!showEscalation && (
                        showTextInput ? (
                            <div className="w-full max-w-sm">
                                <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3.5 py-2 focus-within:border-white/20 transition-all">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAndCollapse(); }
                                        }}
                                        placeholder="Type a message..."
                                        disabled={loading}
                                        autoFocus
                                        className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none disabled:opacity-40 min-w-0"
                                    />
                                    <button
                                        onClick={sendAndCollapse}
                                        disabled={loading || !question.trim()}
                                        className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                                        aria-label="Send"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    </button>
                                </div>
                                {micError && <p className="text-center text-xs mt-1 text-red-400">{micError}</p>}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTextInput(true)}
                                className="flex items-center gap-1.5 text-gray-700 hover:text-gray-500 transition-colors"
                            >
                                <Keyboard size={11} />
                                <span className="text-xs font-medium">Send a message instead</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* ── CONTROLS DOCK ────────────────────────────────────────────── */}
            <div
                className="shrink-0 bg-black/50 backdrop-blur-md border-t border-white/8"
                style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
            >
                <div className="flex items-center justify-center gap-10 px-6 pt-4 pb-2">

                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                muted ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/40" : "bg-white/10 text-gray-300 hover:bg-white/16"
                            }`}
                            aria-label={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <span className="text-[10px] font-medium text-gray-600">{muted ? "Unmute" : "Mute"}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={endCall}
                            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
                            aria-label="End call"
                        >
                            <PhoneOff size={22} className="text-white" />
                        </button>
                        <span className="text-[10px] font-medium text-gray-600">End Call</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleSpeaker}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                speakerEnabled ? "bg-white/10 text-gray-300 hover:bg-white/16" : "bg-white/5 text-gray-600"
                            }`}
                            aria-label={speakerEnabled ? "Speaker on" : "Speaker off"}
                        >
                            {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                        <span className="text-[10px] font-medium text-gray-600">Speaker</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Business color theming ────────────────────────────────────────────────────

const BUSINESS_PALETTES = [
    { avatar: "from-blue-500 to-blue-700",       shadow: "shadow-blue-200 dark:shadow-blue-900/40",       ring: "ring-blue-400"    },
    { avatar: "from-emerald-500 to-emerald-700",  shadow: "shadow-emerald-200 dark:shadow-emerald-900/40", ring: "ring-emerald-400" },
    { avatar: "from-violet-500 to-violet-700",    shadow: "shadow-violet-200 dark:shadow-violet-900/40",   ring: "ring-violet-400"  },
    { avatar: "from-rose-500 to-rose-700",        shadow: "shadow-rose-200 dark:shadow-rose-900/40",       ring: "ring-rose-400"    },
    { avatar: "from-amber-500 to-amber-700",      shadow: "shadow-amber-200 dark:shadow-amber-900/40",     ring: "ring-amber-400"   },
    { avatar: "from-cyan-500 to-cyan-700",        shadow: "shadow-cyan-200 dark:shadow-cyan-900/40",       ring: "ring-cyan-400"    },
    { avatar: "from-indigo-500 to-indigo-700",    shadow: "shadow-indigo-200 dark:shadow-indigo-900/40",   ring: "ring-indigo-400"  },
    { avatar: "from-teal-500 to-teal-700",        shadow: "shadow-teal-200 dark:shadow-teal-900/40",       ring: "ring-teal-400"    },
];

function getBusinessTheme(name) {
    let hash = 0;
    const s = name || "";
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return BUSINESS_PALETTES[Math.abs(hash) % BUSINESS_PALETTES.length];
}

// ── Voice waveform ────────────────────────────────────────────────────────────

function VoiceWaveform({ phase }) {
    const isListening = phase === "listening";
    const isSpeaking  = phase === "speaking";
    const isActive    = isListening || isSpeaking;
    const barColor    = isSpeaking ? "bg-blue-500" : isListening ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600";
    const HEIGHTS     = [6, 10, 14, 20, 14, 10, 6];

    return (
        <div className="flex items-center gap-0.5" aria-hidden="true">
            {HEIGHTS.map((h, i) => (
                <div
                    key={i}
                    className={`w-1 rounded-full ${barColor} ${isActive ? "animate-bounce" : ""}`}
                    style={{
                        height: isActive ? `${h}px` : "4px",
                        animationDelay: `${i * 75}ms`,
                        animationDuration: "0.65s",
                        transition: "height 0.15s ease",
                    }}
                />
            ))}
        </div>
    );
}

// ── Customer portal call layout (portal mode only, no demo branding) ─────────
function CustomerCallLayout({
    messages, loading, voicePhase, muted, speakerEnabled,
    callSeconds, businessName, agentName, status, showEscalation,
    question, setQuestion, handleSend, handleKeyDown,
    toggleMute, toggleSpeaker, endCall,
    canUseVoice, micError, bottomRef, inputRef,
    businessContextUrl,
}) {
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [showTextInput,      setShowTextInput]      = useState(false);
    const [messageTimes,       setMessageTimes]       = useState([]);
    const prevMsgCountRef = useRef(0);
    const autoCollapseRef = useRef(null);
    const callStartRef    = useRef(new Date());

    const theme   = getBusinessTheme(businessName);
    const initial = (agentName || "A").charAt(0).toUpperCase();
    const lastMsg = messages[messages.length - 1];

    // Track per-message timestamps
    useEffect(() => {
        const added = messages.length - prevMsgCountRef.current;
        if (added > 0) {
            const now = new Date();
            setMessageTimes(prev => [...prev, ...Array(added).fill(now)]);
            prevMsgCountRef.current = messages.length;
        } else if (messages.length === 0 && prevMsgCountRef.current > 0) {
            setMessageTimes([]);
            prevMsgCountRef.current = 0;
        }
    }, [messages.length]);

    // Auto-collapse transcript after 10s inactivity
    useEffect(() => {
        if (!transcriptExpanded) { clearTimeout(autoCollapseRef.current); return; }
        clearTimeout(autoCollapseRef.current);
        autoCollapseRef.current = setTimeout(() => setTranscriptExpanded(false), 10000);
        return () => clearTimeout(autoCollapseRef.current);
    }, [transcriptExpanded]);

    const fmtTime = (d) =>
        d instanceof Date ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

    const isThinking = voicePhase === "thinking" || loading;

    const ringClass =
        muted                      ? "ring-2 ring-gray-600"
      : voicePhase === "listening" ? "ring-4 ring-green-400 animate-pulse"
      : voicePhase === "speaking"  ? "ring-4 ring-blue-400 animate-pulse"
      : isThinking                 ? ""
      :                              `ring-2 ${theme.ring}`;

    const ringStyle = voicePhase === "speaking" ? { animationDuration: "0.75s" } : {};

    const statusLabel =
        muted                      ? "Your microphone is muted"
      : voicePhase === "listening" ? `${agentName} is listening...`
      : voicePhase === "speaking"  ? `${agentName} is speaking...`
      : isThinking                 ? "Checking information..."
      :                              "Ready";

    const statusColor =
        muted                      ? "text-gray-400"
      : voicePhase === "listening" ? "text-green-400"
      : voicePhase === "speaking"  ? "text-blue-400"
      : isThinking                 ? "text-yellow-400"
      :                              "text-gray-300";

    // Send typed message and auto-collapse the input
    const sendAndCollapse = () => {
        handleSend();
        setShowTextInput(false);
    };

    // Transcript panel — inline, 60px collapsed / 220px expanded, internal scroll only
    const transcriptPanel = messages.length > 0 && (
        transcriptExpanded ? (
            <div
                className="w-full max-w-sm flex flex-col bg-gray-900/80 border border-white/10 rounded-xl overflow-hidden shrink-0"
                style={{ maxHeight: "220px" }}
            >
                <div className="shrink-0 flex items-center justify-between px-3.5 py-2 border-b border-white/8">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Conversation</span>
                    <button
                        onClick={() => setTranscriptExpanded(false)}
                        className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 transition-colors"
                        aria-label="Collapse"
                    >
                        <ChevronDown size={12} />
                    </button>
                </div>
                <div
                    className="overflow-y-auto portal-scrollbar-dark px-3 py-2 space-y-2"
                    onScroll={() => clearTimeout(autoCollapseRef.current)}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-white/6" />
                        <p className="text-[9px] text-gray-700 shrink-0">{fmtTime(callStartRef.current)}</p>
                        <div className="flex-1 h-px bg-white/6" />
                    </div>
                    {messages.map((msg, i) => {
                        const t  = messageTimes[i];
                        const tl = t ? fmtTime(t) : "";
                        return (
                            <div key={i} className={`flex items-end gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                    msg.role === "assistant" ? `bg-gradient-to-br ${theme.avatar}` : "bg-gray-700"
                                }`}>
                                    {msg.role === "assistant"
                                        ? <span className="text-[8px] font-bold text-white">{initial}</span>
                                        : <User size={9} className="text-gray-400" />}
                                </div>
                                <div className="max-w-[80%]">
                                    <p className={`text-[9px] text-gray-600 mb-0.5 ${msg.role === "user" ? "text-right" : ""}`}>
                                        {msg.role === "assistant"
                                            ? `${agentName}${tl ? ` · ${tl}` : ""}`
                                            : `${tl ? `${tl} · ` : ""}You`}
                                    </p>
                                    <div className={`px-2.5 py-1.5 text-xs leading-relaxed rounded-lg ${
                                        msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-br-sm"
                                            : "bg-white/8 text-gray-300 rounded-bl-sm"
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {loading && (
                        <div className="flex items-end gap-1.5">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.avatar} flex items-center justify-center shrink-0`}>
                                <span className="text-[8px] font-bold text-white">{initial}</span>
                            </div>
                            <div className="bg-white/8 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1">
                                {["-0.3s", "-0.15s", "0s"].map((d, idx) => (
                                    <span key={idx} className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: d }} />
                                ))}
                            </div>
                        </div>
                    )}
                    {showEscalation && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-blue-900/40" />
                            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wide shrink-0">Team connecting</p>
                            <div className="flex-1 h-px bg-blue-900/40" />
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        ) : (
            <button
                onClick={() => setTranscriptExpanded(true)}
                className="w-full max-w-sm shrink-0 flex items-center gap-2 px-4 rounded-xl bg-white/4 border border-white/8 text-left hover:bg-white/6 transition-colors"
                style={{ height: "60px" }}
                aria-label="Show conversation"
            >
                <ChevronDown size={11} className="text-gray-600 shrink-0" />
                <span className="text-xs text-gray-600 font-medium shrink-0">
                    {lastMsg?.role === "assistant" ? agentName : "You"}:
                </span>
                <span className="text-xs text-gray-600 truncate min-w-0">{lastMsg?.content}</span>
            </button>
        )
    );

    // Strip taglines from business name
    const displayName = businessName
        ? businessName.split(/\s*[–—|]\s*/)[0].trim()
        : businessName;

    return (
        <div className="w-full bg-gray-950 overflow-hidden" style={{ height: "100dvh" }}>
            <div className="flex flex-col h-full">

                {/* Header — 40px */}
                <div className="shrink-0 flex items-center justify-between px-6 h-10 border-b border-white/4">
                    <div className="max-w-xl w-full mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                            <span className="text-xs font-medium text-gray-600">Connected</span>
                        </div>
                        <span className="text-sm font-mono font-medium text-gray-500 tabular-nums">
                            {formatTimer(callSeconds)}
                        </span>
                    </div>
                </div>

                {/* Content area: upper centers primary UI, lower holds transcript+input */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Upper — avatar, identity, status, escalation */}
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden px-6 py-4">
                        <div className="w-full max-w-xl flex flex-col items-center gap-3">

                            {/* Avatar */}
                            <div className="relative shrink-0">
                                {isThinking && (
                                    <div
                                        className="absolute inset-0 rounded-full ring-4 ring-yellow-400 animate-ping opacity-60"
                                        style={{ animationDuration: "1.2s" }}
                                    />
                                )}
                                <div
                                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${theme.avatar} flex items-center justify-center shadow-2xl transition-all duration-300 ${ringClass}`}
                                    style={ringStyle}
                                >
                                    <span className="text-2xl font-black text-white select-none">{initial}</span>
                                </div>
                            </div>

                            {/* Identity */}
                            <div className="text-center leading-none w-full max-w-sm">
                                <p className="text-4xl font-bold text-white tracking-tight leading-tight truncate">
                                    {displayName}
                                </p>
                                <p className="text-lg font-medium text-gray-400 mt-1.5">
                                    {agentName}
                                    <span className="text-gray-700 font-normal"> · Receptionist</span>
                                </p>
                            </div>

                            {/* Status card */}
                            <div
                                className="w-full max-w-sm flex items-center justify-center gap-3 px-5 rounded-xl bg-white/5 border border-white/8 shrink-0"
                                style={{ height: "56px" }}
                            >
                                {muted ? (
                                    <MicOff size={15} className="text-gray-500 shrink-0" />
                                ) : (voicePhase === "listening" || voicePhase === "speaking") ? (
                                    <VoiceWaveform phase={voicePhase} />
                                ) : isThinking ? (
                                    <Loader2 size={15} className="animate-spin text-yellow-400 shrink-0" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                )}
                                <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
                            </div>

                            {/* Escalation notice */}
                            {showEscalation && (
                                <div className="w-full max-w-sm shrink-0 flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                                    <Phone size={13} className="text-blue-400 shrink-0" />
                                    <p className="text-sm font-medium text-blue-300">Connecting you to our team</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lower — transcript + keyboard input, always visible */}
                    <div className="shrink-0 flex flex-col items-center gap-2 px-6 pb-3 w-full">
                        {transcriptPanel}

                        {/* Keyboard fallback — always visible below transcript */}
                        {!showEscalation && (
                            showTextInput ? (
                                <div className="w-full max-w-sm">
                                    <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3.5 py-2 focus-within:border-white/20 transition-all">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAndCollapse(); }
                                            }}
                                            placeholder="Type a message..."
                                            disabled={loading}
                                            autoFocus
                                            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none disabled:opacity-40 min-w-0"
                                        />
                                        <button
                                            onClick={sendAndCollapse}
                                            disabled={loading || !question.trim()}
                                            className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                                            aria-label="Send"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                            </svg>
                                        </button>
                                    </div>
                                    {micError && <p className="text-center text-xs mt-1 text-red-400">{micError}</p>}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowTextInput(true)}
                                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-500 transition-colors"
                                >
                                    <Keyboard size={11} />
                                    <span className="text-xs font-medium">Send a message instead</span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Controls dock */}
                <div
                    className="shrink-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/8"
                    style={{
                        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
                        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
                    }}
                >
                    <div className="max-w-xl mx-auto flex items-center justify-center gap-10 px-6 pt-3 pb-2">

                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={toggleMute}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                    muted ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30" : "bg-white/10 text-gray-300 hover:bg-white/15"
                                }`}
                                aria-label={muted ? "Unmute" : "Mute"}
                            >
                                {muted ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                            <span className="text-[9px] font-medium text-gray-600">{muted ? "Unmute" : "Mute"}</span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={endCall}
                                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                aria-label="End call"
                            >
                                <PhoneOff size={19} className="text-white" />
                            </button>
                            <span className="text-[9px] font-medium text-gray-600">End Call</span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={toggleSpeaker}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                    speakerEnabled ? "bg-white/10 text-gray-300 hover:bg-white/15" : "bg-white/5 text-gray-600"
                                }`}
                                aria-label={speakerEnabled ? "Speaker on" : "Speaker off"}
                            >
                                {speakerEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                            <span className="text-[9px] font-medium text-gray-600">Speaker</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component — all business logic lives here, layout is branched at render
// ─────────────────────────────────────────────────────────────────────────────
export default function AIConversationTester({
    greeting,
    businessName = "",
    businessContextId = "",
    businessContextUrl = "",
    mode = "receptionist",
    agentName = "Virtual Receptionist",
    compact = false,
    sendMessage: sendMessageOverride = null,
    testMode = false,
    portalMode = false,
    onCallEnd,
    onBack = null,
    initialMessages    = [],
    onMessagesChange   = null,
    skipGreeting       = false,
    initialCallSeconds = 0,
}) {
    // ── state ─────────────────────────────────────────────────────────────────
    const [messages,            setMessages]           = useState(initialMessages);
    const [loading,             setLoading]            = useState(false);
    const [voiceActive,         setVoiceActive]        = useState(false);
    const [voicePhase,          setVoicePhase]         = useState(null);
    const [question,            setQuestion]           = useState("");
    const [showEscalation,      setShowEscalation]     = useState(false);
    const [awaitingLeadCapture, setAwaitingLeadCapture]= useState(false);
    const [muted,               setMuted]              = useState(false);
    const [speakerEnabled,      setSpeakerEnabled]     = useState(true);
    const [textInputVisible,    setTextInputVisible]   = useState(false);
    const [callSeconds,         setCallSeconds]        = useState(initialCallSeconds);
    const [summaryOpen,         setSummaryOpen]        = useState(false);
    const [toastMessage,        setToastMessage]       = useState("");

    // ── refs ──────────────────────────────────────────────────────────────────
    const callSessionRef          = useRef(null);
    const voiceActiveRef          = useRef(false);
    const handleSendVoiceRef      = useRef(null);
    const micStartRef             = useRef(null);
    const awaitingLeadCaptureRef  = useRef(false);
    const mutedRef                = useRef(false);
    const speakerEnabledRef       = useRef(true);
    const callInitializedRef      = useRef(false);
    const conversationIdRef       = useRef(null);
    const timerRef                = useRef(null);
    const bottomRef               = useRef(null);
    const inputRef                = useRef(null);
    const noSpeechRetries         = useRef(0);
    const prevMicListeningRef     = useRef(false);

    // ── auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // ── notify parent of message changes (for external persistence) ───────────
    useEffect(() => {
        if (onMessagesChange) onMessagesChange(messages);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── ref syncs ─────────────────────────────────────────────────────────────
    useEffect(() => { voiceActiveRef.current         = voiceActive;        }, [voiceActive]);
    useEffect(() => { awaitingLeadCaptureRef.current = awaitingLeadCapture;}, [awaitingLeadCapture]);
    useEffect(() => { mutedRef.current               = muted;              }, [muted]);
    useEffect(() => { speakerEnabledRef.current      = speakerEnabled;     }, [speakerEnabled]);

    // ── voice hooks ───────────────────────────────────────────────────────────
    const {
        listening: micListening,
        supported: micSupported,
        error:     micError,
        start:     micStart,
        stop:      micStop,
    } = useSpeechRecognition((transcript) => {
        if (voiceActiveRef.current && !mutedRef.current) {
            setVoicePhase("thinking");
            handleSendVoiceRef.current?.(transcript);
        } else if (!voiceActiveRef.current) {
            setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
    });

    useEffect(() => { micStartRef.current = micStart; }, [micStart]);

    // Bug 1 fix: handle mic stopping unexpectedly while voice loop expects listening
    useEffect(() => {
        if (micListening) {
            noSpeechRetries.current = 0;
            prevMicListeningRef.current = true;
            return;
        }
        if (!prevMicListeningRef.current) return;
        prevMicListeningRef.current = false;

        if (voicePhase !== "listening" || !voiceActiveRef.current || mutedRef.current) return;

        if (micError) {
            noSpeechRetries.current = 0;
            setVoicePhase(null);
        } else if (noSpeechRetries.current < 3) {
            noSpeechRetries.current += 1;
            micStartRef.current?.();
        } else {
            noSpeechRetries.current = 0;
            setVoicePhase(null);
        }
    }, [micListening, micError, voicePhase]);

    const { supported: ttsSupported } = useSpeechSynthesis();

    const navigate    = useNavigate();
    const canUseVoice = micSupported && ttsSupported;

    // ── helpers ───────────────────────────────────────────────────────────────
    const speakAndThen = (text, onDone) => {
        console.log("[speakAndThen] called. text length:", text.length, "| speechSynthesis exists:", !!window.speechSynthesis, "| pending:", window.speechSynthesis?.pending, "| speaking:", window.speechSynthesis?.speaking);
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.onend  = () => { console.log("[speakAndThen] onend fired — speech completed"); onDone(); };
        u.onerror = (e) => { console.log("[speakAndThen] onerror fired — error:", e.error); onDone(); };
        console.log("[speakAndThen] calling window.speechSynthesis.speak()");
        window.speechSynthesis.speak(u);
    };

    const conditionalSpeak = (text, onDone) => {
        console.log("[conditionalSpeak] called. speakerEnabledRef.current:", speakerEnabledRef.current);
        if (speakerEnabledRef.current) {
            speakAndThen(text, onDone);
        } else {
            console.log("[conditionalSpeak] speaker disabled — skipping TTS, calling onDone directly");
            onDone();
        }
    };

    const startListening = () => {
        setVoicePhase("listening");
        micStartRef.current?.();
    };

    // ── call init (mount) ─────────────────────────────────────────────────────
    useEffect(() => {
        console.log("[callInit] effect fired. callInitializedRef.current:", callInitializedRef.current);
        if (callInitializedRef.current) {
            console.log("[callInit] already initialized — returning early (StrictMode double-invoke or re-render)");
            return;
        }
        callInitializedRef.current = true;
        console.log("[callInit] initializing. greeting:", greeting);
        console.log("[callInit] canUseVoice:", canUseVoice, "| micSupported:", micSupported, "| ttsSupported:", ttsSupported);

        const now = new Date().toISOString();
        callSessionRef.current = {
            id:                 generateCallId(),
            businessContextId:  String(businessContextId),
            businessName,
            startedAt:          now,
            endedAt:            null,
            durationSeconds:    null,
            transcript:         [{ role: "assistant", text: greeting, timestamp: now }],
            intents:            [],
            lastIntent:         null,
            outcome:            null,
            escalated:          false,
            leadCaptured:       false,
            leadCapturedInline: false,
            lead:               null,
            leadData:           { name: null, email: null, phone: null },
        };

        if (!skipGreeting) {
            setMessages([{ role: "assistant", content: greeting }]);
        }

        if (canUseVoice) {
            console.log("[callInit] canUseVoice=true — starting voice flow");
            voiceActiveRef.current = true;
            setVoiceActive(true);
            if (skipGreeting) {
                // Resuming after refresh — skip TTS greeting, start listening directly
                console.log("[callInit] skipGreeting=true — resuming call without replay");
                setTimeout(() => {
                    if (voiceActiveRef.current && !mutedRef.current) startListening();
                }, 400);
            } else {
                setVoicePhase("speaking");
                conditionalSpeak(greeting, () => {
                    console.log("[callInit] greeting onDone — voiceActiveRef:", voiceActiveRef.current, "| mutedRef:", mutedRef.current);
                    if (voiceActiveRef.current && !mutedRef.current) startListening();
                });
            }
        } else {
            console.log("[callInit] canUseVoice=false — falling back to text input");
            setTextInputVisible(true);
        }

        timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);

        return () => {
            console.log("[callInit] cleanup running — cancelling speech and resetting voice");
            callInitializedRef.current = false;
            clearInterval(timerRef.current);
            voiceActiveRef.current = false;
            window.speechSynthesis.cancel();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const showErrorToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 4000);
    };

    // ── end call ──────────────────────────────────────────────────────────────
    const endCall = () => {
        clearInterval(timerRef.current);

        const endedAt = new Date().toISOString();
        const testResults = testMode ? {
            leadData:     callSessionRef.current?.leadData     ?? { name: null, email: null, phone: null },
            lastIntent:   callSessionRef.current?.lastIntent   ?? null,
            leadCaptured: callSessionRef.current?.leadCaptured ?? false,
        } : sendMessageOverride ? {
            conversationId:  conversationIdRef.current,
            durationSeconds: callSessionRef.current?.startedAt
                ? Math.round((new Date(endedAt) - new Date(callSessionRef.current.startedAt)) / 1000)
                : null,
            outcome: callSessionRef.current?.escalated    ? "ESCALATED"
                   : callSessionRef.current?.leadCaptured ? "LEAD_CAPTURED"
                   : "INFORMATION_ONLY",
            lastIntent:          callSessionRef.current?.lastIntent?.intent ?? null,
            startedAt:           callSessionRef.current?.startedAt          ?? null,
            lead:                callSessionRef.current?.lead               ?? null,
            callerMessageCount:  callSessionRef.current?.transcript
                ?.filter((t) => t.role === "caller").length ?? 0,
            leadCapturedInline:  callSessionRef.current?.leadCapturedInline ?? false,
        } : null;

        if (callSessionRef.current) {
            if (!testMode && !sendMessageOverride && conversationIdRef.current) {
                const endedAt = new Date().toISOString();
                const durationSeconds = Math.round(
                    (new Date(endedAt) - new Date(callSessionRef.current.startedAt)) / 1000
                );
                const outcome = callSessionRef.current.escalated
                    ? "ESCALATED"
                    : callSessionRef.current.leadCaptured
                    ? "LEAD_CAPTURED"
                    : "INFORMATION_ONLY";

                finalizeConversation(conversationIdRef.current, {
                    durationSeconds,
                    outcome,
                    lastIntent: callSessionRef.current.lastIntent?.intent ?? null,
                    startedAt:  callSessionRef.current.startedAt,
                    lead:       callSessionRef.current.lead ?? null,
                }).catch((err) => {
                    console.error("[AIConversationTester] Failed to save call history:", err);
                    showErrorToast("Call history could not be saved.");
                });
            }

            callSessionRef.current = null;
        }

        voiceActiveRef.current         = false;
        awaitingLeadCaptureRef.current = false;
        micStop();
        window.speechSynthesis.cancel();

        if (testMode || sendMessageOverride) {
            onCallEnd?.(testResults);
        } else {
            setSummaryOpen(true);
        }
    };

    // ── mute toggle ───────────────────────────────────────────────────────────
    const toggleMute = () => {
        const nowMuting = !muted;
        setMuted(nowMuting);
        mutedRef.current = nowMuting;
        if (nowMuting) {
            micStop();
            if (voicePhase === "listening") setVoicePhase(null);
        } else if (voiceActiveRef.current) {
            startListening();
        }
    };

    // ── speaker toggle ────────────────────────────────────────────────────────
    const toggleSpeaker = () => {
        const nowEnabled = !speakerEnabled;
        setSpeakerEnabled(nowEnabled);
        speakerEnabledRef.current = nowEnabled;
        if (!nowEnabled) window.speechSynthesis.cancel();
    };

    // ── send helper — override takes priority, then testMode, then authenticated ─
    const callApi = (content) => {
        if (sendMessageOverride) return sendMessageOverride(content, conversationIdRef.current);
        if (testMode)            return sendTestMessage(content);
        return sendMessageAuth(content, conversationIdRef.current, mode);
    };

    // ── voice send pipeline ───────────────────────────────────────────────────
    const handleSendVoice = async (text) => {
        const content = text.trim();
        if (!content) return;

        // Always write user message to transcript immediately — before any async guard
        const callerTs = new Date().toISOString();
        setMessages((prev) => [...prev, { role: "user", content }]);
        callSessionRef.current?.transcript.push({ role: "caller", text: content, timestamp: callerTs });

        if (!voiceActiveRef.current) return;
        setLoading(true);

        let aiText = "I apologize, I'm having trouble connecting right now. Please try again.";
        let intent = null;
        try {
            const res = await callApi(content);
            if (res.conversationId) conversationIdRef.current = res.conversationId;
            aiText = res.answer;
            intent = res.intent;
            if (testMode && res.leadData && callSessionRef.current) {
                const ld   = res.leadData;
                const curr = callSessionRef.current.leadData;
                callSessionRef.current.leadData = {
                    name:  curr.name  ?? ld.name  ?? null,
                    email: curr.email ?? ld.email ?? null,
                    phone: curr.phone ?? ld.phone ?? null,
                };
            }
            if (res.leadCaptured && callSessionRef.current) {
                callSessionRef.current.leadCapturedInline = true;
            }
        } catch {}

        const aiTs = new Date().toISOString();
        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        if (callSessionRef.current) {
            callSessionRef.current.transcript.push({ role: "assistant", text: aiText, timestamp: aiTs });
            if (intent) {
                const entry = {
                    intent:        intent.intent        ?? null,
                    confidence:    intent.confidence    ?? null,
                    requiresHuman: intent.requiresHuman ?? false,
                    timestamp:     aiTs,
                };
                callSessionRef.current.intents.push(entry);
                callSessionRef.current.lastIntent = entry;
                if (intent.lead) callSessionRef.current.lead = intent.lead;
            }
        }
        setLoading(false);

        if (!voiceActiveRef.current) return;

        setVoicePhase("speaking");
        conditionalSpeak(aiText, () => {
            if (!voiceActiveRef.current) return;

            if (intent?.requiresHuman) {
                const handoff = "I completely understand. Let me get you connected with someone from our team who can help directly.";
                setMessages((prev) => [...prev, { role: "assistant", content: handoff }]);
                if (callSessionRef.current) {
                    callSessionRef.current.escalated = true;
                    callSessionRef.current.transcript.push({ role: "assistant", text: handoff, timestamp: new Date().toISOString() });
                }
                setVoicePhase(null);
                conditionalSpeak(handoff, () => {
                    if (sendMessageOverride) {
                        endCall();
                    } else if (voiceActiveRef.current) {
                        setShowEscalation(true);
                    }
                });

            } else if (!testMode && LEAD_CAPTURE_INTENTS.has(intent?.intent) && !awaitingLeadCaptureRef.current) {
                awaitingLeadCaptureRef.current = true;
                setAwaitingLeadCapture(true);
                const followUp = "I'd love to help with that. Could I get your name and a good phone number or email so our team can follow up with you?";
                setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
                if (callSessionRef.current) {
                    callSessionRef.current.leadCaptured = true;
                    callSessionRef.current.transcript.push({ role: "assistant", text: followUp, timestamp: new Date().toISOString() });
                }
                setVoicePhase("speaking");
                conditionalSpeak(followUp, () => {
                    if (voiceActiveRef.current && !mutedRef.current) startListening();
                });

            } else {
                if (!mutedRef.current) startListening();
            }
        });
    };
    handleSendVoiceRef.current = handleSendVoice;

    // ── text send (fallback) ──────────────────────────────────────────────────
    const handleSend = async (text) => {
        const content = (typeof text === "string" ? text : question).trim();
        if (!content || loading) return;

        const callerTs = new Date().toISOString();
        setQuestion("");
        setMessages((prev) => [...prev, { role: "user", content }]);
        callSessionRef.current?.transcript.push({ role: "caller", text: content, timestamp: callerTs });
        setLoading(true);

        let aiText = "I apologize, I'm having trouble connecting right now. Please try again.";
        let intent = null;
        try {
            const res = await callApi(content);
            if (res.conversationId) conversationIdRef.current = res.conversationId;
            aiText = res.answer;
            intent = res.intent;
            if (testMode && res.leadData && callSessionRef.current) {
                const ld   = res.leadData;
                const curr = callSessionRef.current.leadData;
                callSessionRef.current.leadData = {
                    name:  curr.name  ?? ld.name  ?? null,
                    email: curr.email ?? ld.email ?? null,
                    phone: curr.phone ?? ld.phone ?? null,
                };
            }
            if (res.leadCaptured && callSessionRef.current) {
                callSessionRef.current.leadCapturedInline = true;
            }
        } catch {}

        const aiTs = new Date().toISOString();
        setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
        if (callSessionRef.current) {
            callSessionRef.current.transcript.push({ role: "assistant", text: aiText, timestamp: aiTs });
            if (intent) {
                const entry = {
                    intent:        intent.intent        ?? null,
                    confidence:    intent.confidence    ?? null,
                    requiresHuman: intent.requiresHuman ?? false,
                    timestamp:     aiTs,
                };
                callSessionRef.current.intents.push(entry);
                callSessionRef.current.lastIntent = entry;
                if (intent.lead) callSessionRef.current.lead = intent.lead;
            }
        }
        setLoading(false);

        // When a voice call is active, speak the response (same pipeline as handleSendVoice)
        if (voiceActiveRef.current) {
            setVoicePhase("speaking");
            conditionalSpeak(aiText, () => {
                if (!voiceActiveRef.current) return;

                if (intent?.requiresHuman) {
                    const handoff = "I completely understand. Let me get you connected with someone from our team who can help directly.";
                    setMessages((prev) => [...prev, { role: "assistant", content: handoff }]);
                    if (callSessionRef.current) {
                        callSessionRef.current.escalated = true;
                        callSessionRef.current.transcript.push({ role: "assistant", text: handoff, timestamp: new Date().toISOString() });
                    }
                    setVoicePhase(null);
                    conditionalSpeak(handoff, () => {
                        if (sendMessageOverride) endCall();
                        else if (voiceActiveRef.current) setShowEscalation(true);
                    });
                } else if (!testMode && LEAD_CAPTURE_INTENTS.has(intent?.intent) && !awaitingLeadCaptureRef.current) {
                    awaitingLeadCaptureRef.current = true;
                    setAwaitingLeadCapture(true);
                    const followUp = "I'd love to help with that. Could I get your name and a good phone number or email so our team can follow up with you?";
                    setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
                    if (callSessionRef.current) {
                        callSessionRef.current.leadCaptured = true;
                        callSessionRef.current.transcript.push({ role: "assistant", text: followUp, timestamp: new Date().toISOString() });
                    }
                    setVoicePhase("speaking");
                    conditionalSpeak(followUp, () => {
                        if (voiceActiveRef.current && !mutedRef.current) startListening();
                    });
                } else {
                    if (!mutedRef.current) startListening();
                }
            });
            return;
        }

        // Text-only path (no active voice call)
        if (intent?.requiresHuman) {
            const handoff = "I completely understand. Let me get you connected with someone from our team who can help directly.";
            setMessages((prev) => [...prev, { role: "assistant", content: handoff }]);
            if (callSessionRef.current) {
                callSessionRef.current.escalated = true;
                callSessionRef.current.transcript.push({ role: "assistant", text: handoff, timestamp: new Date().toISOString() });
            }
            if (sendMessageOverride) {
                endCall();
            } else {
                setShowEscalation(true);
            }
        } else if (!testMode && LEAD_CAPTURE_INTENTS.has(intent?.intent) && !awaitingLeadCaptureRef.current) {
            awaitingLeadCaptureRef.current = true;
            setAwaitingLeadCapture(true);
            const followUp = "I'd love to help with that. Could I get your name and a good phone number or email so our team can follow up with you?";
            setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
            if (callSessionRef.current) {
                callSessionRef.current.leadCaptured = true;
                callSessionRef.current.transcript.push({ role: "assistant", text: followUp, timestamp: new Date().toISOString() });
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // ── status config ─────────────────────────────────────────────────────────
    const status = muted
        ? { label: "Muted",        dot: "bg-gray-400",                  text: "text-gray-500 dark:text-gray-400" }
        : voicePhase === "listening"
        ? { label: "Listening...", dot: "bg-green-500 animate-pulse",   text: "text-green-600 dark:text-green-400" }
        : voicePhase === "thinking" || loading
        ? { label: "Thinking...",  dot: "bg-yellow-500 animate-pulse",  text: "text-yellow-600 dark:text-yellow-400" }
        : voicePhase === "speaking"
        ? { label: "Speaking...",  dot: "bg-blue-500 animate-pulse",    text: "text-blue-500 dark:text-blue-400" }
        : { label: "Connected",    dot: "bg-green-500",                 text: "text-green-600 dark:text-green-400" };

    // ── mode detection ────────────────────────────────────────────────────────
    const isDemoMode   = !!sendMessageOverride && !testMode && !portalMode;
    const isPortalMode = !!sendMessageOverride && !testMode && !!portalMode;

    // ── DEMO MODE: dedicated layout ───────────────────────────────────────────
    if (isDemoMode) {
        return (
            <>
                <DemoCallLayout
                    messages={messages}
                    loading={loading}
                    voicePhase={voicePhase}
                    muted={muted}
                    speakerEnabled={speakerEnabled}
                    callSeconds={callSeconds}
                    businessName={businessName}
                    agentName={agentName}
                    showEscalation={showEscalation}
                    question={question}
                    setQuestion={setQuestion}
                    handleSend={handleSend}
                    toggleMute={toggleMute}
                    toggleSpeaker={toggleSpeaker}
                    endCall={endCall}
                    micError={micError}
                    bottomRef={bottomRef}
                    inputRef={inputRef}
                    onBack={onBack}
                />
                <Toast message={toastMessage} />
            </>
        );
    }

    // ── PORTAL MODE: customer call layout ─────────────────────────────────────
    if (isPortalMode) {
        return (
            <>
                <CustomerCallLayout
                    messages={messages}
                    loading={loading}
                    voicePhase={voicePhase}
                    muted={muted}
                    speakerEnabled={speakerEnabled}
                    callSeconds={callSeconds}
                    businessName={businessName}
                    agentName={agentName}
                    status={status}
                    showEscalation={showEscalation}
                    question={question}
                    setQuestion={setQuestion}
                    handleSend={handleSend}
                    handleKeyDown={handleKeyDown}
                    toggleMute={toggleMute}
                    toggleSpeaker={toggleSpeaker}
                    endCall={endCall}
                    canUseVoice={canUseVoice}
                    micError={micError}
                    bottomRef={bottomRef}
                    inputRef={inputRef}
                    businessContextUrl={businessContextUrl}
                />
                <Toast message={toastMessage} />
            </>
        );
    }

    // ── AUTHENTICATED / TEST MODE: original layout (unchanged) ───────────────
    return (
        <div className={`flex flex-col ${compact ? "" : "h-full "}bg-gray-50 dark:bg-gray-950`}>

            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <header className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow shadow-blue-200 dark:shadow-blue-900/40">
                                <span className="text-sm font-bold text-white">A</span>
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${status.dot}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                                {businessName || "Receptionist"}
                            </p>
                            <p className="text-xs leading-tight flex items-center gap-1.5">
                                <span className={`font-semibold ${status.text}`}>{status.label}</span>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className="text-gray-400 dark:text-gray-500 font-mono">{formatTimer(callSeconds)}</span>
                                {testMode && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-700">·</span>
                                        <span className="text-xs font-semibold text-purple-500 dark:text-purple-400">Test</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-600 shrink-0 hidden sm:block">
                        {agentName}
                    </p>
                </div>
            </header>

            {/* ── TRANSCRIPT ────────────────────────────────────────────────── */}
            <div className={`${compact ? "overflow-y-auto max-h-[40vh]" : "flex-1 overflow-y-auto"} px-4 sm:px-6 py-5`}>
                <div className="max-w-2xl mx-auto space-y-4">

                    {testMode && (
                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-full">
                                Test mode — nothing is saved
                            </span>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5 ${
                                msg.role === "assistant"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow shadow-blue-200 dark:shadow-blue-900/40"
                                    : "bg-gray-200 dark:bg-gray-700"
                            }`}>
                                {msg.role === "assistant"
                                    ? <span className="text-[11px] font-bold text-white">A</span>
                                    : <User size={12} className="text-gray-500 dark:text-gray-400" />}
                            </div>

                            <div className={`max-w-[78%] sm:max-w-[72%] px-4 py-3 text-sm leading-relaxed ${
                                msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700"
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-end gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow shadow-blue-200 dark:shadow-blue-900/40">
                                <span className="text-[11px] font-bold text-white">A</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}

                    {showEscalation && (
                        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                                <Phone size={15} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                    Connecting to a human agent
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                                    Our team will be in touch shortly.
                                    {businessContextUrl && (
                                        <> You can also reach us at{" "}
                                            <span className="font-medium">{businessContextUrl}</span>.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            {/* ── CONTROLS ──────────────────────────────────────────────────── */}
            <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-5">
                <div className="max-w-2xl mx-auto">

                    {textInputVisible && !showEscalation && (
                        <div className="mb-4 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                disabled={loading}
                                autoFocus
                                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:opacity-50 min-w-0"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={loading || !question.trim()}
                                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-8">

                        <div className="flex flex-col items-center gap-1.5">
                            <button
                                onClick={toggleMute}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                    muted
                                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-900"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                            >
                                {muted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                {muted ? "Unmute" : "Mute"}
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                            <button
                                onClick={endCall}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-200 dark:shadow-red-900/40"
                                aria-label="End call"
                            >
                                <PhoneOff size={24} className="text-white" />
                            </button>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">End Call</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                            <button
                                onClick={toggleSpeaker}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                    speakerEnabled
                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                                }`}
                                aria-label={speakerEnabled ? "Turn off speaker" : "Turn on speaker"}
                            >
                                {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Speaker</span>
                        </div>
                    </div>

                    {canUseVoice && !showEscalation && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => setTextInputVisible((v) => !v)}
                                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                {textInputVisible
                                    ? <><ChevronDown size={12} /> Hide keyboard</>
                                    : <><ChevronUp   size={12} /> Type instead</>
                                }
                            </button>
                        </div>
                    )}

                    {micError && (
                        <p className="text-center text-xs mt-2 text-red-400">{micError}</p>
                    )}
                </div>
            </div>

            {/* Thank-you modal — admin receptionist mode only (not portal, not test) */}
            {!testMode && !sendMessageOverride && (
                <LeadSummaryModal
                    open={summaryOpen}
                    businessName={businessName}
                    source="VOICE"
                    agentName={agentName}
                    onClose={() => {
                        setSummaryOpen(false);
                        if (onCallEnd) { onCallEnd(); } else { navigate("/customer"); }
                    }}
                />
            )}

            <Toast message={toastMessage} />
        </div>
    );
}
