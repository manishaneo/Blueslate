import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    PhoneCall,
    Users,
    AlertTriangle,
    Clock,
    Search,
    ChevronDown,
    Download,
    Eye,
    Copy,
    Check,
    X,
    Info,
    User,
    Mail,
    Phone,
} from "lucide-react";
import { getConversations } from "../services/conversationsService";

// ── config ────────────────────────────────────────────────────────────────────

const OUTCOME_CONFIG = {
    LEAD_CAPTURED: {
        cls:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        dotCls: "bg-green-500",
        label:  "Lead Captured",
        Icon:   Check,
    },
    ESCALATED: {
        cls:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        dotCls: "bg-amber-500",
        label:  "Escalated",
        Icon:   AlertTriangle,
    },
    INFORMATION_ONLY: {
        cls:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        dotCls: "bg-blue-500",
        label:  "Information Only",
        Icon:   Info,
    },
};

const STATUS_FILTERS = [
    { value: "all",              label: "All Outcomes"    },
    { value: "LEAD_CAPTURED",    label: "Lead Captured"   },
    { value: "ESCALATED",        label: "Escalated"       },
    { value: "INFORMATION_ONLY", label: "Information Only"},
];

const DATE_FILTERS = [
    { value: "all",       label: "All Time"     },
    { value: "today",     label: "Today"        },
    { value: "yesterday", label: "Yesterday"    },
    { value: "week",      label: "Last 7 Days"  },
    { value: "month",     label: "Last 30 Days" },
];

// ── field accessors (normalise Conversation → call shape) ─────────────────────

function callStartedAt(call) {
    return call.metadata?.startedAt ?? call.createdAt;
}
function callDuration(call) {
    return call.metadata?.durationSeconds ?? null;
}
function callOutcome(call) {
    return call.metadata?.outcome ?? null;
}
function callLastIntent(call) {
    return call.metadata?.lastIntent ?? null;
}
function callLead(call) {
    // metadata.lead is set by the browser voice finalize flow.
    // call.lead is the DB-joined Lead for VAPI outbound calls.
    return call.metadata?.lead ?? call.lead ?? null;
}

function callDirection(call) {
    const t = call.metadata?.callType;
    if (t === "outboundPhoneCall") return "outbound";
    if (t === "inboundPhoneCall" || t === "webCall") return "inbound";
    return null;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d    = new Date(dateStr);
    const now  = new Date();
    const tod  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest = new Date(tod); yest.setDate(yest.getDate() - 1);
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const t    = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (dDay.getTime() === tod.getTime())  return `Today, ${t}`;
    if (dDay.getTime() === yest.getTime()) return `Yesterday, ${t}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${t}`;
}

function inDateRange(dateStr, filter) {
    if (filter === "all" || !dateStr) return true;
    const d   = new Date(dateStr);
    const now = new Date();
    const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filter === "today")     return d >= tod;
    if (filter === "yesterday") { const y = new Date(tod); y.setDate(y.getDate() - 1); return d >= y && d < tod; }
    if (filter === "week")      { const w = new Date(tod); w.setDate(w.getDate() - 7);  return d >= w; }
    if (filter === "month")     { const m = new Date(tod); m.setDate(m.getDate() - 30); return d >= m; }
    return true;
}

function formatDuration(seconds) {
    if (seconds == null) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${String(s).padStart(2, "0")}s`;
}

function avgDuration(calls) {
    const valid = calls.filter((c) => typeof callDuration(c) === "number");
    if (!valid.length) return "—";
    const avg = Math.round(valid.reduce((sum, c) => sum + callDuration(c), 0) / valid.length);
    return formatDuration(avg);
}

function formatIntent(intent) {
    if (!intent) return "—";
    return intent.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// Conversation transcripts use { role, content, ts (unix) }
function formatTs(ts) {
    if (!ts) return null;
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ── CSV export ────────────────────────────────────────────────────────────────

function escapeCSV(val) {
    if (val == null) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
}

function buildCSV(calls) {
    const rows = [
        ["Date", "Duration (s)", "Duration", "Outcome", "Last Intent", "Lead Name", "Lead Email", "Lead Phone", "Summary"],
    ];
    for (const call of calls) {
        const lead = callLead(call);
        rows.push([
            callStartedAt(call) ? new Date(callStartedAt(call)).toISOString() : "",
            callDuration(call) ?? "",
            formatDuration(callDuration(call)),
            callOutcome(call) ?? "",
            callLastIntent(call) ?? "",
            lead?.name  ?? "",
            lead?.email ?? "",
            lead?.phone ?? "",
            call.summary ?? "",
        ]);
    }
    return "\uFEFF" + rows.map((r) => r.map(escapeCSV).join(",")).join("\r\n");
}

// ── sub-components ────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }) {
    const cfg = OUTCOME_CONFIG[outcome];
    if (!cfg) return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotCls}`} />
            {cfg.label}
        </span>
    );
}

