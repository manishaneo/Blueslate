import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import axios from "axios";
import { setAuth, setToken } from "../utils/auth";
import api from "../utils/api";
import { useTheme } from "../hooks/useTheme";

const API_URL = "http://localhost:5000/api";

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
                Auri is Ready
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto mb-6">
                Auri has learned about your business and is ready to answer customer questions, capture leads, and assist your customers.
            </p>

            {/* Success summary card */}
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

            {/* Trust row */}
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

export default function BusinessSetupPage() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { dark, toggle } = useTheme();
    const [websiteUrl, setWebsiteUrl] = useState(location.state?.website ?? "");
    const [loading, setLoading]       = useState(false);
    const [phase, setPhase]           = useState(null); // "registering" | "training" | null
    const [registered, setRegistered] = useState(false);
    const [error, setError]           = useState(null);
    const [done, setDone]             = useState(false);

    const businessName = location.state?.businessName ?? "";

    // Guard: if arrived without onboarding state, send back to /join
    useEffect(() => {
        if (!location.state?.email) {
            navigate("/join", { replace: true });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!websiteUrl.trim()) { setError("Please enter your business website."); return; }
        setLoading(true);
        setError(null);

        try {
            // Step 1: Register (skipped on retry if already completed)
            if (!registered) {
                setPhase("registering");
                const { data } = await axios.post(`${API_URL}/auth/register`, {
                    ownerName:    location.state.ownerName,
                    businessName: location.state.businessName,
                    email:        location.state.email,
                    phone:        location.state.phone,
                    password:     location.state.password,
                    website:      websiteUrl.trim(),
                });

                setToken(data.token);
                setAuth({
                    ...data.user,
                    activeBusinessId: data.business.id,
                    businessName:     data.business.name,
                    businesses:       [data.business],
                });
                setRegistered(true);
            }

            // Step 2: Scrape website and create BusinessContext.
            // JWT is now in localStorage; api interceptor attaches it automatically.
            // businessId is resolved server-side from req.user.id — never sent from client.
            setPhase("training");
            await api.post("/business-context", { websiteUrl: websiteUrl.trim() });

            setDone(true);
        } catch (err) {
            const msg = err.response?.data?.message ?? "Something went wrong. Please try again.";
            setError(registered
                ? `Website training failed: ${msg} Please check the URL and try again.`
                : msg
            );
        } finally {
            setLoading(false);
            setPhase(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-16 relative">

            {/* Back button — hidden on success screen */}
            {!done && (
                <button
                    onClick={() => navigate("/join")}
                    className="absolute top-5 left-6 z-10 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={15} />
                    Back
                </button>
            )}

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

                {/* ── Step indicator ────────────────────────────────────── */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {/* Step 1 — done */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <CheckCircle2 size={11} className="text-white" />
                        </div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Account</span>
                    </div>
                    <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
                    {/* Step 2 — current */}
                    <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            done
                                ? "bg-blue-600"
                                : "bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50"
                        }`}>
                            {done
                                ? <CheckCircle2 size={11} className="text-white" />
                                : <span className="text-white">2</span>
                            }
                        </div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Business</span>
                    </div>
                    <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
                    {/* Step 3 — upcoming */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">3</span>
                        </div>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Dashboard</span>
                    </div>
                </div>

                {/* ── Card ──────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-800 overflow-hidden">

                    {/* Card header */}
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                        {!done && <Wordmark />}
                        <div className={`${!done ? "mt-5" : ""} text-center`}>
                            {!done && businessName && (
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 tracking-wide">
                                    Setting up: {businessName}
                                </p>
                            )}
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {done ? "Welcome to Blueslate" : "Connect your website"}
                            </h1>
                            {!done && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                    Auri will learn about your business so she can answer customer questions and capture leads for you.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="px-8 py-7">
                        {done ? (
                            <SuccessState
                                onContinue={() => navigate("/dashboard")}
                                businessName={businessName}
                                websiteUrl={websiteUrl}
                            />
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
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
                                            onChange={(e) => {
                                                setWebsiteUrl(e.target.value);
                                                setError(null);
                                            }}
                                            placeholder="https://yourbusiness.com"
                                            disabled={loading}
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
                                                error
                                                    ? "border-red-300 dark:border-red-700"
                                                    : "border-gray-200 dark:border-gray-700"
                                            }`}
                                        />
                                    </div>
                                    {error ? (
                                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
                                    ) : (
                                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                            Auri will learn about your services, pricing, and business information.
                                        </p>
                                    )}
                                </div>

                                {/* What happens next */}
                                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 px-4 py-4">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-3">
                                        What happens next?
                                    </p>
                                    <ul className="space-y-2">
                                        {[
                                            "We analyze your website",
                                            "Auri learns about your business",
                                            "Your dashboard is created",
                                            "You're ready to test voice and chat",
                                        ].map((item) => (
                                            <li key={item} className="flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                                                <CheckCircle2 size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            {phase === "training"
                                                ? "Training Auri on your website…"
                                                : "Creating your account…"}
                                        </>
                                    ) : (
                                        <>
                                            {registered ? "Retry website training" : "Continue to Dashboard"}
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                {!done && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                        You can update your website later from your dashboard settings.
                    </p>
                )}

            </div>
        </div>
    );
}
