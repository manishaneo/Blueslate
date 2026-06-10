import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage as sendMessageAuth, sendTestMessage, finalizeConversation } from "../services/chatService";
import { useSpeechRecognition, useSpeechSynthesis } from "../hooks/useVoice";
import {
    Mic, MicOff, PhoneOff, Volume2, VolumeX, User, Phone,
    ChevronDown, ChevronUp, AlertCircle, Keyboard, LayoutDashboard,
} from "lucide-react";
import LeadSummaryModal from "./LeadSummaryModal";

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

// ── Demo-mode avatar ring styles ──────────────────────────────────────────────
function AvatarRing({ voicePhase, loading, muted, size = 80 }) {
    const ringClass =
        muted                                  ? "ring-4 ring-gray-400/40"
      : voicePhase === "listening"             ? "ring-4 ring-green-400/70 animate-pulse"
      : voicePhase === "speaking"              ? "ring-4 ring-blue-400/70 animate-pulse"
      : voicePhase === "thinking" || loading   ? "ring-4 ring-yellow-400/60 animate-pulse"
      :                                          "ring-4 ring-green-400/50";

    return (
        <div
            className={`rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all duration-300 ${ringClass}`}
            style={{ width: size, height: size }}
        >
            <span className="font-black text-white" style={{ fontSize: size * 0.35 }}>A</span>
        </div>
    );
}

// ── Demo-mode status label ─────────────────────────────────────────────────────
function StatusLabel({ status }) {
    return (
        <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
            <span className={`text-sm font-semibold ${status.text}`}>{status.label}</span>
        </div>
    );
}

