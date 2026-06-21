import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, ArrowLeft, Mail } from "lucide-react";
import axios from "axios";
import { useTheme } from "../hooks/useTheme";
import { API_BASE_URL } from "../utils/api";

export default function ForgotPasswordPage() {
    const { dark, toggle } = useTheme();

    const [email,     setEmail]     = useState("");
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState("");
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
                email: email.trim().toLowerCase(),
            });
            setSubmitted(true);
        } catch (err) {
            // Surface only validation errors; hide everything else behind a
            // generic message so the endpoint can't be used for enumeration.
            const status = err.response?.status;
            if (status === 400) {
                setError(err.response?.data?.message ?? "Please enter a valid email address.");
            } else if (status === 429) {
                setError("Too many requests. Please wait a while before trying again.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                        </svg>
                    </div>
                    <span className="text-[16px] font-bold text-gray-900 dark:text-white tracking-tight">Blueslate</span>
                </div>
                <button
                    onClick={toggle}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    title={dark ? "Switch to light" : "Switch to dark"}
                >
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            {/* Card */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">

                    {submitted ? (
                        /* ── Success state ── */
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
                                <Mail size={22} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                If <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> is
                                registered, a reset link is on its way. Check your inbox and spam folder.
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                                The link expires in 1 hour. If you don't receive it, you can request another.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { setSubmitted(false); setError(""); }}
                                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Send another link
                                </button>
                                <Link
                                    to="/login"
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-sm"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* ── Request form ── */
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot your password?</h1>
                                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                    Enter your email and we'll send you a reset link.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
                                <form onSubmit={handleSubmit} noValidate className="space-y-5">

                                    {error && (
                                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email address
                                        </label>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-sm"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                                </svg>
                                                Sending…
                                            </>
                                        ) : "Send reset link"}
                                    </button>
                                </form>
                            </div>

                            <div className="mt-4 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Back to sign in
                                </Link>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
