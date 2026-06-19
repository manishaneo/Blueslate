import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../utils/api";
import {
    ArrowLeft, LayoutDashboard, Moon, Sun, Phone, ExternalLink,
    BarChart2, CheckCircle2, Clock, User, PhoneCall, MessageSquare, Loader2,
    RefreshCw, Globe,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import AgentStatusBadge from "../components/AgentStatusBadge";

const POLL_INTERVAL_MS = 30_000; // refresh call list every 30 s

const LEAD_STATUS_STYLES = {
    Hot:  "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    Warm: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
    Cold: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs) {
    if (secs == null) return "—";
    return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
}

function formatCallTime(iso) {
    if (!iso) return "—";
    const d   = new Date(iso);
    const now = new Date();
    const t   = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return `Today, ${t}`;
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return `Yesterday, ${t}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${t}`;
}

async function fetchDemoInfo() {
    try {
        const res  = await fetch(`${API_BASE_URL}/demo/info`);
        const json = await res.json();
        return json.success ? json.data : null;
    } catch {
        return null;
    }
}

export default function DemoPage() {
    const { dark, toggle } = useTheme();
    const [view, setView]  = useState("home");

    const [demoData, setDemoData] = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [seeding,  setSeeding]  = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCall, setSelectedCall] = useState(null);

    // Fetch and update live data without resetting the full loading state.
    const refreshData = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        const info = await fetchDemoInfo();
        if (info) setDemoData(info);
        if (showSpinner) setRefreshing(false);
    }, []);

    useEffect(() => {
        async function load() {
            setLoading(true);

            // Step 1 — fetch existing info
            let info = await fetchDemoInfo();

            // Step 2 — no BusinessContext yet: seed XP League (15–45 s first time)
            if (!info?.businessName) {
                setSeeding(true);
                await fetch(`${API_BASE_URL}/demo/seed`, { method: "POST" }).catch(() => {});
                setSeeding(false);

                // Step 3 — refetch after seed
                info = await fetchDemoInfo();
            }

            setDemoData(info);
            setLoading(false);
        }
        load();
    }, []);

    // Poll every 30 s while the dashboard tab is visible so new calls appear automatically.
    useEffect(() => {
        if (view !== "dashboard") return;
        const id = setInterval(() => refreshData(false), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [view, refreshData]);

    const businessName = demoData?.businessName ?? "XP League Frisco";
    const phoneNumber  = demoData?.phoneNumber  ?? null;
    const leadCount    = demoData?.leadCount    ?? 0;
    const recentLeads  = demoData?.recentLeads  ?? [];
    const recentCalls  = demoData?.recentCalls  ?? [];
    const agentStatus     = demoData?.agentStatus     ?? "available";
    const activeCallCount = demoData?.activeCallCount ?? 0;

    return (
        <div className="min-h-screen bg-white dark:bg-[#060c17] flex flex-col antialiased">

            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-5 shrink-0">
                <div className="flex items-center gap-4">
                    <a href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/40">
                            <LayoutDashboard size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                            Blueslate
                        </span>
                    </a>

                    {view === "dashboard" && (
                        <>
                            <span className="text-gray-300 dark:text-white/15 select-none leading-none" aria-hidden="true">/</span>
                            <button
                                onClick={() => setView("home")}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                <ArrowLeft size={12} />
                                Back to Showcase
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={toggle}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
                    title={dark ? "Light mode" : "Dark mode"}
                >
                    {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>

            {/* ── Home view ─────────────────────────────────────────────────────── */}
            {view === "home" && (
                <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-lg">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-5">
                                <Phone size={11} />
                                Live AI Receptionist Demo
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
                                {businessName}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                AI Receptionist Demo
                            </p>
                        </div>

                        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl shadow-gray-200/60 dark:shadow-black/40 p-6 sm:p-8 space-y-6">

                            {/* Status cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        Knowledge Base
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-green-500" />
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ready</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        AI Status
                                    </p>
                                    <AgentStatusBadge status={agentStatus} />
                                    {activeCallCount > 0 && (
                                        <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                                            {activeCallCount} active call{activeCallCount !== 1 ? "s" : ""}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Phone number */}
                            <div className="text-center py-6 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/2">
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                    Demo Line
                                </p>
                                <div className="flex items-center justify-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow shadow-blue-600/30">
                                        <Phone size={14} className="text-white" />
                                    </div>

                                    {loading || seeding ? (
                                        <span className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                                            <Loader2 size={16} className="animate-spin" />
                                            {seeding ? "Preparing demo…" : "Loading…"}
                                        </span>
                                    ) : (
                                        <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
                                            {phoneNumber ?? "Not configured"}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                                    Call this number from your phone to speak with the AI receptionist.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setView("dashboard")}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    <BarChart2 size={15} />
                                    View {businessName} Dashboard
                                </button>
                                <a
                                    href="https://xpleague.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <ExternalLink size={14} />
                                    Visit XP League Website
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Dashboard view ────────────────────────────────────────────────── */}
            {view === "dashboard" && (
                <div className="relative z-10 flex-1 px-4 pb-16 max-w-5xl mx-auto w-full">

                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {businessName} Dashboard
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Live activity from your AI receptionist
                        </p>
                    </div>

                    <div className="space-y-10">

                        {/* ── Call History ─────────────────────────────────────── */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <SectionHeader icon={PhoneCall} title="Call History" count={recentCalls.length} unit="calls" />
                                <button
                                    onClick={() => refreshData(true)}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
                                    title="Refresh calls"
                                >
                                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                                    {refreshing ? "Refreshing…" : "Refresh"}
                                </button>
                            </div>
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-x-auto">
                                {recentCalls.length === 0 ? (
                                    <p className="px-5 py-8 text-sm text-gray-400 dark:text-gray-500 text-center italic">
                                        No calls yet. Call the demo line to get started.
                                    </p>
                                ) : (
                                    <table className="w-full text-sm min-w-[540px]">
                                        <TableHead cols={["Caller", "Duration", "Status", "Time"]} />
                                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                            {recentCalls.map((call) => (
                                                <tr key={call.id} onClick={() => setSelectedCall(call)} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer">
                                                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white font-mono text-xs">
                                                        {call.callType === "webCall" || call.from === "unknown" ? (
                                                            <span className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400 not-italic font-semibold">
                                                                <Globe size={11} />
                                                                Web Call
                                                            </span>
                                                        ) : call.from}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                            <Clock size={12} />
                                                            {formatDuration(call.duration)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs capitalize">
                                                        {call.status}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs">
                                                        {formatCallTime(call.startedAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>

                        {/* ── Leads Captured ───────────────────────────────────── */}
                        <section>
                            <SectionHeader icon={User} title="Leads Captured" count={leadCount} unit="leads" />
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-x-auto">
                                {recentLeads.length === 0 ? (
                                    <p className="px-5 py-8 text-sm text-gray-400 dark:text-gray-500 text-center italic">
                                        No leads captured yet.
                                    </p>
                                ) : (
                                    <table className="w-full text-sm min-w-[540px]">
                                        <TableHead cols={["Name", "Phone", "Interest", "Status"]} />
                                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                            {recentLeads.map((lead) => (
                                                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                                                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{lead.name}</td>
                                                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{lead.phone}</td>
                                                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{lead.interest}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${LEAD_STATUS_STYLES[lead.status] ?? ""}`}>
                                                            {lead.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>

                        {/* ── Call Details ──────────────────────────────────────── */}
                        <section>
                            <SectionHeader icon={MessageSquare} title="Call Details" />
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-5">
                                {!selectedCall ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6 italic">
                                        Select a call to view details
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Caller</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">
                                                {selectedCall.callType === "webCall" || selectedCall.from === "unknown"
                                                    ? "Web Call"
                                                    : selectedCall.from}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Call Type</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                                {selectedCall.callType === "webCall" ? "Web Call"
                                                    : selectedCall.callType === "inboundPhoneCall" ? "Phone Call"
                                                    : selectedCall.callType ?? "—"}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{selectedCall.status}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Duration</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDuration(selectedCall.duration)}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8 col-span-2">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Time</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCallTime(selectedCall.startedAt)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                    </div>
                </div>
            )}
        </div>
    );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, unit, subtitle }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-gray-500">({count} {unit})</span>
            )}
            {subtitle && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>
            )}
        </div>
    );
}

function TableHead({ cols }) {
    return (
        <thead>
            <tr className="border-b border-gray-100 dark:border-white/8">
                {cols.map((h) => (
                    <th
                        key={h}
                        className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                    >
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
    );
}