// ── Demo call layout (public demo mode only) ───────────────────────────────────
function DemoCallLayout({
    messages, loading, voicePhase, muted, speakerEnabled,
    callSeconds, businessName, agentName, status, showEscalation,
    question, setQuestion, handleSend, handleKeyDown,
    toggleMute, toggleSpeaker, endCall,
    canUseVoice, micError, bottomRef, inputRef,
}) {
    return (
        <div className="flex flex-col h-full min-h-screen bg-[#060c17]">

            {/* ── TOP BRANDING STRIP ────────────────────────────────────────── */}
            <div className="shrink-0 h-11 flex items-center justify-between px-4 sm:px-6 bg-white/4 border-b border-white/8 backdrop-blur-sm">
                <span className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">
                    Live Demo
                </span>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                        <LayoutDashboard size={9} className="text-white" />
                    </div>
                    <span className="text-[13px] font-bold text-white tracking-tight">Blueslate</span>
                </div>
                <span className="text-[11px] font-medium text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                    {businessName}
                </span>
            </div>

            {/* ── MAIN BODY ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT: AI IDENTITY PANEL (desktop only) ─────────────────── */}
                <div className="hidden lg:flex shrink-0 w-[280px] flex-col items-center justify-center gap-0 px-6 py-10 border-r border-white/8 bg-white/2">

                    {/* Avatar */}
                    <AvatarRing voicePhase={voicePhase} loading={loading} muted={muted} size={80} />

                    {/* Agent name */}
                    <p className="mt-5 text-lg font-bold text-white">{agentName}</p>
                    <p className="text-xs text-gray-500 mb-1">AI Receptionist</p>

                    {/* Status */}
                    <StatusLabel status={status} />

                    {/* Divider */}
                    <div className="w-12 h-px bg-white/10 my-6" />

                    {/* Timer */}
                    <p className="text-3xl font-black text-white font-mono tracking-tight">
                        {formatTimer(callSeconds)}
                    </p>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                        Duration
                    </p>
                </div>

                {/* ── RIGHT: TRANSCRIPT PANEL ────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Mobile-only compact header */}
                    <div className="lg:hidden shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/3">
                        <AvatarRing voicePhase={voicePhase} loading={loading} muted={muted} size={36} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{agentName}</p>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
                                <span className="text-gray-600 text-xs">·</span>
                                <span className="text-xs font-mono text-gray-400">{formatTimer(callSeconds)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transcript scroll area */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                        <div className="max-w-2xl mx-auto space-y-5">

                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex items-end gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 ${
                                        msg.role === "assistant"
                                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-900/40"
                                            : "bg-white/10"
                                    }`}>
                                        {msg.role === "assistant"
                                            ? <span className="text-[11px] font-bold text-white">A</span>
                                            : <User size={13} className="text-gray-400" />
                                        }
                                    </div>

                                    {/* Bubble */}
                                    <div className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 text-sm leading-relaxed rounded-2xl shadow-sm ${
                                        msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-br-sm"
                                            : "bg-white/8 text-gray-100 border border-white/10 rounded-bl-sm"
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {loading && (
                                <div className="flex items-end gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-900/40">
                                        <span className="text-[11px] font-bold text-white">A</span>
                                    </div>
                                    <div className="bg-white/8 border border-white/10 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}

                            {/* Escalation notice */}
                            {showEscalation && (
                                <div className="flex items-start gap-3 bg-white/6 border border-white/12 rounded-2xl px-4 py-4">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <Phone size={14} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            Connecting to a human agent
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                            Our team will be in touch shortly.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>
                    </div>

                    {/* Text input — always visible in demo mode */}
                    {!showEscalation && (
                        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-white/8 bg-white/3">
                            <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white/6 border border-white/12 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/40 transition-all">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={canUseVoice ? "Speak or type a message..." : "Type a message..."}
                                    disabled={loading}
                                    className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none disabled:opacity-40 min-w-0"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={loading || !question.trim()}
                                    className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                                    aria-label="Send message"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </div>
                            {micError && (
                                <p className="text-center text-xs mt-2 text-red-400">{micError}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONTROLS BAR ──────────────────────────────────────────────── */}
            <div className="shrink-0 bg-black/60 backdrop-blur-md border-t border-white/8 px-4 sm:px-6 py-4">
                <div className="max-w-xs mx-auto flex items-center justify-center gap-8">

                    {/* Mute */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                muted
                                    ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/40"
                                    : "bg-white/10 text-gray-300 hover:bg-white/15"
                            }`}
                            aria-label={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <span className="text-[10px] font-medium text-gray-500">
                            {muted ? "Unmute" : "Mute"}
                        </span>
                    </div>

                    {/* End Call */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={endCall}
                            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
                            aria-label="End call"
                        >
                            <PhoneOff size={22} className="text-white" />
                        </button>
                        <span className="text-[10px] font-medium text-gray-500">End Call</span>
                    </div>

                    {/* Speaker */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleSpeaker}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                speakerEnabled
                                    ? "bg-white/10 text-gray-300 hover:bg-white/15"
                                    : "bg-white/6 text-gray-600"
                            }`}
                            aria-label={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
                        >
                            {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                        <span className="text-[10px] font-medium text-gray-500">Speaker</span>
                    </div>
                </div>

                {/* Keyboard hint — only shown when voice is available */}
                {canUseVoice && (
                    <div className="flex justify-center mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                            <Keyboard size={11} />
                            <span>Keyboard input above</span>
                        </div>
                    </div>
                )}
            </div>
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
}) {
    const initial = (agentName || "A").charAt(0).toUpperCase();

    return (
        <div className="flex flex-col h-full min-h-screen bg-white dark:bg-gray-950">

            {/* Header */}
            <header className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3.5">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50">
                                <span className="text-sm font-bold text-white">{initial}</span>
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${status.dot}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                                {businessName || agentName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-xs font-semibold ${status.text}`}>{status.label}</span>
                                <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
                                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{formatTimer(callSeconds)}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-600 shrink-0 hidden sm:block">
                        {agentName} · Virtual Receptionist
                    </p>
                </div>
            </header>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                <div className="max-w-xl mx-auto space-y-4">

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 ${
                                msg.role === "assistant"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                                    : "bg-gray-200 dark:bg-gray-700"
                            }`}>
                                {msg.role === "assistant"
                                    ? <span className="text-[11px] font-bold text-white">{initial}</span>
                                    : <User size={13} className="text-gray-500 dark:text-gray-400" />}
                            </div>
                            <div className={`max-w-[78%] sm:max-w-[72%] px-4 py-3 text-sm leading-relaxed ${
                                msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm border border-gray-200 dark:border-gray-700"
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-end gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200 dark:shadow-blue-900/40">
                                <span className="text-[11px] font-bold text-white">{initial}</span>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}

                    {showEscalation && (
                        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl px-4 py-4">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                <Phone size={15} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                    Connecting you to our team
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                                    Someone will follow up with you shortly.
                                </p>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Text input — always visible */}
            {!showEscalation && (
                <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 bg-white dark:bg-gray-900">
                    <div className="max-w-xl mx-auto flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/40 transition-all">
                        <input
                            ref={inputRef}
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={canUseVoice ? "Speak or type a message..." : "Type a message..."}
                            disabled={loading}
                            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none disabled:opacity-40 min-w-0"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !question.trim()}
                            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                            aria-label="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </button>
                    </div>
                    {micError && (
                        <p className="text-center text-xs mt-2 text-red-500 dark:text-red-400">{micError}</p>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
                <div className="max-w-xs mx-auto flex items-center justify-center gap-8">

                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                muted
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-900"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            aria-label={muted ? "Unmute" : "Mute"}
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
                            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-200 dark:shadow-red-900/40"
                            aria-label="End call"
                        >
                            <PhoneOff size={22} className="text-white" />
                        </button>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">End Call</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleSpeaker}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                speakerEnabled
                                    ? "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700"
                            }`}
                            aria-label={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
                        >
                            {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Speaker</span>
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
}) {
    // ── state ─────────────────────────────────────────────────────────────────
    const [messages,            setMessages]           = useState([]);
    const [loading,             setLoading]            = useState(false);
    const [voiceActive,         setVoiceActive]        = useState(false);
    const [voicePhase,          setVoicePhase]         = useState(null);
    const [question,            setQuestion]           = useState("");
    const [showEscalation,      setShowEscalation]     = useState(false);
    const [awaitingLeadCapture, setAwaitingLeadCapture]= useState(false);
    const [muted,               setMuted]              = useState(false);
    const [speakerEnabled,      setSpeakerEnabled]     = useState(true);
    const [textInputVisible,    setTextInputVisible]   = useState(false);
    const [callSeconds,         setCallSeconds]        = useState(0);
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

        setMessages([{ role: "assistant", content: greeting }]);

        if (canUseVoice) {
            console.log("[callInit] canUseVoice=true — starting voice flow");
            voiceActiveRef.current = true;
            setVoiceActive(true);
            setVoicePhase("speaking");
            conditionalSpeak(greeting, () => {
                console.log("[callInit] greeting onDone — voiceActiveRef:", voiceActiveRef.current, "| mutedRef:", mutedRef.current);
                if (voiceActiveRef.current && !mutedRef.current) startListening();
            });
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
        if (!content || !voiceActiveRef.current) return;

        const callerTs = new Date().toISOString();
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
                                {businessName || "AI Receptionist"}
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
