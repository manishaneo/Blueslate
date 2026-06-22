import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare, X, Clock, ChevronLeft, ChevronRight,
    Loader2, AlertCircle, Bot, User, Search, Calendar,
    Phone, Mail, Briefcase, SlidersHorizontal, ArrowUpDown,
    AlertTriangle,
} from "lucide-react";
import { getConversations, getConversationById } from "../services/conversationsService";

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    });
}

function shortId(id) {
    return id ? id.slice(0, 8).toUpperCase() : "—";
}

// ── source config ─────────────────────────────────────────────────────────────

const SOURCE_CONFIG = {
    customer_portal_chat:  { label: "Portal Chat",     cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
    customer_portal_voice: { label: "Portal Voice",    cls: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
    customer_portal:       { label: "Customer Portal", cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
    business_chat:         { label: "Business Chat",   cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    receptionist:          { label: "Receptionist",    cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    form_post_chat:        { label: "Chat Form",        cls: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400" },
    form_post_voice:       { label: "Voice Form",       cls: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" },
    form_chat_escalation:  { label: "Escalated Chat",   cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
    form_voice_escalation: { label: "Escalated Voice",  cls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
};

// ── outcome config ────────────────────────────────────────────────────────────

const OUTCOME_CONFIG = {
    ESCALATED:        { label: "Escalated to Human",  cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
    LEAD_CAPTURED:    { label: "Lead Captured",        cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
    INFORMATION_ONLY: { label: "Information Only",     cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
};

// ── lead source labels ────────────────────────────────────────────────────────

const LEAD_SOURCE_LABELS = {
    form_post_chat:        "Chat Form",
    form_post_voice:       "Voice Form",
    form_chat_escalation:  "Escalated Chat",
    form_voice_escalation: "Escalated Voice",
    customer_portal_chat:  "Portal Chat",
    customer_portal_voice: "Portal Voice",
    customer_portal:       "Customer Portal",
    business_chat:         "Business Chat",
    receptionist:          "Receptionist",
};

const LEAD_STATUS_STYLES = {
    NEW:       "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    CONVERTED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

// ── sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
    const cfg = SOURCE_CONFIG[source] ?? {
        label: source ? source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown",
        cls:   "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <MessageSquare size={10} />
            {cfg.label}
        </span>
    );
}

function LeadStatusBadge({ status }) {
    const cls = LEAD_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status ?? "—"}
        </span>
    );
}

function EscalationBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertTriangle size={9} />
            Escalated
        </span>
    );
}

function OutcomeBadge({ outcome }) {
    const cfg = OUTCOME_CONFIG[outcome];
    if (!cfg) return <span className="text-xs text-gray-500 dark:text-gray-400">{outcome}</span>;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            {outcome === "ESCALATED" && <AlertTriangle size={9} className="mr-1" />}
            {cfg.label}
        </span>
    );
}

function MetaRow({ label, value }) {
    return (
        <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 break-words">{value}</div>
        </div>
    );
}

function Paginator({ page, totalPages, onPrev, onNext }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40">
            <button
                onClick={onPrev}
                disabled={page <= 1}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
                <ChevronLeft size={13} /> Previous
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
                Page {page} of {totalPages}
            </span>
            <button
                onClick={onNext}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
                Next <ChevronRight size={13} />
            </button>
        </div>
    );
}

// ── filter bar ────────────────────────────────────────────────────────────────

const SELECT_CLS =
    "text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer";

function FilterBar({
    searchInput, onSearchInput,
    source, onSource,
    hasLead, onHasLead,
    escalated, onEscalated,
    dateFrom, onDateFrom,
    dateTo, onDateTo,
    sort, onSort,
    hasFilters, onClear,
}) {
    return (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
            <div className="flex flex-wrap items-center gap-2.5">

                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search conversations…"
                        value={searchInput}
                        onChange={(e) => onSearchInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-600 text-gray-900 dark:text-gray-100"
                    />
                </div>

                {/* Source */}
                <select value={source ?? "customer_portal_chat,business_chat"} onChange={(e) => onSource(e.target.value)} className={SELECT_CLS}>
                    <option value="customer_portal_chat,business_chat">All Chats</option>
                    <option value="customer_portal_chat">Customer Portal</option>
                    <option value="business_chat">Business Chat</option>
                </select>

                {/* Has Lead */}
                <select
                    value={hasLead === null ? "" : String(hasLead)}
                    onChange={(e) => onHasLead(e.target.value === "" ? null : e.target.value === "true")}
                    className={SELECT_CLS}
                >
                    <option value="">All leads</option>
                    <option value="true">Has Lead</option>
                    <option value="false">No Lead</option>
                </select>

                {/* Escalated */}
                <select
                    value={escalated === null ? "" : "true"}
                    onChange={(e) => onEscalated(e.target.value === "true" ? true : null)}
                    className={`${SELECT_CLS} ${escalated ? "border-red-400 dark:border-red-600 text-red-700 dark:text-red-400" : ""}`}
                >
                    <option value="">All outcomes</option>
                    <option value="true">Escalated only</option>
                </select>

                {/* Date range */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Calendar size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <input
                        type="date"
                        value={dateFrom ?? ""}
                        onChange={(e) => onDateFrom(e.target.value || null)}
                        className={SELECT_CLS}
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">–</span>
                    <input
                        type="date"
                        value={dateTo ?? ""}
                        min={dateFrom ?? ""}
                        onChange={(e) => onDateTo(e.target.value || null)}
                        className={SELECT_CLS}
                    />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <ArrowUpDown size={13} className="text-gray-400 dark:text-gray-500" />
                    <select value={sort} onChange={(e) => onSort(e.target.value)} className={SELECT_CLS}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="messages">Most messages</option>
                    </select>
                </div>

                {/* Clear */}
                {hasFilters && (
                    <button
                        onClick={onClear}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors whitespace-nowrap shrink-0 px-1"
                    >
                        Clear all
                    </button>
                )}
            </div>
        </div>
    );
}

// ── conversation detail drawer ────────────────────────────────────────────────

function ConversationDrawer({ conversationId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [data,    setData]    = useState(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setData(null);

        getConversationById(conversationId)
            .then((d) => { if (!cancelled) setData(d); })
            .catch((err) => {
                if (!cancelled)
                    setError(err?.response?.data?.message ?? "Failed to load conversation.");
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [conversationId]);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Conversation details"
                className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
                            Conversation
                        </p>
                        <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                            #{shortId(conversationId)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-20 gap-2 text-gray-400 dark:text-gray-500">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Loading…</span>
                        </div>
                    )}

                    {error && (
                        <div className="m-5 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {data && (
                        <div className="px-5 py-5 space-y-5">

                            {/* ── Meta details ──────────────────────────────── */}
                            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-4 space-y-3">
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                    Details
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <MetaRow
                                        label="Source"
                                        value={<SourceBadge source={data.source} />}
                                    />
                                    <MetaRow
                                        label="Messages"
                                        value={
                                            <span className="inline-flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                                                {data.messageCount}
                                                <MessageSquare size={11} className="text-gray-400" />
                                            </span>
                                        }
                                    />
                                    <MetaRow label="Started"  value={fmtDate(data.createdAt)} />
                                    <MetaRow label="Updated"  value={fmtDate(data.updatedAt)} />
                                </div>
                            </div>

                            {/* ── Escalation ────────────────────────────────── */}
                            {data.metadata?.outcome && (
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40 rounded-2xl px-4 py-4">
                                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <AlertTriangle size={11} />
                                        Escalation
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <MetaRow
                                            label="Outcome"
                                            value={<OutcomeBadge outcome={data.metadata.outcome} />}
                                        />
                                        {data.metadata.escalationIntent && (
                                            <MetaRow
                                                label="Intent"
                                                value={data.metadata.escalationIntent.replace(/_/g, " ")}
                                            />
                                        )}
                                        {data.metadata.escalatedAt && (
                                            <div className="col-span-2">
                                                <MetaRow
                                                    label="Escalated At"
                                                    value={fmtDate(data.metadata.escalatedAt)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Linked lead ───────────────────────────────── */}
                            {data.lead ? (
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl px-4 py-4">
                                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                                        Linked Lead
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <MetaRow label="Name"   value={data.lead.name  ?? "—"} />
                                        <MetaRow label="Status" value={<LeadStatusBadge status={data.lead.status} />} />
                                        {data.lead.email && (
                                            <div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                                                <a
                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.lead.email)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 break-all"
                                                >
                                                    <Mail size={11} className="shrink-0" />
                                                    {data.lead.email}
                                                </a>
                                            </div>
                                        )}
                                        {data.lead.phone && (
                                            <div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Phone</p>
                                                <a
                                                    href={`tel:${data.lead.phone}`}
                                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                                                >
                                                    <Phone size={11} className="shrink-0" />
                                                    {data.lead.phone}
                                                </a>
                                            </div>
                                        )}
                                        {data.lead.interest && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Interest</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1 mt-0.5">
                                                    <Briefcase size={11} className="text-gray-400 shrink-0" />
                                                    {data.lead.interest}
                                                </p>
                                            </div>
                                        )}
                                        {data.lead.source && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Lead Source</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                                                    {LEAD_SOURCE_LABELS[data.lead.source] ?? data.lead.source.replace(/_/g, " ")}
                                                </p>
                                            </div>
                                        )}
                                        {data.lead.notes && (
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Tell us anything you'd like our team to know</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                                                    {data.lead.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : data.leadId ? (
                                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Lead #{data.leadId} is linked but could not be loaded.
                                    </p>
                                </div>
                            ) : null}

                            {/* ── Summary ───────────────────────────────────── */}
                            {data.summary && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40 rounded-2xl px-4 py-4">
                                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">
                                        AI Summary
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {data.summary}
                                    </p>
                                </div>
                            )}

                            {/* ── Transcript ────────────────────────────────── */}
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                    Transcript ({data.messageCount} messages)
                                </p>
                                {data.transcript.length === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                        No messages recorded.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.transcript.map((msg, i) => {
                                            const isUser = msg.role === "user" || msg.role === "customer";
                                            const text   = msg.content ?? msg.text ?? "";
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                        isUser
                                                            ? "bg-blue-100 dark:bg-blue-900/40"
                                                            : "bg-gray-100 dark:bg-gray-800"
                                                    }`}>
                                                        {isUser
                                                            ? <User size={11} className="text-blue-600 dark:text-blue-400" />
                                                            : <Bot  size={11} className="text-gray-500 dark:text-gray-400" />
                                                        }
                                                    </div>
                                                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                        isUser
                                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                                                    }`}>
                                                        {text}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ── empty states ──────────────────────────────────────────────────────────────

function EmptyNoConversations() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <MessageSquare size={26} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No conversations yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs leading-relaxed">
                    Customer chats appear here automatically once visitors interact with your AI receptionist.
                </p>
            </div>
        </div>
    );
}

function EmptyNoResults({ onClear }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Search size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No results found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs leading-relaxed">
                    No conversations match your current search or filters. Try adjusting them.
                </p>
            </div>
            <button
                onClick={onClear}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
                Clear all filters
            </button>
        </div>
    );
}

// ── constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SOURCE = "customer_portal_chat,business_chat";

// ── main page ─────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
    // ── filter state ──────────────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [search,      setSearch]      = useState(null);
    const [source,      setSource]      = useState("customer_portal_chat,business_chat");
    const [hasLead,     setHasLead]     = useState(null);
    const [escalated,   setEscalated]   = useState(null);
    const [dateFrom,    setDateFrom]    = useState(null);
    const [dateTo,      setDateTo]      = useState(null);
    const [sort,        setSort]        = useState("newest");

    // ── list state ────────────────────────────────────────────────────────────
    const [page,       setPage]       = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [data,       setData]       = useState({ conversations: [], pagination: null });
    const [selectedId, setSelectedId] = useState(null);

    // 300 ms debounce on search input
    useEffect(() => {
        const t = setTimeout(() => {
            const v = searchInput.trim();
            setSearch(v.length > 0 ? v : null);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const hasFilters = !!(source !== DEFAULT_SOURCE || hasLead !== null || escalated !== null || dateFrom || dateTo || search);

    const clearFilters = useCallback(() => {
        setSearchInput("");
        setSearch(null);
        setSource(DEFAULT_SOURCE);
        setHasLead(null);
        setEscalated(null);
        setDateFrom(null);
        setDateTo(null);
        setSort("newest");
    }, []);

    // loadPage is memoised over all filter values so changing any filter
    // causes the useEffect below to re-fire with page = 1.
    const loadPage = useCallback(async (p = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: p, limit: 20, sort };
            if (source)              params.source    = source;
            if (hasLead !== null)    params.hasLead   = String(hasLead);
            if (escalated !== null)  params.escalated = "true";
            if (search)              params.search    = search;
            if (dateFrom)            params.dateFrom  = dateFrom;
            if (dateTo)              params.dateTo    = dateTo;

            const result = await getConversations(params);
            setData(result);
            setPage(p);
        } catch (err) {
            setError(err?.response?.data?.message ?? "Failed to load conversations.");
        } finally {
            setLoading(false);
        }
    }, [source, hasLead, escalated, search, dateFrom, dateTo, sort]);

    useEffect(() => { loadPage(1); }, [loadPage]);

    const { conversations, pagination } = data;
    const totalPages = pagination?.totalPages ?? 1;
    const total      = pagination?.total      ?? 0;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* Detail drawer */}
            {selectedId && (
                <ConversationDrawer
                    conversationId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}

            {/* Page header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conversations</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Customer chats captured by your AI receptionist.
                    </p>
                </div>
                {!loading && total > 0 && (
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {hasFilters ? "matching" : "total"}
                        </p>
                    </div>
                )}
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

                {/* Filter bar — always visible */}
                <FilterBar
                    searchInput={searchInput} onSearchInput={setSearchInput}
                    source={source}           onSource={setSource}
                    hasLead={hasLead}         onHasLead={setHasLead}
                    escalated={escalated}     onEscalated={setEscalated}
                    dateFrom={dateFrom}       onDateFrom={setDateFrom}
                    dateTo={dateTo}           onDateTo={setDateTo}
                    sort={sort}               onSort={setSort}
                    hasFilters={hasFilters}   onClear={clearFilters}
                />

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20 gap-2 text-gray-400 dark:text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading conversations…</span>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="m-5 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Empty states */}
                {!loading && !error && conversations.length === 0 && (
                    hasFilters
                        ? <EmptyNoResults onClear={clearFilters} />
                        : <EmptyNoConversations />
                )}

                {/* Table */}
                {!loading && !error && conversations.length > 0 && (
                    <>
                        {/* Summary row */}
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {total.toLocaleString()} conversation{total !== 1 ? "s" : ""}
                                {hasFilters && <span className="ml-1 text-gray-400 dark:text-gray-500">(filtered)</span>}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                <SlidersHorizontal size={11} />
                                {sort === "newest" ? "Newest first" : sort === "oldest" ? "Oldest first" : "Most messages"}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ID</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preview</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Msgs</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lead</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {conversations.map((conv) => (
                                        <tr
                                            key={conv.id}
                                            onClick={() => setSelectedId(conv.id)}
                                            className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                                        >
                                            {/* ID */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                                    #{shortId(conv.id)}
                                                </span>
                                            </td>

                                            {/* Source */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col gap-1">
                                                    <SourceBadge source={conv.source} />
                                                    {conv.metadata?.outcome === "ESCALATED" && (
                                                        <EscalationBadge />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Preview */}
                                            <td className="px-5 py-3.5 max-w-[220px]">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                    {conv.summary
                                                        ? conv.summary
                                                        : conv.preview
                                                            ? <span className="italic text-gray-400 dark:text-gray-500">{conv.preview}</span>
                                                            : <span className="text-gray-300 dark:text-gray-600 italic text-xs">No preview</span>
                                                    }
                                                </p>
                                            </td>

                                            {/* Message count */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                                                    {conv.messageCount}
                                                </span>
                                            </td>

                                            {/* Has lead indicator */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {conv.leadId ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                                        <User size={9} />
                                                        Linked
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>

                                            {/* Time */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                    <Clock size={11} />
                                                    {relativeTime(conv.createdAt)}
                                                </div>
                                            </td>

                                            {/* View button */}
                                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setSelectedId(conv.id)}
                                                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Paginator
                            page={page}
                            totalPages={totalPages}
                            onPrev={() => loadPage(page - 1)}
                            onNext={() => loadPage(page + 1)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
