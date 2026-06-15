import { ArrowRight, CheckCircle2, User, Mail, Phone, X, Clock, Database, Zap, AlertCircle, RefreshCw } from "lucide-react";

const formatDuration = (s) => {
    if (!s && s !== 0) return "—";
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const LEAD_TIMELINE = [
    { label: "New Lead",     detail: "Receptionist answered immediately" },
    { label: "Qualified",    detail: "Visitor expressed interest" },
    { label: "Saved To CRM", detail: "Available in your leads dashboard" },
];

export default function DemoResultsModal({ open, callResults, businessName, onStartOnboarding, onExit, onTryAgain }) {
    if (!open) return null;

    const lead  = callResults?.lead ?? {};
    const name  = lead.name  || "";
    const email = lead.email || "";
    const phone = lead.phone || "";
    const hasLead = !!(name || email || phone);

    const handleSetup = () => onStartOnboarding({ name, email, phone, notes: "" });

    // ── NO LEAD CASE ──────────────────────────────────────────────────────────
    if (!hasLead) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full sm:max-w-lg bg-[#0d1420] border border-white/10 sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

                    {/* Hero */}
                    <div className="shrink-0 relative px-6 pt-5 pb-6 border-b border-white/8">
                        <button
                            onClick={onExit}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-all"
                            aria-label="Exit demo"
                        >
                            <X size={16} />
                        </button>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-gray-800/60 border-gray-700/50 text-gray-400 text-[11px] font-bold mb-4">
                            <AlertCircle size={11} />
                            No Lead Captured
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <AlertCircle size={26} className="text-gray-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-tight">No Lead Captured</h2>
                                <p className="text-sm text-gray-400 mt-0.5 leading-snug">
                                    The visitor completed the conversation but did not submit contact information.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/8">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Duration</p>
                                <p className="text-lg font-black text-white font-mono">
                                    {formatDuration(callResults?.durationSeconds)}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Lead Status</p>
                                <p className="text-sm font-bold text-gray-600">Not Captured</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto portal-scrollbar-dark px-5 py-4">
                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-4">
                            <p className="text-sm text-gray-400 leading-relaxed">
                                The AI receptionist answered the call, but no contact information was collected.
                                In a real deployment, the receptionist asks follow-up questions specifically
                                designed to capture qualified leads for your business.
                            </p>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/8 bg-[#0d1420] space-y-2">
                        {onTryAgain && (
                            <button
                                onClick={onTryAgain}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25"
                            >
                                <RefreshCw size={15} />
                                Try Again
                            </button>
                        )}
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

    // ── LEAD CAPTURED CASE ────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full sm:max-w-lg bg-[#0d1420] border border-white/10 sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

                {/* Hero */}
                <div className="shrink-0 relative px-6 pt-5 pb-6 border-b border-green-800/40 bg-gradient-to-b from-green-950/60 to-[#0d1420]">
                    <button
                        onClick={onExit}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 transition-all"
                        aria-label="Exit demo"
                    >
                        <X size={16} />
                    </button>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-green-900/60 border-green-700/50 text-green-400 text-[11px] font-bold mb-4">
                        <CheckCircle2 size={11} />
                        Lead Captured Successfully
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ring-4 ring-green-500/20 shadow-xl shadow-green-500/10">
                            <CheckCircle2 size={26} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">
                                Lead Captured Successfully
                            </h2>
                            <p className="text-sm text-gray-400 mt-0.5 leading-snug">
                                {businessName
                                    ? `A new contact was saved to ${businessName}'s CRM.`
                                    : "A new contact was saved to your CRM."}
                            </p>
                        </div>
                    </div>

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
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/60 border border-green-700/50 text-green-400 text-[10px] font-bold">
                                <Zap size={9} />
                                New
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-700/50 text-blue-400 text-[10px] font-bold">
                                <Database size={9} />
                                Saved to CRM
                            </span>
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto portal-scrollbar-dark px-5 py-4 space-y-4">

                    {/* Lead info card */}
                    <div className="rounded-xl border border-green-800/50 bg-green-950/20 overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-green-800/40 bg-green-900/20">
                            <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                            <p className="text-sm font-bold text-green-300">Captured Contact</p>
                        </div>
                        <div className="px-4 py-4 space-y-2.5">
                            <div className="flex items-center gap-3">
                                <User size={13} className="text-gray-500 shrink-0" />
                                <span className={`text-sm ${name ? "text-gray-200" : "text-gray-600 italic"}`}>
                                    {name || "Not provided"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={13} className="text-gray-500 shrink-0" />
                                <span className={`text-sm ${email ? "text-gray-200" : "text-gray-600 italic"}`}>
                                    {email || "Not provided"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={13} className="text-gray-500 shrink-0" />
                                <span className={`text-sm ${phone ? "text-gray-200" : "text-gray-600 italic"}`}>
                                    {phone || "Not provided"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Lead timeline */}
                    <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 bg-white/3">
                            <Clock size={15} className="text-gray-500 shrink-0" />
                            <p className="text-sm font-bold text-gray-300">Lead Timeline</p>
                        </div>
                        <div className="px-4 py-4">
                            <div className="relative">
                                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                                <div className="space-y-4">
                                    {LEAD_TIMELINE.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 relative">
                                            <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 border border-green-400/50 shrink-0 mt-0.5 z-10" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-200 leading-tight">{item.label}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/8 bg-[#0d1420] space-y-2">
                    <button
                        onClick={handleSetup}
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
