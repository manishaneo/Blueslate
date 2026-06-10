import { useState, useEffect, useMemo } from "react";
import { useNavigate }                  from "react-router-dom";
import { Building2, CheckCircle2, Clock, Ban, ArrowRight, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import api from "../utils/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
    if (!dateStr) return "—";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)      return "Just now";
    if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = [
    "from-blue-500 to-blue-600",
    "from-violet-500 to-violet-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-cyan-500 to-cyan-600",
];

function avatarColor(id) {
    const s = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

function initials(name) {
    const w = (name || "?").trim().split(/\s+/);
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ Icon, label, value, colorCls, bgCls, loading }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgCls}`}>
                <Icon size={20} className={colorCls} />
            </div>
            <div>
                {loading
                    ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-1" />
                    : <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
                }
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const cfg = {
        active:        { cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", dot: "bg-green-500", label: "Active"        },
        pending_setup: { cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500", label: "Pending Setup" },
        disabled:      { cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",         dot: "bg-gray-400",  label: "Disabled"      },
    }[status] ?? { cls: "", dot: "bg-gray-400", label: status };

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-2.5 py-0.5 ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AppAdminDashboardPage() {
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [analyticsRes, businessesRes] = await Promise.all([
                    api.get("/app-admin/analytics"),
                    api.get("/app-admin/businesses"),
                ]);

                if (cancelled) return;
                setAnalytics(analyticsRes.data.data);
                setBusinesses(businessesRes.data.data);
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.message ?? "Failed to load dashboard data.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    const recent = useMemo(() =>
        [...businesses].slice(0, 5),
        [businesses]
    );

    if (error) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto">

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Overview of all businesses on Blueslate.
                </p>
            </div>

            {/* ── Stats grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    Icon={Building2}
                    label="Total Businesses"
                    value={analytics?.totalBusinesses}
                    colorCls="text-blue-600 dark:text-blue-400"
                    bgCls="bg-blue-50 dark:bg-blue-900/30"
                    loading={loading}
                />
                <StatCard
                    Icon={CheckCircle2}
                    label="Active"
                    value={analytics?.activeBusinesses}
                    colorCls="text-green-600 dark:text-green-400"
                    bgCls="bg-green-50 dark:bg-green-900/30"
                    loading={loading}
                />
                <StatCard
                    Icon={Clock}
                    label="Pending Setup"
                    value={analytics?.pendingSetupBusinesses}
                    colorCls="text-amber-600 dark:text-amber-400"
                    bgCls="bg-amber-50 dark:bg-amber-900/30"
                    loading={loading}
                />
                <StatCard
                    Icon={Ban}
                    label="Disabled"
                    value={analytics?.disabledBusinesses}
                    colorCls="text-gray-500 dark:text-gray-400"
                    bgCls="bg-gray-100 dark:bg-gray-800"
                    loading={loading}
                />
            </div>

            {/* ── Recent businesses ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Businesses</h2>
                    <button
                        onClick={() => navigate("/app-admin/businesses")}
                        className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                    >
                        View all
                        <ArrowRight size={12} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={22} className="text-gray-400 animate-spin" />
                    </div>
                ) : recent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Building2 size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No businesses yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                            No businesses have registered yet.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {recent.map((b) => (
                            <li
                                key={b.id}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                            >
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(b.id)} flex items-center justify-center shrink-0`}>
                                    <span className="text-xs font-bold text-white">
                                        {initials(b.businessName)}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {b.businessName}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        {b.website || b.ownerEmail || "—"}
                                    </p>
                                </div>

                                <StatusBadge status={b.status} />

                                <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                                    {relativeTime(b.createdAt)}
                                </span>

                                <ChevronRight size={14} className="text-gray-300 dark:text-gray-700 shrink-0" />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );
}
