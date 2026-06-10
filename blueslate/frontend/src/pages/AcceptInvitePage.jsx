import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Shield, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { setAuth } from "../utils/auth";

// ── Mock data ─────────────────────────────────────────────────────────────────
// TODO: replace with GET /api/invitations/:token

const MOCK_INVITE = {
    name: "John Smith",
    email: "john@company.com",
    role: "Business Admin",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Wordmark() {
    return (
        <div className="flex items-center gap-2 justify-center">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-white w-[18px] h-[18px]">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Blueslate</span>
        </div>
    );
}

function InviteeRow({ Icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Icon size={13} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">
                    {label}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{value}</p>
            </div>
        </div>
    );
}

function PasswordInput({ id, label, value, onChange, error, placeholder = "••••••••" }) {
    const [visible, setVisible] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={id === "password" ? "new-password" : "new-password"}
                    className={`w-full pr-10 pl-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-700 outline-none transition focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        error
                            ? "border-red-300 dark:border-red-700 focus:ring-red-400"
                            : "border-gray-200 dark:border-gray-600"
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} className="shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Token states ──────────────────────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Verifying your invitation</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Just a moment…</p>
            </div>
        </div>
    );
}

function InvalidState() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={26} className="text-red-500 dark:text-red-400" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invalid invitation link</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                    This link may have expired or already been used. Contact your administrator for a new invitation.
                </p>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    // "loading" | "valid" | "invalid"
    const [tokenState, setTokenState] = useState("loading");

    const [form, setForm] = useState({ fullName: "", password: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // TODO: replace with GET /api/invitations/:token → invitee data
    useEffect(() => {
        if (!token) {
            setTokenState("invalid");
            return;
        }
        const timer = setTimeout(() => setTokenState("valid"), 900);
        return () => clearTimeout(timer);
    }, [token]);

    const setField = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((err) => ({ ...err, [key]: undefined }));
    };

    const validate = () => {
        const errs = {};
        if (!form.fullName.trim())          errs.fullName        = "Full name is required.";
        if (form.password.length < 8)       errs.password        = "Password must be at least 8 characters.";
        if (form.password !== form.confirmPassword)
                                            errs.confirmPassword = "Passwords do not match.";
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        // TODO: POST /api/invitations/:token/accept  { fullName, password }
        //       → returns JWT / session token → store in auth context
        setTimeout(() => {
            setAuth("business_admin");
            navigate("/business-setup");
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">

                {/* ── Card ──────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-800 overflow-hidden">

                    {/* Card header strip */}
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <Wordmark />
                        <div className="mt-5 text-center">
                            <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/60 rounded-full px-3 py-1 mb-3">
                                Invitation
                            </span>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Welcome to Blueslate
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                You've been invited to manage your business on Blueslate.
                            </p>
                        </div>
                    </div>

                    {/* Card body */}
                    <div className="px-8 py-7">
                        {tokenState === "loading" && <LoadingState />}
                        {tokenState === "invalid" && <InvalidState />}

                        {tokenState === "valid" && (
                            <div className="space-y-6">

                                {/* ── Invitee info ──────────────────── */}
                                <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl px-4 py-4 space-y-3">
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1">
                                        Your invitation
                                    </p>
                                    <InviteeRow Icon={User}   label="Name"  value={MOCK_INVITE.name}  />
                                    <InviteeRow Icon={Mail}   label="Email" value={MOCK_INVITE.email} />
                                    <InviteeRow Icon={Shield} label="Role"  value={MOCK_INVITE.role}  />
                                </div>

                                {/* ── Account form ──────────────────── */}
                                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Full Name
                                        </label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={form.fullName}
                                            onChange={setField("fullName")}
                                            placeholder="Your full name"
                                            autoComplete="name"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                                errors.fullName
                                                    ? "border-red-300 dark:border-red-700 focus:ring-red-400"
                                                    : "border-gray-200 dark:border-gray-700"
                                            }`}
                                        />
                                        {errors.fullName && (
                                            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <AlertCircle size={11} className="shrink-0" />
                                                {errors.fullName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email — read-only */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={MOCK_INVITE.email}
                                            readOnly
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed select-none"
                                        />
                                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                            This is the email your invitation was sent to.
                                        </p>
                                    </div>

                                    {/* Password */}
                                    <PasswordInput
                                        id="password"
                                        label="Password"
                                        value={form.password}
                                        onChange={setField("password")}
                                        error={errors.password}
                                        placeholder="Minimum 8 characters"
                                    />

                                    {/* Confirm Password */}
                                    <PasswordInput
                                        id="confirmPassword"
                                        label="Confirm Password"
                                        value={form.confirmPassword}
                                        onChange={setField("confirmPassword")}
                                        error={errors.confirmPassword}
                                    />

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full mt-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                Creating account…
                                            </>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>
                                </form>

                            </div>
                        )}
                    </div>

                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                    By creating an account you agree to Blueslate's Terms of Service.
                </p>

            </div>
        </div>
    );
}
