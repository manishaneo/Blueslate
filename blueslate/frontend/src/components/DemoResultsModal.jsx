import { useState } from "react";
import { UserCheck, AlertTriangle, Info, ArrowRight, X, User, Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";

const formatDuration = (s) => {
    if (!s && s !== 0) return "—";
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const inputCls =
    "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition";

const OUTCOMES = {
    LEAD_CAPTURED: {
        icon:       UserCheck,
        headline:   "Lead Captured",
        subtext:    "Your AI successfully collected customer information during the demo.",
        heroBg:     "bg-gradient-to-b from-green-950/60 to-[#0d1420]",
        heroBorder: "border-green-800/50",
        badgeBg:    "bg-green-900/60 border-green-700/50",
        badgeText:  "text-green-400",
        iconColor:  "text-green-400",
        ringColor:  "ring-green-500/20",
        glow:       "shadow-green-500/10",
    },
    ESCALATED: {
        icon:       AlertTriangle,
        headline:   "Human Escalation",
        subtext:    "The customer requested assistance from a human team member.",
        heroBg:     "bg-gradient-to-b from-amber-950/60 to-[#0d1420]",
        heroBorder: "border-amber-800/50",
        badgeBg:    "bg-amber-900/60 border-amber-700/50",
        badgeText:  "text-amber-400",
        iconColor:  "text-amber-400",
        ringColor:  "ring-amber-500/20",
        glow:       "shadow-amber-500/10",
    },
    INFORMATION_ONLY: {
        icon:       Info,
        headline:   "Information Conversation",
        subtext:    "The AI answered questions without collecting contact information.",
        heroBg:     "bg-gradient-to-b from-blue-950/60 to-[#0d1420]",
        heroBorder: "border-blue-800/50",
        badgeBg:    "bg-blue-900/60 border-blue-700/50",
        badgeText:  "text-blue-400",
        iconColor:  "text-blue-400",
        ringColor:  "ring-blue-500/20",
        glow:       "shadow-blue-500/10",
    },
};

export default function DemoResultsModal({ open, callResults, onStartOnboarding, onExit }) {
    const [followUp, setFollowUp] = useState({
        name:  callResults?.lead?.name  || "",
        email: callResults?.lead?.email || "",
        phone: callResults?.lead?.phone || "",
        notes: "",
    });

    if (!open) return null;

    const set = (field) => (e) =>
        setFollowUp((prev) => ({ ...prev, [field]: e.target.value }));

    const hasLead = !!(followUp.name || followUp.email || followUp.phone);

    const outcome    = callResults?.outcome ?? "INFORMATION_ONLY";
    const outcomeKey = OUTCOMES[outcome] ? outcome : "INFORMATION_ONLY";
    const cfg        = OUTCOMES[outcomeKey];
    const OutcomeIcon = cfg.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full sm:max-w-lg bg-[#0d1420] border border-white/10 sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">

                {/* ── OUTCOME HERO ─────────────────────────────────────────── */}
                <div className={`shrink-0 relative px-6 pt-5 pb-6 border-b ${cfg.heroBorder} ${cfg.heroBg}`}>

                    {/* Close button */}
                    <button
                        onClick={onExit}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-all"
                        aria-label="Exit demo"
                    >
                        <X size={16} />
                    </button>

                    {/* Outcome badge */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold mb-4 ${cfg.badgeBg} ${cfg.badgeText}`}>
                        <OutcomeIcon size={11} />
                        {cfg.headline}
                    </div>

                    {/* Icon + headline */}
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ring-4 ${cfg.ringColor} shadow-xl ${cfg.glow}`}>
                            <OutcomeIcon size={26} className={cfg.iconColor} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">
                                {cfg.headline}
                            </h2>
                            <p className="text-sm text-gray-400 mt-0.5 leading-snug">
                                {cfg.subtext}
                            </p>
                        </div>
                    </div>

                    {/* Duration / Messages row */}
                    <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/8">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Duration</p>
                            <p className="text-lg font-black text-white font-mono">
                                {formatDuration(callResults?.durationSeconds)}
                            </p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Messages</p>
                            <p className="text-lg font-black text-white">
                                {callResults?.callerMessageCount ?? "—"}
                            </p>
                        </div>
                        {callResults?.lastIntent && outcomeKey !== "ESCALATED" && (
                            <>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Intent</p>
                                    <p className="text-xs font-semibold text-gray-300 truncate capitalize">
                                        {callResults.lastIntent.replace(/_/g, " ")}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── ESCALATION REASON PANEL ──────────────────────────────── */}
                {outcomeKey === "ESCALATED" && (
                    <div className="shrink-0 mx-5 mt-4 flex items-start gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
                        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-300">Escalation Reason</p>
                            <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
                                {callResults?.lastIntent
                                    ? callResults.lastIntent.replace(/_/g, " ")
                                    : "Customer requested human assistance"}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── SCROLLABLE BODY ───────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* ── LEAD CARD ──────────────────────────────────────────── */}
                    <div className={`rounded-xl border overflow-hidden ${
                        hasLead
                            ? "border-green-800/50 bg-green-950/20"
                            : "border-white/10 bg-white/3"
                    }`}>
                        {/* Card header */}
                        <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${
                            hasLead
                                ? "border-green-800/40 bg-green-900/20"
                                : "border-white/8 bg-white/3"
                        }`}>
                            {hasLead
                                ? <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                                : <User         size={15} className="text-gray-500 shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${hasLead ? "text-green-300" : "text-gray-300"}`}>
                                    {hasLead ? "Captured Information" : "Contact Information"}
                                </p>
                                {!hasLead && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        No contact information was captured during the conversation.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="px-4 py-4 space-y-2.5">
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={followUp.name}
                                    onChange={set("name")}
                                    placeholder="Caller name"
                                    className={inputCls}
                                />
                            </div>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="email"
                                    value={followUp.email}
                                    onChange={set("email")}
                                    placeholder="Email address"
                                    className={inputCls}
                                />
                            </div>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="tel"
                                    value={followUp.phone}
                                    onChange={set("phone")}
                                    placeholder="Phone number"
                                    className={inputCls}
                                />
                            </div>
                            <div className="relative">
                                <MessageSquare size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                                <textarea
                                    value={followUp.notes}
                                    onChange={set("notes")}
                                    placeholder="Optional notes for our team..."
                                    rows={2}
                                    className={`${inputCls} pl-9 resize-none`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STICKY CTA SECTION ────────────────────────────────────── */}
                <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/8 bg-[#0d1420] space-y-2">
                    <button
                        onClick={() => onStartOnboarding(followUp)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25"
                    >
                        Set Up Your AI Receptionist
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={onExit}
                        className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Exit Demo
                    </button>
                </div>
            </div>
        </div>
    );
}
