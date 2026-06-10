import { useState, useEffect, useMemo } from "react";
import { Search, Ban, CheckCircle2, Building2, Globe, ExternalLink, Loader2, AlertCircle } from "lucide-react";
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

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = {
        active:        { cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", dot: "bg-green-500", label: "Active"        },
        pending_setup: { cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500", label: "Pending Setup" },
        disabled:      { cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",         dot: "bg-gray-400",  label: "Disabled"      },
    }[status] ?? { cls: "", dot: "bg-gray-400", label: status };

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-2.5 py-1 whitespace-nowrap ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ children, onClick, title, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                disabled
                    ? "text-gray-200 dark:text-gray-700 cursor-not-allowed"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
        >
            {children}
        </button>
    );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function BusinessRow({ business, toggling, onToggleStatus }) {
    const { id, businessName, ownerEmail, ownerName, website, createdAt, status } = business;

    return (
        <tr className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors ${status === "disabled" ? "opacity-60" : ""}`}>

            {/* Business */}
            <td className="py-4 px-4 pl-6">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(id)} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{initials(businessName)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{businessName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{ownerEmail ?? "—"}</p>
                    </div>
                </div>
            </td>

            {/* Website */}
            <td className="py-4 px-4">
                {website ? (
                    <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[160px]"
                    >
                        <Globe size={11} className="shrink-0" />
                        {website.replace(/^https?:\/\/(www\.)?/, "")}
                        <ExternalLink size={10} className="shrink-0 opacity-60" />
                    </a>
                ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                )}
            </td>

            {/* Status */}
            <td className="py-4 px-4">
                <StatusBadge status={status} />
            </td>

            {/* Owner */}
            <td className="py-4 px-4">
                <span className={`text-sm ${ownerName ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-300 dark:text-gray-600"}`}>
                    {ownerName || "—"}
                </span>
            </td>

            {/* Joined */}
            <td className="py-4 px-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {relativeTime(createdAt)}
                </span>
            </td>

            {/* Actions */}
            <td className="py-4 px-4 pr-6">
                <div className="flex items-center justify-end gap-0.5">
                    <ActionBtn
                        onClick={() => onToggleStatus(id, status)}
                        title={status === "disabled" ? "Enable business" : "Disable business"}
                        disabled={toggling === id || status === "pending_setup"}
                    >
                        {toggling === id
                            ? <Loader2 size={13} className="animate-spin" />
                            : status === "disabled"
                                ? <CheckCircle2 size={13} className="text-gray-400 hover:text-emerald-500" />
                                : <Ban size={13} className="hover:text-red-500" />
                        }
                    </ActionBtn>
                </div>
            </td>
        </tr>
    );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTERS = [
    { key: "all",          label: "All"           },
    { key: "active",       label: "Active"        },
    { key: "pending_setup", label: "Pending Setup" },
    { key: "disabled",     label: "Disabled"      },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);
    const [filter, setFilter]         = useState("all");
    const [search, setSearch]         = useState("");
    const [toggling, setToggling]     = useState(null); // businessId currently being toggled

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await api.get("/app-admin/businesses");
                if (!cancelled) setBusinesses(res.data.data);
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.message ?? "Failed to load businesses.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    // ── Counts for tab badges ──────────────────────────────────────────
    const counts = useMemo(() => ({
        all:           businesses.length,
        active:        businesses.filter((b) => b.status === "active").length,
        pending_setup: businesses.filter((b) => b.status === "pending_setup").length,
        disabled:      businesses.filter((b) => b.status === "disabled").length,
    }), [businesses]);

    // ── Filtered + searched list ──────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return businesses.filter((b) => {
            const matchesFilter =
                filter === "all" ? true : b.status === filter;

            const matchesSearch =
                !q ||
                b.businessName.toLowerCase().includes(q) ||
                (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
                (b.ownerName  && b.ownerName.toLowerCase().includes(q))  ||
                (b.website    && b.website.toLowerCase().includes(q));

            return matchesFilter && matchesSearch;
        });
    }, [businesses, filter, search]);

    // ── Toggle disable/enable ─────────────────────────────────────────
    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === "disabled" ? "active" : "disabled";
        setToggling(id);
        try {
            const res = await api.patch(`/app-admin/businesses/${id}/status`, { status: newStatus });
            setBusinesses((prev) =>
                prev.map((b) => b.id === id ? { ...b, status: res.data.data.status } : b)
            );
        } catch (err) {
            // Surface a brief inline error without wiping the whole page
            setError(err.response?.data?.message ?? "Failed to update business status.");
            setTimeout(() => setError(null), 4000);
        } finally {
            setToggling(null);
        }
    };

    if (error && businesses.length === 0) {
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
        <div className="flex flex-col h-full">

            {/* ── Sticky page header ───────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4 px-6 sm:px-8 pt-6 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Businesses</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Manage all registered businesses.
                        </p>
                    </div>
                </div>

                {/* Inline action error banner */}
                {error && businesses.length > 0 && (
                    <div className="mx-6 sm:mx-8 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                        <AlertCircle size={13} className="shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 sm:px-8 pb-4">
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search businesses…"
                            className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        {FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    filter === key
                                        ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                {label}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    filter === key
                                        ? "bg-violet-200 dark:bg-violet-800/60 text-violet-700 dark:text-violet-300"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                                }`}>
                                    {loading ? "—" : counts[key]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={24} className="text-gray-400 animate-spin" />
                    </div>
                ) : (
                    <div className="min-w-[700px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                                    <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-3 px-4 pl-6">Business</th>
                                    <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-3 px-4">Website</th>
                                    <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                                    <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-3 px-4">Owner</th>
                                    <th className="text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-3 px-4">Joined</th>
                                    <th className="py-3 px-4 pr-6" />
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                                {filtered.length > 0 ? (
                                    filtered.map((b) => (
                                        <BusinessRow
                                            key={b.id}
                                            business={b}
                                            toggling={toggling}
                                            onToggleStatus={handleToggleStatus}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <Building2 size={28} className="text-gray-300 dark:text-gray-700 mb-3" />
                                                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                                                    {search ? "No businesses match your search." : "No businesses yet."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Footer count ─────────────────────────────────────────── */}
            {!loading && filtered.length > 0 && (
                <div className="shrink-0 px-6 sm:px-8 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Showing {filtered.length} of {businesses.length} {businesses.length === 1 ? "business" : "businesses"}
                    </p>
                </div>
            )}
        </div>
    );
}
