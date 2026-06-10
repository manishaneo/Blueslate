import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { createBusinessContext } from "../services/businessContextService";

const CONTEXTS_KEY = "businessContexts";

const loadContexts = () => {
    try {
        return JSON.parse(localStorage.getItem(CONTEXTS_KEY)) || [];
    } catch {
        return [];
    }
};

const saveContext = (id, url) => {
    const contexts = loadContexts().filter((c) => c.id !== id);
    contexts.unshift({ id, url, createdAt: new Date().toISOString() });
    localStorage.setItem(CONTEXTS_KEY, JSON.stringify(contexts.slice(0, 10)));
};

const NEXT_STEPS = [
    "We learn about your business",
    "We create a demo experience",
    "You can test chat and voice conversations",
    "You can see how customer leads are captured",
];

export default function SetupPage() {
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState(null);
    const [contexts]                  = useState(loadContexts);
    const navigate                    = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await createBusinessContext(websiteUrl);
            const id = response.data.id;
            saveContext(id, websiteUrl);
            localStorage.setItem("businessContextId", id);
            window.location.href = "/experience";
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = (ctx) => {
        localStorage.setItem("businessContextId", ctx.id);
        window.location.href = "/experience";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 px-4 py-8 flex flex-col">

            <div className="w-full max-w-md mx-auto flex-1">

                {/* ── Back button ────────────────────────────────────────── */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    >
                        <ArrowLeft size={15} />
                        Back
                    </button>
                </div>

                {/* ── Hero ───────────────────────────────────────────────── */}
                <div className="text-center mb-8">
                    <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/60 rounded-full px-3 py-1 mb-4">
                        Free Demo
                    </span>

                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
                        Try Blueslate Free
                    </h1>
                    <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                        See how Blueslate answers customer questions and captures leads for your business in minutes.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 tracking-wide">
                        No credit card required &nbsp;·&nbsp; Free demo &nbsp;·&nbsp; Takes less than a minute
                    </p>
                </div>

                {/* ── Input card ─────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-700 p-8 mb-4">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Your Business Website
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    placeholder="https://yourbusiness.com"
                                    required
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 focus:border-transparent transition disabled:opacity-50"
                                />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                Enter your website and we'll create a demo experience based on your business.
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 mt-0.5 shrink-0">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                    </svg>
                                    Setting up your demo...
                                </>
                            ) : (
                                <>
                                    Create My Demo
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* ── What happens next ──────────────────────────────────── */}
                <div className="bg-white/70 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/60 px-5 py-4 mb-6">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                        What happens next?
                    </p>
                    <ul className="space-y-2.5">
                        {NEXT_STEPS.map((step) => (
                            <li key={step} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle2 size={14} className="text-green-500 dark:text-green-400 shrink-0" />
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Previous demos ─────────────────────────────────────── */}
                {contexts.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 text-center">
                            Previous demos
                        </p>
                        <div className="space-y-2">
                            {contexts.map((ctx) => (
                                <button
                                    key={ctx.id}
                                    onClick={() => handleSwitch(ctx)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 shadow-sm transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 flex items-center justify-center shrink-0 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                            {ctx.url}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Previous demo</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 shrink-0 transition-colors">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
