import { useState, useEffect, useMemo } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { getLeads, getDashboardStats, updateLeadStatus } from "../services/leadService";

// ── stat card definitions ────────────────────────────────────────────────────

const STATS_CONFIG = [
    {
        key: "totalLeads",
        label: "Total Leads",
        color: "text-blue-600",
        iconBg: "bg-blue-100",
        darkIconBg: "dark:bg-blue-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
            </svg>
        ),
    },
    {
        key: "leadsToday",
        label: "Leads Today",
        color: "text-amber-600",
        iconBg: "bg-amber-100",
        darkIconBg: "dark:bg-amber-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: "leadsThisWeek",
        label: "This Week",
        color: "text-violet-600",
        iconBg: "bg-violet-100",
        darkIconBg: "dark:bg-violet-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: "emailsCaptured",
        label: "Emails",
        color: "text-emerald-600",
        iconBg: "bg-emerald-100",
        darkIconBg: "dark:bg-emerald-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400">
                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
        ),
    },
    {
        key: "phonesCaptured",
        label: "Phones",
        color: "text-purple-600",
        iconBg: "bg-purple-100",
        darkIconBg: "dark:bg-purple-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-600 dark:text-purple-400">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: "newLeads",
        label: "New",
        color: "text-slate-700",
        iconBg: "bg-slate-100",
        darkIconBg: "dark:bg-slate-800",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: "contactedLeads",
        label: "Contacted",
        color: "text-amber-700",
        iconBg: "bg-amber-100",
        darkIconBg: "dark:bg-amber-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223 3.677 3.677 0 00.554.025z" clipRule="evenodd" />
            </svg>
        ),
    },
    {
        key: "convertedLeads",
        label: "Converted",
        color: "text-green-600",
        iconBg: "bg-green-100",
        darkIconBg: "dark:bg-green-900/30",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
        ),
    },
];

// ── status components ─────────────────────────────────────────────────────────

const STATUS_STYLES = {
    NEW:       "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    CONTACTED: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    CONVERTED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

function StatusBadge({ status }) {
    const cls = STATUS_STYLES[status] ?? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status ?? "—"}
        </span>
    );
}

const STATUS_OPTIONS = ["NEW", "CONTACTED", "CONVERTED"];

function StatusDropdown({ lead, onUpdate, isUpdating }) {
    if (isUpdating) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                <StatusBadge status={lead.status} />
            </span>
        );
    }

    return (
        <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
            <select
                value={lead.status ?? "NEW"}
                onChange={(e) => onUpdate(lead.id, e.target.value)}
                className={`appearance-none text-xs font-medium pl-2.5 pr-6 py-0.5 rounded-full border-0 cursor-pointer outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-0 transition-colors ${STATUS_STYLES[lead.status] ?? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
            >
                {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
            </span>
        </div>
    );
}

// ── lead modal ────────────────────────────────────────────────────────────────

function LeadModal({ lead, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const field = (label, value) => (
        <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{value || <span className="text-gray-300 dark:text-gray-600">—</span>}</p>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{lead.name || "Unknown"}</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Lead #{lead.id}</p>
                    </div>
                </div>

                <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-5">
                    {field("Email", lead.email)}
                    {field("Phone", lead.phone)}
                    {field("Interest", lead.interest)}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <StatusBadge status={lead.status} />
                    </div>
                    {field("Created At", new Date(lead.createdAt).toLocaleString())}
                    {lead.email && (
                        <button
                            onClick={() => { window.location.href = `mailto:${lead.email}`; }}
                            className="flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors w-full justify-center"
                        >
                            <Mail size={15} />
                            Send Email
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
    const [leads, setLeads]       = useState([]);
    const [stats, setStats]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [updatingIds, setUpdatingIds]   = useState(new Set());
    const [copiedId, setCopiedId] = useState(null);

    const handleStatusUpdate = async (id, newStatus) => {
        const snapshot = leads;
        setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
        setUpdatingIds((prev) => new Set([...prev, id]));
        try {
            await updateLeadStatus(id, newStatus);
        } catch {
            setLeads(snapshot);
        } finally {
            setUpdatingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        }
    };

    const handleCopyPhone = (id, phone) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    useEffect(() => {
        Promise.all([getLeads(), getDashboardStats()])
            .then(([leadsRes, statsRes]) => {
                setLeads(Array.isArray(leadsRes) ? leadsRes : (leadsRes.data ?? []));
                setStats(statsRes.data ?? statsRes);
            })
            .catch((err) => setError(err.message || "Failed to load dashboard."))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return leads;
        return leads.filter(
            (l) =>
                l.name?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.phone?.includes(q) ||
                l.interest?.toLowerCase().includes(q) ||
                l.status?.toLowerCase().includes(q)
        );
    }, [leads, search]);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {selectedLead && (
                <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}

            {/* Page title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leads</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All captured contacts</p>
                </div>
                <a
                    href="http://localhost:5000/api/leads/export"
                    download="leads.csv"
                    className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    Export CSV
                </a>
            </div>

            {/* Loading */}
            {loading && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center py-20 gap-3">
                    <svg className="w-5 h-5 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Loading leads...</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {!loading && !error && stats && (
                <>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {STATS_CONFIG.map((s) => (
                            <div
                                key={s.key}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm px-5 py-5 flex flex-col gap-3"
                            >
                                <div className={`w-9 h-9 rounded-xl ${s.iconBg} ${s.darkIconBg} flex items-center justify-center`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className={`text-3xl font-bold leading-none ${s.color}`}>
                                        {stats[s.key] ?? 0}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Search + Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                            <div className="relative max-w-sm flex-1">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search leads..."
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:border-transparent transition"
                                />
                            </div>
                        </div>

                        {/* Empty state */}
                        {leads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-gray-400 dark:text-gray-500">
                                        <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No leads captured yet</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leads appear when users share contact info in chat.</p>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No matching leads found</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Try a different name, email, phone, or status.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Name</th>
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Email</th>
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Phone</th>
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Interest</th>
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Status</th>
                                            <th className="text-left px-5 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Created</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {filtered.map((lead) => (
                                            <tr
                                                key={lead.id}
                                                onClick={() => setSelectedLead(lead)}
                                                className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                                            >
                                                <td className="px-5 py-3.5">
                                                    {lead.name ? (
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                    {lead.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="font-medium text-gray-800 dark:text-gray-200">{lead.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 max-w-[180px]">
                                                    <span className="truncate block">{lead.email ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                    {lead.phone ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="px-5 py-3.5 max-w-[200px]">
                                                    <span className="block truncate text-gray-500 dark:text-gray-400 text-xs">{lead.interest ?? "—"}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <StatusDropdown
                                                        lead={lead}
                                                        onUpdate={handleStatusUpdate}
                                                        isUpdating={updatingIds.has(lead.id)}
                                                    />
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(lead.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        {lead.phone && (
                                                            <button
                                                                onClick={() => handleCopyPhone(lead.id, lead.phone)}
                                                                title="Copy phone number"
                                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                                                    copiedId === lead.id
                                                                        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                }`}
                                                            >
                                                                {copiedId === lead.id ? <Check size={13} /> : <Copy size={13} />}
                                                            </button>
                                                        )}
                                                        {lead.email && (
                                                            <button
                                                                onClick={() => { window.location.href = `mailto:${lead.email}`; }}
                                                                title={`Email ${lead.email}`}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                                            >
                                                                <Mail size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {filtered.length === leads.length
                                            ? `${leads.length} lead${leads.length !== 1 ? "s" : ""}`
                                            : `${filtered.length} of ${leads.length} leads`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
