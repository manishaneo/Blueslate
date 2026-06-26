import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Users,
    CalendarDays,
    Sparkles,
    MessageSquare,
    CheckCircle2,
    Mail,
    Phone,
    TrendingUp,
    Copy,
    Check,
    Plus,
    ChevronRight,
    PlayCircle,
    Settings,
} from "lucide-react";
import { getLeads, getDashboardStats } from "../services/leadService";
import { useNavigate } from "react-router-dom";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
    NEW:       "bg-blue-50  text-blue-700  dark:bg-blue-900/30  dark:text-blue-300",
    CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    CONVERTED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function StatusBadge({ status }) {
    const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status ?? "—"}
        </span>
    );
}

// ── kpi config ────────────────────────────────────────────────────────────────

const PRIMARY_KPIS = [
    {
        key:        "totalLeads",
        label:      "Total Leads",
        Icon:       Users,
        iconBg:     "bg-blue-50 dark:bg-blue-900/20",
        iconCls:    "text-blue-600 dark:text-blue-400",
        valueColor: "text-gray-900 dark:text-white",
    },
    {
        key:        "_rate",
        label:      "Conversion Rate",
        Icon:       TrendingUp,
        iconBg:     "bg-emerald-50 dark:bg-emerald-900/20",
        iconCls:    "text-emerald-600 dark:text-emerald-400",
        valueColor: "text-gray-900 dark:text-white",
        suffix:     "%",
    },
    {
        key:        "contactedLeads",
        label:      "Active Conversations",
        Icon:       MessageSquare,
        iconBg:     "bg-violet-50 dark:bg-violet-900/20",
        iconCls:    "text-violet-600 dark:text-violet-400",
        valueColor: "text-gray-900 dark:text-white",
    },
];

