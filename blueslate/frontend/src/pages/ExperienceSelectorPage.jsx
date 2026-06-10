import { Navigate, useNavigate } from "react-router-dom";
import {
    PhoneCall, MessageSquare, CheckCircle2, Globe,
    Calendar, LayoutDashboard, ArrowLeft, ArrowRight,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function loadCtx() {
    try {
        const id   = localStorage.getItem("businessContextId");
        const list = JSON.parse(localStorage.getItem("businessContexts") || "[]");
        const ctx  = list.find((c) => String(c.id) === String(id)) ?? null;
        return { id, ctx };
    } catch {
        return { id: null, ctx: null };
    }
}

function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url || "—"; }
}

function relativeTime(dateStr) {
    if (!dateStr) return "Just now";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryRow({ icon: Icon, label, value, cls = "" }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {label}
                </p>
                <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 truncate mt-0.5 ${cls}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function FeatureItem({ text }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={13} className="text-current opacity-70 shrink-0" />
            {text}
        </li>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ExperienceSelectorPage() {
    const navigate = useNavigate();
    const { id, ctx } = loadCtx();

    if (!id) return <Navigate to="/setup" replace />;

    const businessName = ctx?.title || extractDomain(ctx?.url) || "Your Business";
    const websiteUrl   = ctx?.websiteUrl || ctx?.url || "—";
    const lastUpdated  = relativeTime(ctx?.createdAt);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate("/setup")}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    >
                        <ArrowLeft size={15} />
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
                            <LayoutDashboard size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Blueslate</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

                {/* ── Success header ──────────────────────────────────────── */}
                <div className="text-center mb-10">
                    <div className="relative inline-flex items-center justify-center mb-5">
                        <div className="absolute w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 animate-ping opacity-20" />
                        <div className="relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 flex items-center justify-center shadow-sm">
                            <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Your demo is ready
                    </h1>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                        You can now test how Blueslate interacts with customers interested in your business.
                    </p>
                </div>

                {/* ── Business card ────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6 mb-10">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Business</h2>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Demo Ready
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
                        <SummaryRow icon={LayoutDashboard} label="Business Name" value={businessName} />
                        <SummaryRow icon={Globe}           label="Website"       value={websiteUrl} cls="text-blue-600 dark:text-blue-400" />
                        <SummaryRow icon={Calendar}        label="Created"       value={lastUpdated} />
                    </div>
                </div>

                {/* ── Choice heading ───────────────────────────────────────── */}
                <div className="text-center mb-7">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                        Choose your experience
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Both demos are tailored to your business.
                    </p>
                </div>

                {/* ── Experience cards ─────────────────────────────────────── */}
                <div className="grid sm:grid-cols-2 gap-5">

                    {/* Card 1 — Voice Demo */}
                    <button
                        onClick={() => navigate("/receptionist")}
                        className="group relative flex flex-col items-start text-left w-full bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-2xl p-6 sm:p-7 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 -translate-y-0 hover:-translate-y-0.5"
                    >
                        <div className="absolute top-4 right-4">
                            <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Recommended
                            </span>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                            <PhoneCall size={22} className="text-white" />
                        </div>

                        <h3 className="text-lg font-black text-white mb-2">Voice Demo</h3>
                        <p className="text-sm text-blue-100 leading-relaxed mb-5">
                            Hear Blueslate handle a live customer call for your business — just like a real receptionist.
                        </p>

                        <ul className="space-y-2 text-blue-100 mb-7 w-full">
                            {[
                                "Answers in your business's voice",
                                "Captures customer details",
                                "Escalates when needed",
                                "Works 24/7",
                            ].map((f) => <FeatureItem key={f} text={f} />)}
                        </ul>

                        <div className="mt-auto w-full flex items-center justify-between bg-white/15 hover:bg-white/25 rounded-xl px-4 py-3 transition-colors group-hover:bg-white/20">
                            <span className="text-sm font-bold text-white">Start Voice Demo</span>
                            <ArrowRight size={16} className="text-white group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </button>

                    {/* Card 2 — Chat Demo */}
                    <button
                        onClick={() => navigate("/chat")}
                        className="group flex flex-col items-start text-left w-full bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/70 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 -translate-y-0 hover:-translate-y-0.5"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 flex items-center justify-center mb-4 transition-colors">
                            <MessageSquare size={22} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>

                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                            Chat Demo
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                            See how Blueslate answers customer questions in real time, using your business content.
                        </p>

                        <ul className="space-y-2 text-gray-500 dark:text-gray-400 mb-7 w-full">
                            {[
                                "Instant answers to customer questions",
                                "Understands what customers need",
                                "Captures leads automatically",
                                "Tailored to your business",
                            ].map((f) => <FeatureItem key={f} text={f} />)}
                        </ul>

                        <div className="mt-auto w-full flex items-center justify-between bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-xl px-4 py-3 transition-colors border border-gray-200 dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-blue-800">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                Open Chat Demo
                            </span>
                            <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </button>
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8 max-w-sm mx-auto leading-relaxed">
                    This is a free demo — no commitment required. You can leave at any time.
                </p>
            </main>
        </div>
    );
}
