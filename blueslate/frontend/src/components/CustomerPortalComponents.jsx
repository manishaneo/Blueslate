/**
 * Shared components used by CustomerChatPage and CustomerCallPage.
 * Keeping them in one file avoids duplication across the two portal pages.
 */
import { useState } from "react";
import { CheckCircle2, Loader2, PhoneCall, Users } from "lucide-react";

// ── Wordmark ──────────────────────────────────────────────────────────────────

export function Wordmark() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50 shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="text-white w-[18px] h-[18px]">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
            </div>
            <div>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Blueslate</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">Customer Portal</p>
            </div>
        </div>
    );
}

// ── Lead capture form ─────────────────────────────────────────────────────────

export function LeadCaptureForm({ businessName, onSubmit, onSkip, loading, error }) {
    const [name,            setName]            = useState("");
    const [email,           setEmail]           = useState("");
    const [phone,           setPhone]           = useState("");
    const [notes,           setNotes]           = useState("");
    const [validationError, setValidationError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) { setValidationError("Please enter your name."); return; }
        if (!email.trim() && !phone.trim()) { setValidationError("Please enter an email address or phone number."); return; }
        setValidationError("");
        onSubmit({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, notes: notes.trim() || null });
    };

    const inputClass =
        "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm " +
        "text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 " +
        "bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 " +
        "focus:border-transparent transition disabled:opacity-50";

    return (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto portal-scrollbar">
                <div className="px-7 pt-7 pb-5">
                    <Wordmark />
                    <div className="mt-5">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Stay in touch</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                            Leave your details and {businessName || "the team"} will follow up with you.
                        </p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-3">
                    <input type="text"  placeholder="Name"         value={name}  onChange={(e) => { setName(e.target.value);  setValidationError(""); }} disabled={loading} className={inputClass} />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => { setEmail(e.target.value); setValidationError(""); }} disabled={loading} className={inputClass} />
                    <input type="tel"   placeholder="Phone number"  value={phone} onChange={(e) => { setPhone(e.target.value); setValidationError(""); }} disabled={loading} className={inputClass} />
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">How can we help you?</label>
                        <textarea
                            placeholder="Optional — describe what you need help with"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading}
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                    </div>
                    {(validationError || error) && (
                        <p className="text-xs text-red-600 dark:text-red-400">{validationError || error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2 mt-1"
                    >
                        {loading ? <><Loader2 size={15} className="animate-spin" />Saving…</> : "Submit"}
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        disabled={loading}
                        className="w-full py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                        Skip
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Follow-up prompt — shown before lead form when conversation ends ──────────
// mode="call" | "chat"
export function FollowUpPrompt({ businessName, mode = "call", onYes, onNo }) {
    return (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 px-7 py-8">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
                        <Users size={22} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                        Would you like a follow-up?
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                        Would you like someone from{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                            {businessName || "our team"}
                        </span>{" "}
                        to follow up with you?
                    </p>
                </div>
                <div className="mt-6 flex flex-col gap-2.5">
                    <button
                        onClick={onYes}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        Yes, follow up please
                    </button>
                    <button
                        onClick={onNo}
                        className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        No thanks
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Post-conversation outcome overlay (shared by call + chat) ─────────────────
// mode="call" shows call-specific copy and the "Call again" button.
// mode="chat" shows chat-specific copy; no duration, no "Call again".

export function PostConvOverlay({
    mode = "call",
    businessName,
    website,
    thankYouVariant,
    outcome,
    durationSeconds,
    capturedLeadData,
    onLeaveDetails,
    onRetry,
    onDone,
}) {
    const isSubmitted  = thankYouVariant === "submitted";
    const hasRealLead  = !!(capturedLeadData?.name || capturedLeadData?.email || capturedLeadData?.phone);
    // inline = lead captured during conversation (not via post-conv form), only if real data exists
    const isInline     = outcome === "LEAD_CAPTURED" && !isSubmitted && !thankYouVariant && hasRealLead;
    const isSkipped    = thankYouVariant === "skipped";
    const isEscalated  = outcome === "ESCALATED" && !isSubmitted && !isSkipped;

    const durationLabel = durationSeconds != null && mode === "call"
        ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`
        : null;

    const endedLabel = mode === "call" ? "Call ended" : "Chat ended";
    const thanksBody = mode === "call"
        ? `Thank you for calling ${businessName}. We hope we were able to help.`
        : `Thank you for reaching out to ${businessName}. We hope we were able to help.`;
    const retryLabel = mode === "call" ? "Call again" : "New chat";

    return (
        <div className="fixed inset-0 z-50 bg-gray-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

                {/* Outcome header */}
                <div className="px-6 pt-6 pb-5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            (isSubmitted || isInline) ? "bg-green-100 dark:bg-green-950/50"
                            : isEscalated            ? "bg-amber-100 dark:bg-amber-950/50"
                            :                          "bg-blue-100 dark:bg-blue-950/50"
                        }`}>
                            {(isSubmitted || isInline)
                                ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                                : <PhoneCall    size={18} className={isEscalated ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"} />}
                        </div>
                        <div>
                            <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                {(isSubmitted || isInline) ? "We have your details"
                                    : isEscalated          ? "We'll be in touch"
                                    : isSkipped            ? endedLabel
                                    :                        endedLabel}
                            </p>
                            {durationLabel && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {businessName} · {durationLabel}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {(isSubmitted || isInline)
                            ? "A team member will follow up with you shortly."
                            : isEscalated
                            ? "Your request has been noted. Someone from our office will contact you soon."
                            : isSkipped
                            ? "If you'd like us to follow up, you can leave your details below."
                            : thanksBody}
                    </p>

                    {(isSubmitted || isInline) && hasRealLead && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3.5 space-y-1.5">
                            {capturedLeadData.name && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-gray-400 w-12 shrink-0">Name</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{capturedLeadData.name}</span>
                                </div>
                            )}
                            {capturedLeadData.email && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-gray-400 w-12 shrink-0">Email</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{capturedLeadData.email}</span>
                                </div>
                            )}
                            {capturedLeadData.phone && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-gray-400 w-12 shrink-0">Phone</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{capturedLeadData.phone}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {isEscalated && website && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            You can also reach us at{" "}
                            <span className="text-gray-600 dark:text-gray-300 font-medium">{website}</span>
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-2.5">
                    {isSkipped && (
                        <button
                            onClick={onLeaveDetails}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            Leave details
                        </button>
                    )}
                    {!isSubmitted && !isInline && !isEscalated && !isSkipped && onRetry && (
                        <button
                            onClick={onRetry}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            {retryLabel}
                        </button>
                    )}
                    <button
                        onClick={onDone}
                        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            (isSubmitted || isInline || isEscalated || isSkipped)
                                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