const SECONDARY_KPIS = [
    {
        key:        "newLeads",
        label:      "New Leads",
        Icon:       Sparkles,
    },
    {
        key:        "leadsToday",
        label:      "Leads Today",
        Icon:       CalendarDays,
    },
    {
        key:        "convertedLeads",
        label:      "Converted",
        Icon:       CheckCircle2,
    },
    {
        key:        "emailsCaptured",
        label:      "Emails",
        Icon:       Mail,
    },
    {
        key:        "phonesCaptured",
        label:      "Phones",
        Icon:       Phone,
    },
];

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [stats, setStats]   = useState(null);
    const [leads, setLeads]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);
    const [copied, setCopied] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([getLeads(), getDashboardStats()])
            .then(([leadsRes, statsRes]) => {
                setLeads(Array.isArray(leadsRes) ? leadsRes : (leadsRes.data ?? []));
                setStats(statsRes.data ?? statsRes);
            })
            .catch((e) => setError(e.message || "Failed to load dashboard data."))
            .finally(() => setLoading(false));
    }, []);

    const recentLeads = leads.slice(0, 5);
    const total = stats?.totalLeads ?? 0;
    const convRate = total > 0
        ? (((stats?.convertedLeads ?? 0) / total) * 100).toFixed(1)
        : "0.0";

    const pipelineCounts = {
        NEW:       leads.filter((l) => l.status === "NEW").length,
        CONTACTED: leads.filter((l) => l.status === "CONTACTED").length,
        CONVERTED: leads.filter((l) => l.status === "CONVERTED").length,
    };

    const handleCopy = (e, id, phone) => {
        e.stopPropagation();
        if (!phone) return;
        navigator.clipboard.writeText(phone).then(() => {
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const getKpiValue = (key) => {
        if (key === "_rate") return convRate;
        return stats?.[key] ?? 0;
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Page title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        AI receptionist performance overview
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <Link
                        to="/add-business"
                        className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                    >
                        <Plus size={15} />
                        Add Business
                    </Link>
                    <Link
                        to="/leads"
                        className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/50"
                    >
                        <Users size={15} />
                        Manage Leads
                    </Link>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 animate-pulse">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3" />
                                <div className="h-7 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2" />
                                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-64 animate-pulse" />
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load dashboard</p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !error && stats && (
                <>
                    {/* Primary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        {PRIMARY_KPIS.map((card) => (
                            <div
                                key={card.key}
                                className="group bg-white dark:bg-gray-900/60 rounded-[20px] border border-gray-100 dark:border-gray-800 shadow-sm px-6 py-6 flex flex-col hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
                            >
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                                        <card.Icon size={18} className={card.iconCls} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-tight">
                                        {card.label}
                                    </h3>
                                </div>
                                <div>
                                    <p className={`text-4xl font-extrabold tracking-tight ${card.valueColor}`}>
                                        {getKpiValue(card.key)}{card.suffix ?? ""}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Secondary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6">
                        {SECONDARY_KPIS.map((card) => (
                            <div
                                key={card.key}
                                className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/60 px-4 py-3.5 flex flex-col justify-between"
                            >
                                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                                    <card.Icon size={14} className="opacity-70" />
                                    <span className="text-xs font-medium">{card.label}</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {getKpiValue(card.key)}{card.suffix ?? ""}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Empty state */}
                    {leads.length === 0 && (
                        <div className="bg-white dark:bg-gray-900/60 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm px-8 py-20 flex flex-col items-center text-center max-w-3xl mx-auto my-10">
                            <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-6 shadow-inner ring-1 ring-gray-900/5 dark:ring-white/5">
                                <Sparkles size={40} className="text-blue-500 dark:text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No leads yet</h3>
                            <p className="text-base text-gray-500 dark:text-gray-400 max-w-md leading-relaxed mb-8">
                                Your AI receptionist is ready. Start receiving conversations and your leads will automatically appear here.
                            </p>
                            <div className="flex items-center gap-4">
                                <Link
                                    to="/demo"
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold shadow-md shadow-gray-900/10 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <PlayCircle size={18} />
                                    Test Customer Portal
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Settings size={18} />
                                    Go to Settings
                                </Link>
                            </div>
                        </div>
                    )}

                    {leads.length > 0 && (
                        <>
                            {/* Recent Leads */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Leads</h2>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            Latest {recentLeads.length} captured contacts
                                        </p>
                                    </div>
                                    <Link
                                        to="/leads"
                                        className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                    >
                                        View all
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20">
                                                <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Name</th>
                                                <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Email</th>
                                                <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Phone</th>
                                                <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                                                <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-3.5" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                            {recentLeads.map((lead) => (
                                                <tr 
                                                    key={lead.id} 
                                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                                    className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        {lead.name ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-200/50 dark:border-blue-700/50 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                        {lead.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                                                                    {lead.name}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-600 font-medium">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[180px] block font-medium">
                                                            {lead.email ?? <span className="text-gray-400 dark:text-gray-600">—</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 font-medium">
                                                        {lead.phone ?? <span className="text-gray-400 dark:text-gray-600">—</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={lead.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                        {fmt(lead.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {lead.phone && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${lead.phone}`; }}
                                                                    title="Call"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <Phone size={14} />
                                                                </button>
                                                            )}
                                                            {lead.email && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); window.open(`mailto:${lead.email}`, "_blank"); }}
                                                                    title={`Email ${lead.email}`}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <Mail size={14} />
                                                                </button>
                                                            )}
                                                            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
                                                                className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:white px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                            >
                                                                View
                                                                <ChevronRight size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Showing {recentLeads.length} of {leads.length} leads
                                    </p>
                                    <Link to="/leads" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                        View full list →
                                    </Link>
                                </div>
                            </div>

                            {/* Lead Pipeline */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                                <div className="mb-5">
                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Lead Pipeline</h2>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        Status distribution across {leads.length} lead{leads.length !== 1 ? "s" : ""}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                                    {[
                                        { key: "NEW",       label: "New",       desc: "Awaiting contact",  bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-400",   dot: "bg-blue-500" },
                                        { key: "CONTACTED", label: "Contacted", desc: "In conversation",   bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
                                        { key: "CONVERTED", label: "Converted", desc: "Deal closed",       bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
                                    ].map((stage, idx) => {
                                        const count = pipelineCounts[stage.key];
                                        const pct = leads.length > 0
                                            ? ((count / leads.length) * 100).toFixed(0)
                                            : 0;
                                        return (
                                            <div key={stage.key} className="relative flex flex-col">
                                                <div className={`rounded-2xl border ${stage.border} ${stage.bg} px-4 py-4 flex flex-col gap-2`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                                                        <span className={`text-xs font-semibold uppercase tracking-wide ${stage.text}`}>
                                                            {stage.label}
                                                        </span>
                                                    </div>
                                                    <p className={`text-3xl font-bold ${stage.text}`}>{count}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">{pct}% of total</p>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-600 hidden sm:block">{stage.desc}</p>
                                                </div>
                                                {idx < 2 && (
                                                    <div className="absolute -right-4 sm:-right-5 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-8">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300 dark:text-gray-700">
                                                            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                        <span>Pipeline progress</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">{convRate}% converted</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                        {leads.length > 0 && (
                                            <>
                                                <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${(pipelineCounts.NEW / leads.length) * 100}%` }} />
                                                <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${(pipelineCounts.CONTACTED / leads.length) * 100}%` }} />
                                                <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${(pipelineCounts.CONVERTED / leads.length) * 100}%` }} />
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        {[
                                            { label: "New",       color: "bg-blue-500" },
                                            { label: "Contacted", color: "bg-amber-500" },
                                            { label: "Converted", color: "bg-green-500" },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                                <span className="text-xs text-gray-400 dark:text-gray-500">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