function CallDirectionBadge({ direction }) {
    if (!direction) return null;
    const isOut = direction === "outbound";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isOut
                ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400"
                : "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400"
        }`}>
            {isOut ? "↗" : "↙"} {isOut ? "Outbound" : "Inbound"}
        </span>
    );
}

function FilterDropdown({ value, onChange, options }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
    );
}

// ── transcript drawer ─────────────────────────────────────────────────────────

function TranscriptDrawer({ call, visible, onClose }) {
    const [copiedPhone, setCopiedPhone] = useState(false);
    const lead  = call ? callLead(call) : null;
    const phone = lead?.phone ?? null;

    const handleCopyPhone = () => {
        if (!phone) return;
        navigator.clipboard.writeText(phone).then(() => {
            setCopiedPhone(true);
            setTimeout(() => setCopiedPhone(false), 2000);
        });
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

            <div className={`absolute right-0 top-0 h-[100dvh] w-full sm:max-w-[500px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <PhoneCall size={14} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Call Transcript</h2>
                            {call && (
                                <div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatDate(callStartedAt(call))} · {formatDuration(callDuration(call))}
                                    </p>
                                    {callDirection(call) && (
                                        <div className="mt-1">
                                            <CallDirectionBadge direction={callDirection(call)} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {call && (
                    <div className="flex-1 overflow-y-auto">

                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Call Details
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Duration",    value: formatDuration(callDuration(call)) },
                                    { label: "Outcome",     value: OUTCOME_CONFIG[callOutcome(call)]?.label ?? callOutcome(call) ?? "—" },
                                    { label: "Date",        value: formatDate(callStartedAt(call)) },
                                    { label: "Last Intent", value: formatIntent(callLastIntent(call)) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-gray-50 dark:bg-gray-800/70 rounded-xl px-3 py-2.5">
                                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
                                            {label}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3">
                                <OutcomeBadge outcome={callOutcome(call)} />
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                                    AI Summary
                                </p>
                                {call.summary ? (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                        "{call.summary}"
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                        AI summary not available.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                                Conversation
                            </p>

                            {(!call.transcript || call.transcript.length === 0) ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No transcript available.</p>
                            ) : (
                                <div className="space-y-3">
                                    {call.transcript.map((msg, i) => {
                                        const isAI = msg.role === "assistant";
                                        return (
                                            <div key={i} className={`flex gap-2.5 ${isAI ? "flex-row" : "flex-row-reverse"}`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                    isAI
                                                        ? "bg-blue-100 dark:bg-blue-900/40"
                                                        : "bg-gray-100 dark:bg-gray-800"
                                                }`}>
                                                    {isAI
                                                        ? <PhoneCall size={11} className="text-blue-600 dark:text-blue-400" />
                                                        : <User      size={11} className="text-gray-500 dark:text-gray-400" />
                                                    }
                                                </div>
                                                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                                    isAI
                                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                                                        : "bg-blue-600 text-white rounded-tr-sm"
                                                }`}>
                                                    <p className={`text-[10px] font-semibold mb-1 ${isAI ? "text-blue-600 dark:text-blue-400" : "text-blue-200"}`}>
                                                        {isAI ? "AI Receptionist" : "Caller"}
                                                    </p>
                                                    {msg.content ?? msg.text}
                                                    {msg.ts && (
                                                        <p className={`text-[10px] mt-1 ${isAI ? "text-gray-400 dark:text-gray-500" : "text-blue-300"}`}>
                                                            {formatTs(msg.ts)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {lead && (
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        Lead Captured
                                    </p>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-4 space-y-3">
                                    {[
                                        { Icon: User,  label: "Name",  value: lead.name  },
                                        { Icon: Mail,  label: "Email", value: lead.email },
                                        { Icon: Phone, label: "Phone", value: lead.phone },
                                    ].filter(({ value }) => value).map(({ Icon: FIcon, label, value }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                                                <FIcon size={13} className="text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold text-green-600 dark:text-green-500 uppercase tracking-wide">
                                                    {label}
                                                </p>
                                                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleCopyPhone}
                                    disabled={!phone}
                                    className={`mt-3 w-full flex items-center justify-center gap-2 text-sm py-2 rounded-xl font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        copiedPhone
                                            ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400"
                                    }`}
                                >
                                    {copiedPhone ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedPhone ? "Copied!" : "Copy Phone Number"}
                                </button>
                            </div>
                        )}

                        <div className="pb-8" />
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered }) {
    if (filtered) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No calls match your filters</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting the search or date range.</p>
            </div>
        );
    }
    return (
        <div className="py-20 flex flex-col items-center text-center gap-6 px-8">
            <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shadow-inner">
                    <PhoneCall size={36} className="text-blue-400 dark:text-blue-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">No calls yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
                    Once your AI receptionist starts answering calls, the full history and transcripts will appear here.
                </p>
            </div>
        </div>
    );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function CallHistoryPage() {
    const [calls,   setCalls]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getConversations({ source: "customer_portal_voice,receptionist", limit: 100 })
            .then((data) => setCalls(data.conversations ?? []))
            .catch(() => setCalls([]))
            .finally(() => setLoading(false));
    }, []);

    const [search,       setSearch]   = useState("");
    const [statusFilter, setStatus]   = useState("all");
    const [dateFilter,   setDate]     = useState("all");
    const [copiedId,     setCopiedId] = useState(null);

    const [selectedCall,  setSelectedCall]  = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);

    const openDrawer = (call) => {
        setSelectedCall(call);
        requestAnimationFrame(() => requestAnimationFrame(() => setDrawerVisible(true)));
    };

    const closeDrawer = () => {
        setDrawerVisible(false);
        setTimeout(() => setSelectedCall(null), 300);
    };

    const handleCopyPhone = (id, phone) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const stats = useMemo(() => ({
        total:     calls.length,
        leads:     calls.filter((c) => callOutcome(c) === "LEAD_CAPTURED").length,
        escalated: calls.filter((c) => callOutcome(c) === "ESCALATED").length,
        avgDur:    avgDuration(calls),
    }), [calls]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return calls.filter((c) => {
            if (statusFilter !== "all" && callOutcome(c) !== statusFilter) return false;
            if (!inDateRange(callStartedAt(c), dateFilter)) return false;
            if (q) {
                const intentStr  = (callLastIntent(c) ?? "").toLowerCase();
                const outcomeStr = (callOutcome(c)    ?? "").toLowerCase();
                const leadEmail  = (callLead(c)?.email ?? "").toLowerCase();
                const leadPhone  =  callLead(c)?.phone ?? "";
                const txSearch   = (c.transcript ?? []).some((m) =>
                    (m.content ?? m.text ?? "").toLowerCase().includes(q)
                );
                if (
                    !intentStr.includes(q)  &&
                    !outcomeStr.includes(q) &&
                    !leadEmail.includes(q)  &&
                    !leadPhone.includes(q)  &&
                    !txSearch
                ) return false;
            }
            return true;
        });
    }, [calls, search, statusFilter, dateFilter]);

    const handleExport = () => {
        if (!filtered.length) return;
        const csv  = buildCSV(filtered);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `call-history-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const KPI_CARDS = [
        { label: "Calls Answered",   value: stats.total,     Icon: PhoneCall,     iconBg: "bg-blue-100 dark:bg-blue-900/30",    iconCls: "text-blue-600 dark:text-blue-400",    valCls: "text-blue-600 dark:text-blue-400"    },
        { label: "Leads Captured",   value: stats.leads,     Icon: Users,         iconBg: "bg-green-100 dark:bg-green-900/30",  iconCls: "text-green-600 dark:text-green-400",  valCls: "text-green-600 dark:text-green-400"  },
        { label: "Escalations",      value: stats.escalated, Icon: AlertTriangle, iconBg: "bg-amber-100 dark:bg-amber-900/30",  iconCls: "text-amber-600 dark:text-amber-400",  valCls: "text-amber-600 dark:text-amber-400"  },
        { label: "Avg Call Duration",value: stats.avgDur,    Icon: Clock,         iconBg: "bg-violet-100 dark:bg-violet-900/30",iconCls: "text-violet-600 dark:text-violet-400",valCls: "text-violet-700 dark:text-violet-300" },
    ];

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {(selectedCall || drawerVisible) && (
                <TranscriptDrawer
                    call={selectedCall}
                    visible={drawerVisible}
                    onClose={closeDrawer}
                />
            )}

            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Call History</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Every AI-answered call, outcome, and transcript
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI_CARDS.map(({ label, value, Icon, iconBg, iconCls, valCls }) => (
                    <div
                        key={label}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                            <Icon size={17} className={iconCls} />
                        </div>
                        <div>
                            <p className={`text-2xl sm:text-3xl font-bold leading-none ${valCls}`}>{value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px] max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search transcript, intent, lead…"
                            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                    </div>

                    <FilterDropdown value={statusFilter} onChange={setStatus} options={STATUS_FILTERS} />
                    <FilterDropdown value={dateFilter}   onChange={setDate}   options={DATE_FILTERS} />

                    <div className="flex-1 hidden sm:block" />

                    <button
                        onClick={handleExport}
                        disabled={filtered.length === 0}
                        title={filtered.length === 0 ? "No calls to export" : `Export ${filtered.length} call${filtered.length !== 1 ? "s" : ""} to CSV`}
                        className="flex items-center gap-1.5 text-sm h-9 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>

                {calls.length === 0 ? (
                    <EmptyState filtered={false} />
                ) : filtered.length === 0 ? (
                    <EmptyState filtered />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                    {["Date", "Duration", "Outcome", "Last Intent", "Lead", "Phone", ""].map((h) => (
                                        <th
                                            key={h}
                                            className={`text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide ${!h ? "w-24" : ""}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {filtered.map((call) => {
                                    const lead  = callLead(call);
                                    const phone = lead?.phone ?? null;
                                    return (
                                        <tr
                                            key={call.id}
                                            className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                                        >
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(callStartedAt(call))}</p>
                                                <CallDirectionBadge direction={callDirection(call)} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    <Clock size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                                    {formatDuration(callDuration(call))}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <OutcomeBadge outcome={callOutcome(call)} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className="text-gray-600 dark:text-gray-400 text-sm">
                                                    {formatIntent(callLastIntent(call))}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {lead ? (
                                                    <div className="space-y-0.5">
                                                        {lead.name && (
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                                                                {lead.name}
                                                            </p>
                                                        )}
                                                        {lead.email && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                                                                {lead.email}
                                                            </p>
                                                        )}
                                                        {!lead.name && !lead.email && (
                                                            <p className="text-sm text-gray-400 italic">Unknown Lead</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                {phone ? (
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{phone}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openDrawer(call)}
                                                        title="View transcript"
                                                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                                                    >
                                                        <Eye size={12} />
                                                        Transcript
                                                    </button>
                                                    <button
                                                        onClick={() => handleCopyPhone(call.id, phone)}
                                                        disabled={!phone}
                                                        title={phone ? "Copy phone" : "No phone available"}
                                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                                            copiedId === call.id
                                                                ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                                                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                        }`}
                                                    >
                                                        {copiedId === call.id ? <Check size={12} /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {filtered.length === calls.length
                                    ? `${calls.length} call${calls.length !== 1 ? "s" : ""}`
                                    : `${filtered.length} of ${calls.length} calls`}
                                {" · "}
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                    {filtered.filter((c) => callOutcome(c) === "LEAD_CAPTURED").length} leads captured
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
