import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import api from "../utils/api";
import { getCurrentUser, setAuth } from "../utils/auth";
import { useTheme } from "../hooks/useTheme";

// ── Wordmark ──────────────────────────────────────────────────────────────────

function Wordmark() {
    return (
        <div className="flex items-center gap-2 justify-center">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50">
                <svg viewBox="0 0 24 24" fill="currentColor" className="text-white w-[18px] h-[18px]">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Blueslate</span>
        </div>
    );
}

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({ onContinue, businessName, websiteUrl }) {
    return (
        <div className="flex flex-col items-center text-center py-4">
            <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 animate-ping opacity-20" />
                <div className="relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Business Added
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto mb-6">
                Auri has learned about your new business and is ready to capture leads and answer customer questions.
            </p>

            <div className="w-full bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 mb-6 text-left">
                {[
                    { label: "Business", value: businessName || "—" },
                    { label: "Website",  value: websiteUrl  || "—" },
                    { label: "Status",   value: "Ready",    green: true },
                ].map(({ label, value, green }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
                        <span className={`text-xs font-semibold truncate max-w-[60%] text-right ${green ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"}`}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-7">
                {["Website connected", "Auri trained", "Dashboard ready"].map((item) => (
                    <span key={item} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <CheckCircle2 size={12} className="text-green-500 dark:text-green-400 shrink-0" />
                        {item}
                    </span>
                ))}
            </div>

            <button
                onClick={onContinue}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
            >
                Go To Dashboard
                <ArrowRight size={15} />
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddBusinessPage() {
    const navigate = useNavigate();
    const { dark, toggle } = useTheme();

    const [businessName, setBusinessName] = useState("");
    const [websiteUrl, setWebsiteUrl]     = useState("");
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [done, setDone]                 = useState(false);
    const [addedBusiness, setAddedBusiness] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!businessName.trim()) { setError("Please enter a business name."); return; }
        if (!websiteUrl.trim())   { setError("Please enter your business website."); return; }

        setLoading(true);

        try {
            let url = websiteUrl.trim();
            if (url && !/^https?:\/\//i.test(url)) {
                url = "https://" + url;
            }

            const { data } = await api.post("/business", {
                businessName: businessName.trim(),
                website:      url,
            });

            const newBusiness = data.data.business;

            // Merge the new business into auth state immediately — no logout required.
            const current = getCurrentUser();
            setAuth({
                ...current,
                activeBusinessId: newBusiness.id,
                businessName:     newBusiness.name,
                businesses:       [...(current?.businesses ?? []), newBusiness],
            });

            setAddedBusiness(newBusiness);
            setDone(true);
        } catch (err) {
            const msg =
                err.response?.data?.errors?.[0]?.message ??
                err.response?.data?.message ??
                "Something went wrong. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-16 relative">

            {/* Back to Dashboard */}
            <button
                onClick={() => navigate("/dashboard")}
                className="absolute top-5 left-6 z-10 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={15} />
                Back to Dashboard
            </button>

            {/* Theme toggle */}
            <div className="absolute top-5 right-6 z-10">
                <button
                    onClick={toggle}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all"
                    title={dark ? "Light mode" : "Dark mode"}
                >
                    {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>

            <div className="w-full max-w-md">

                {/* ── Card ──────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-800 overflow-hidden">

                    {/* Card header */}
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                        {!done && <Wordmark />}
                        <div className={`${!done ? "mt-5" : ""} text-center`}>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {done ? "Business Added" : "Add Another Business"}
                            </h1>
                            {!done && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                    Set up a new business under your existing account. Your login and current business remain unchanged.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="px-8 py-7">
                        {done ? (
                            <SuccessState
                                onContinue={() => navigate("/dashboard")}
                                businessName={addedBusiness?.name ?? businessName}
                                websiteUrl={addedBusiness?.website ?? websiteUrl}
                            />
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* Business name */}
                                <div>
                                    <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Business Name
                                    </label>
                                    <input
                                        id="businessName"
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => { setBusinessName(e.target.value); setError(null); }}
                                        placeholder="Acme Corp"
                                        disabled={loading}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                    />
                                </div>

                                {/* Website */}
                                <div>
                                    <label htmlFor="website" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Business Website
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 dark:text-gray-500">
                                                <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            id="website"
                                            type="text"
                                            value={websiteUrl}
                                            onChange={(e) => { setWebsiteUrl(e.target.value); setError(null); }}
                                            placeholder="https://yourbusiness.com"
                                            disabled={loading}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                        />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                        Auri will learn about this business from its website content.
                                    </p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Setting up your business…
                                        </>
                                    ) : (
                                        <>
                                            Add Business
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>

                                {loading && (
                                    <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                                        This may take up to 30 seconds while Auri learns about your website.
                                    </p>
                                )}
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {!done && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                        Your existing business and current session remain unchanged.
                    </p>
                )}
            </div>
        </div>
    );
}
