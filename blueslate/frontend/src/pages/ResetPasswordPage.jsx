import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sun, Moon, CheckCircle } from "lucide-react";
import axios from "axios";
import { useTheme } from "../hooks/useTheme";
import { API_BASE_URL } from "../utils/api";

export default function ResetPasswordPage() {
    const { dark, toggle } = useTheme();
    const [searchParams]   = useSearchParams();
    const navigate         = useNavigate();

    const token = searchParams.get("token") ?? "";

    const [password,        setPassword]        = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass,        setShowPass]        = useState(false);
    const [showConfirm,     setShowConfirm]     = useState(false);
    const [loading,         setLoading]         = useState(false);
    const [error,           setError]           = useState("");
    const [success,         setSuccess]         = useState(false);
    const redirectTimer = useRef(null);

    useEffect(() => {
        return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
    }, []);

    // Validate token format before hitting the API
    const TOKEN_RE = /^[0-9a-f]{64}$/;
    const tokenInvalid = !token || !TOKEN_RE.test(token);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("Please enter a new password.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, password });
            setSuccess(true);
            redirectTimer.current = setTimeout(() => navigate("/login", { replace: true }), 3000);
        } catch (err) {
            const status = err.response?.status;
            if (status === 400) {
                setError(err.response?.data?.message ?? "This reset link is invalid or has expired.");
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

                    {/* ── Invalid / missing token ── */}
                    {tokenInvalid && !success && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid reset link</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                This link is missing or malformed. Please request a new one.
                            </p>
                            <Link
                                to="/forgot-password"
                                className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-sm"
                            >
                                Request a new link
                            </Link>
                        </div>
                    )}

                    {/* ── Success state ── */}
                    {success && (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={22} className="text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password updated</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Your password has been changed. Redirecting you to sign in…
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-sm"
                            >
                                Sign in now
                            </Link>
                        </div>
                    )}

                    {/* ── Reset form ── */}
                    {!tokenInvalid && !success && (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set a new password</h1>
                                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                    Choose a strong password for your account.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
                                <form onSubmit={handleSubmit} noValidate className="space-y-5">

                                    {error && (
                                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                            {error}
                                            {error.includes("expired") || error.includes("invalid") ? (
                                                <span className="block mt-1">
                                                    <Link to="/forgot-password" className="underline font-medium">
                                                        Request a new reset link
                                                    </Link>
                                                </span>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* New password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            New password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPass ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="At least 8 characters"
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                tabIndex={-1}
                                                aria-label={showPass ? "Hide password" : "Show password"}
                                            >
                                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Confirm password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter your new password"
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                tabIndex={-1}
                                                aria-label={showConfirm ? "Hide password" : "Show password"}
                                            >
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
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
                                                Saving…
                                            </>
                                        ) : "Set new password"}
                                    </button>
                                </form>
                            </div>

                            <div className="mt-4 text-center">
                                <Link
                                    to="/login"
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
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
