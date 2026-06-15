import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
    ArrowLeft, Copy, Check, Mail, Phone, User, Calendar, Tag,
    MessageSquare, PhoneCall, Zap, Clock, Activity,
    CheckCircle2, XCircle, AlertCircle, MessageCircle, FileText,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";

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

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
    });
}

function formatRelative(iso) {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function avatarInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function bizKey() {
    return localStorage.getItem("businessContextId") || "default";
}

// TODO: Future API — GET /api/leads/:id/conversations
function loadConversationsForLead(lead) {
    try {
        const all = JSON.parse(localStorage.getItem(`customerConversations_${bizKey()}`) || "[]");
        if (!lead) return [];
        return all.filter(c =>
            (lead.email && c.customerEmail?.toLowerCase() === lead.email?.toLowerCase()) ||
            (lead.phone && c.customerPhone === lead.phone)
        );
    } catch { return []; }
}

// TODO: Future API — GET /api/leads/:id/calls
function loadCallsForLead(lead) {
    try {
        const all = JSON.parse(localStorage.getItem(`callHistory_${bizKey()}`) || "[]");
        if (!lead) return [];
        return all.filter(c =>
            (lead.email && c.lead?.email?.toLowerCase() === lead.email?.toLowerCase()) ||
            (lead.phone && c.lead?.phone === lead.phone)
        );
    } catch { return []; }
}

function loadStatusOverride(leadId) {
    try {
        const overrides = JSON.parse(localStorage.getItem(`leadStatusOverrides_${bizKey()}`) || "{}");
        return overrides[String(leadId)] ?? null;
    } catch { return null; }
}

function saveStatusOverride(leadId, status) {
    try {
        const key = `leadStatusOverrides_${bizKey()}`;
        const overrides = JSON.parse(localStorage.getItem(key) || "{}");
        overrides[String(leadId)] = status;
        localStorage.setItem(key, JSON.stringify(overrides));
    } catch { /* quota */ }
}

// Build a synthetic lead object from a conversation record (demo fallback)
function leadFromConversation(conv) {
    return {
        id: conv.id,
        name: conv.customerName,
        email: conv.customerEmail,
        phone: conv.customerPhone,
        interest: conv.intent,
        status: "NEW",
        source: conv.source,
        createdAt: conv.startedAt,
        _fromConversation: true,
    };
}

// ── status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
    NEW:       "bg-blue-50  text-blue-700  dark:bg-blue-900/30  dark:text-blue-300",
    CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    CONVERTED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    CLOSED:    "bg-gray-100 text-gray-500  dark:bg-gray-800      dark:text-gray-400",
};

function StatusBadge({ status }) {
    const cls = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {status ?? "NEW"}
        </span>
    );
}

// ── section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
    return (
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            {children}
        </p>
    );
}

// ── info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 break-words">{value || <span className="text-gray-300 dark:text-gray-600">—</span>}</p>
            </div>
        </div>
    );
}

// ── stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color, bg }) {
    return (
        <div className={`flex items-center gap-3 ${bg} rounded-xl px-3 py-2.5`}>
            <Icon size={15} className={color} />
            <div>
                <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LeadDetailsPage() {
    const { leadId }   = useParams();
    const navigate     = useNavigate();
    const { state }    = useLocation();

    const [lead, setLead]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [status, setStatus]     = useState(null);
    const [updating, setUpdating] = useState(false);
    const [copied, setCopied]     = useState(null);

    // ── load lead ───────────────────────────────────────────────────────────

    useEffect(() => {
        async function resolve() {
            // 1. Prefer lead passed through navigation state (from LeadsPage row click)
            if (state?.lead) {
                const override = loadStatusOverride(leadId);
                setLead(state.lead);
                setStatus(override ?? state.lead.status ?? "NEW");
                setLoading(false);
                return;
            }

            // TODO: Future API — GET /api/leads/:id
            try {
                const { data } = await axios.get(`${API_BASE_URL}/leads/${leadId}`);
                const lead = data?.data ?? data;
                const override = loadStatusOverride(leadId);
                setLead(lead);
                setStatus(override ?? lead.status ?? "NEW");
                setLoading(false);
                return;
            } catch { /* API unavailable, try localStorage fallback */ }

            // 2. Fallback: find a matching conversation record (demo mode)
            try {
                const all = JSON.parse(
                    localStorage.getItem(`customerConversations_${bizKey()}`) || "[]"
                );
                const conv = all.find(c => c.id === leadId);
                if (conv) {
                    const mockLead = leadFromConversation(conv);
                    const override = loadStatusOverride(leadId);
                    setLead(mockLead);
                    setStatus(override ?? "NEW");
                    setLoading(false);
                    return;
                }
            } catch { /* ignore */ }

            setNotFound(true);
            setLoading(false);
        }

        resolve();
    }, [leadId, state]);

    // ── derived data ────────────────────────────────────────────────────────

    const conversations = useMemo(() => loadConversationsForLead(lead), [lead]);
    const calls         = useMemo(() => loadCallsForLead(lead), [lead]);

    const latestConv = conversations[0] ?? null;

    const lastInteraction = useMemo(() => {
        const times = [
            ...conversations.map(c => c.startedAt),
            ...calls.map(c => c.startedAt),
        ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
        return times[0] ?? null;
    }, [conversations, calls]);

    // ── status update ───────────────────────────────────────────────────────

    async function handleStatusChange(newStatus) {
        if (newStatus === status || updating) return;
        setUpdating(true);
        setStatus(newStatus);
        saveStatusOverride(leadId, newStatus);

        // TODO: Future API — PATCH /api/leads/:id/status
        try {
            await axios.patch(`${API_BASE_URL}/leads/${leadId}/status`, { status: newStatus });
        } catch { /* persist locally; API will sync later */ }

        setUpdating(false);
    }

    // ── copy helper ─────────────────────────────────────────────────────────

    function handleCopy(key, value) {
        if (!value) return;
        navigator.clipboard.writeText(value).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    }

    // ── render guards ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-3 py-20 justify-center">
                    <svg className="w-5 h-5 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Loading lead…</p>
                </div>
            </div>
        );
    }

    if (notFound || !lead) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <button
                    onClick={() => navigate("/leads")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-8"
                >
                    <ArrowLeft size={15} />
                    Back to Leads
                </button>
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <User size={28} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Lead not found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This lead may have been removed or the ID is invalid.</p>
                    </div>
                    <button
                        onClick={() => navigate("/leads")}
                        className="text-sm px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                        Go back to Leads
                    </button>
                </div>
            </div>
        );
    }

    // ── next action buttons config ───────────────────────────────────────────

    const NEXT_ACTIONS = [
        {
            key: "CONTACTED",
            label: "Mark Contacted",
            Icon: MessageCircle,
            active: "bg-amber-600 hover:bg-amber-700 text-white",
            done: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 cursor-default",
        },
        {
            key: "CONVERTED",
            label: "Mark Converted",
            Icon: CheckCircle2,
            active: "bg-green-600 hover:bg-green-700 text-white",
            done: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default",
        },
        {
            key: "CLOSED",
            label: "Mark Closed",
            Icon: XCircle,
            active: "bg-gray-500 hover:bg-gray-600 text-white",
            done: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default",
        },
    ];

    const isDone = (key) => status === key;
    const isPast = (key) => {
        const order = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
        return order.indexOf(status) > order.indexOf(key);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div>
                <button
                    onClick={() => navigate("/leads")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-4"
                >
                    <ArrowLeft size={15} />
                    Back to Leads
                </button>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                {avatarInitials(lead.name)}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                {lead.name || "Unknown Lead"}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={status} />
                                {lead.interest && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                                        · {lead.interest}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header actions */}
                    <div className="flex items-center gap-2">
                        {lead.phone && (
                            <button
                                onClick={() => handleCopy("header-phone", lead.phone)}
                                className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border font-medium transition-all ${
                                    copied === "header-phone"
                                        ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                                }`}
                            >
                                {copied === "header-phone" ? <Check size={14} /> : <Copy size={14} />}
                                {copied === "header-phone" ? "Copied!" : "Copy Phone"}
                            </button>
                        )}
                        {lead.email && (
                            <button
                                onClick={() => { window.location.href = `mailto:${lead.email}`; }}
                                className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
                            >
                                <Mail size={14} />
                                Send Email
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left / main column ──────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Section 1 — Lead Information */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                        <SectionLabel>Lead Information</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={User}     label="Name"    value={lead.name} />
                            <InfoRow icon={Mail}     label="Email"   value={lead.email} />
                            <InfoRow icon={Phone}    label="Phone"   value={lead.phone} />
                            <InfoRow icon={Tag}      label="Intent"  value={lead.interest} />
                            <InfoRow
                                icon={Activity}
                                label="Source"
                                value={(() => {
                                    const raw = lead.source ?? latestConv?.source ?? null;
                                    if (!raw) return "—";
                                    return LEAD_SOURCE_LABELS[raw] ?? raw.replace(/_/g, " ");
                                })()}
                            />
                            <InfoRow icon={Calendar} label="Created" value={formatDate(lead.createdAt)} />
                        </div>
                        {lead.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={14} className="text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                            Tell us anything you'd like our team to know
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                            {lead.notes}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2 — Conversation Summary */}
                    {latestConv?.summary ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                            <SectionLabel>Conversation Summary</SectionLabel>
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={13} className="text-amber-500 shrink-0" />
                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">AI-generated Summary</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {latestConv.summary}
                                </p>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {formatRelative(latestConv.startedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                    {latestConv.source === "CHAT"
                                        ? <MessageSquare size={11} />
                                        : <PhoneCall size={11} />
                                    }
                                    {latestConv.source}
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {/* Section 3 — Recent Conversation */}
                    {latestConv?.transcript?.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <SectionLabel>Recent Conversation</SectionLabel>
                                {latestConv.transcript.length > 6 && (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 -mt-3">
                                        Last 6 messages
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {latestConv.transcript.slice(-6).map((msg, i) => {
                                    const isCustomer = msg.role === "customer";
                                    return (
                                        <div
                                            key={i}
                                            className={`flex gap-2.5 ${isCustomer ? "justify-end" : "justify-start"}`}
                                        >
                                            {!isCustomer && (
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Zap size={10} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                            )}
                                            <div
                                                className={`max-w-[80%] rounded-2xl text-sm leading-relaxed ${
                                                    isCustomer
                                                        ? "bg-blue-600 text-white px-3.5 py-2.5 rounded-tr-sm"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3.5 py-2.5 rounded-tl-sm"
                                                }`}
                                            >
                                                <p className={`text-[10px] font-semibold mb-1 ${isCustomer ? "text-blue-200" : "text-blue-600 dark:text-blue-400"}`}>
                                                    {isCustomer ? lead.name : "AI Receptionist"}
                                                </p>
                                                {msg.text}
                                            </div>
                                            {isCustomer && (
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                        {avatarInitials(lead.name)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state — no conversation linked */}
                    {!latestConv && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-3 text-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <MessageSquare size={20} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No conversations linked</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    Conversations that match this lead's email or phone will appear here.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right / sidebar column ──────────────────────────────── */}
                <div className="space-y-5">

                    {/* Section 4 — Related Activity */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                        <SectionLabel>Related Activity</SectionLabel>
                        <div className="space-y-2.5">
                            <StatTile
                                icon={MessageSquare}
                                label="Conversations"
                                value={conversations.length}
                                color="text-blue-600 dark:text-blue-400"
                                bg="bg-blue-50 dark:bg-blue-900/20"
                            />
                            <StatTile
                                icon={PhoneCall}
                                label="Calls"
                                value={calls.length}
                                color="text-emerald-600 dark:text-emerald-400"
                                bg="bg-emerald-50 dark:bg-emerald-900/20"
                            />
                            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5 flex items-center gap-3">
                                <Clock size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                <div>
                                    <p className="text-base font-bold leading-none text-gray-700 dark:text-gray-300">
                                        {formatRelative(lastInteraction)}
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Last interaction</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 5 — Next Actions */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                        <SectionLabel>Next Actions</SectionLabel>
                        <div className="space-y-2">
                            {NEXT_ACTIONS.map(({ key, label, Icon, active, done }) => {
                                const alreadyThis = isDone(key);
                                const alreadyPast = isPast(key);
                                const isDisabled  = alreadyThis || alreadyPast || updating;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => !isDisabled && handleStatusChange(key)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            alreadyThis || alreadyPast
                                                ? done
                                                : `${active} shadow-sm`
                                        } disabled:cursor-default`}
                                    >
                                        <Icon size={15} />
                                        {alreadyThis ? `✓ ${label.replace("Mark ", "")}` : label}
                                        {updating && key === status && (
                                            <svg className="w-3.5 h-3.5 ml-auto animate-spin opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Current status indicator */}
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-2">
                                Current Status
                            </p>
                            <StatusBadge status={status} />
                        </div>
                    </div>

                    {/* Linked conversations list */}
                    {conversations.length > 1 && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                            <SectionLabel>All Conversations ({conversations.length})</SectionLabel>
                            <div className="space-y-2">
                                {conversations.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {c.source === "CHAT"
                                                ? <MessageSquare size={13} className="text-blue-500 shrink-0" />
                                                : <PhoneCall size={13} className="text-emerald-500 shrink-0" />
                                            }
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate">{c.intent}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatRelative(c.startedAt)}</p>
                                            </div>
                                        </div>
                                        {c.leadCaptured && (
                                            <span className="shrink-0">
                                                <Zap size={11} className="text-green-500" />
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
