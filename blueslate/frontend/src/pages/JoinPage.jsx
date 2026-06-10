import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    Eye, EyeOff, AlertCircle,
    LayoutDashboard, ArrowRight, ArrowLeft, CheckCircle2,
    Moon, Sun,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, id, error, hint, children }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            {children}
            {error ? (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} className="shrink-0" />{error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-600">{hint}</p>
            ) : null}
        </div>
    );
}

// ── Input class helper ────────────────────────────────────────────────────────

const inputCls = (hasError) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 bg-white dark:bg-[#111827] outline-none transition focus:ring-2 ${
        hasError
            ? "border-red-400 dark:border-red-500/50 focus:ring-red-500/20 focus:border-red-500"
            : "border-gray-200 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-500/60 focus:ring-blue-500/20"
    }`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JoinPage() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { dark, toggle } = useTheme();

    // Pre-fill from demo navigation state when arriving from /demo
    const demo = location.state ?? {};

    const [form, setForm] = useState({
        ownerName:       demo.contactName  || "",
        businessName:    demo.businessName || "",
        email:           demo.contactEmail || "",
        phone:           demo.contactPhone || "",
        password:        "",
        confirmPassword: "",
    });
    const [errors, setErrors]           = useState({});
    const [showPass, setShowPass]       = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((err) => ({ ...err, [key]: undefined }));
    };

    // ── Client-side validation ────────────────────────────────────────────────

    const validate = () => {
        const errs = {};
        if (!form.ownerName.trim())
            errs.ownerName = "Owner name is required.";
        if (!form.businessName.trim())
            errs.businessName = "Business name is required.";
        if (!form.email.trim())
            errs.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            errs.email = "Enter a valid email address.";
        if (!form.phone.trim())
            errs.phone = "Phone number is required.";
        if (!form.password)
            errs.password = "Password is required.";
        else if (form.password.length < 8)
            errs.password = "Password must be at least 8 characters.";
        if (form.password !== form.confirmPassword)
            errs.confirmPassword = "Passwords do not match.";
        return errs;
    };

    // ── Submit — passes collected data to BusinessSetupPage ──────────────────

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        navigate("/business-setup", {
            state: {
                ownerName:    form.ownerName.trim(),
                businessName: form.businessName.trim(),
                email:        form.email.trim().toLowerCase(),
                phone:        form.phone.trim(),
                password:     form.password,
                // Thread the demo website URL so BusinessSetupPage can pre-fill it
                website:      demo.websiteUrl || undefined,
            },
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white dark:bg-[#060c17] flex flex-col antialiased">

            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-48 w-96 h-96 bg-indigo-600/6 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-32 w-80 h-80 bg-blue-400/4 rounded-full blur-3xl" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-5 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={15} />
                        Back
                    </Link>
                    <span className="text-gray-400 dark:text-gray-700">·</span>
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/40">
                            <LayoutDashboard size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">Blueslate</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggle}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        title={dark ? "Light mode" : "Dark mode"}
                    >
                        {dark ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <Link
                        to="/login"
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Already have an account?{" "}
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Sign in</span>
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <div className="relative z-10 flex-1 flex items-start justify-center px-4 pb-16 pt-4">
                <div className="w-full max-w-2xl">

                    {/* Progress indicator */}
                    <div className="mb-8">
                        <p className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
                            Step 1 of 3
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            {/* Step 1 — active */}
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white">1</span>
                                </div>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Create Account</span>
                            </div>
                            <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
                            {/* Step 2 — upcoming */}
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">2</span>
                                </div>
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Business Setup</span>
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
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-5">
                            <CheckCircle2 size={11} />
                            Free to start · No credit card required
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                            Meet Auri
                        </h1>
                        <p className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            Your AI Receptionist
                        </p>
                        <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
                            Create your Blueslate account and get Auri ready for your business in minutes.
                        </p>
                    </div>

                    {/* Demo pre-fill notice */}
                    {demo.websiteUrl && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            <CheckCircle2 size={13} className="shrink-0 text-blue-500" />
                            Your demo details have been pre-filled. Just set a password to continue.
                        </div>
                    )}

                    {/* Card */}
                    <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl shadow-gray-200/60 dark:shadow-black/40 p-7 sm:p-8">
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">

                            {/* Row 1 — Owner Name · Business Name */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Your Name" id="ownerName" error={errors.ownerName}>
                                    <input
                                        id="ownerName"
                                        type="text"
                                        value={form.ownerName}
                                        onChange={set("ownerName")}
                                        placeholder="Manisha Ghadei"
                                        autoComplete="name"
                                        className={inputCls(errors.ownerName)}
                                    />
                                </Field>
                                <Field label="Business Name" id="businessName" error={errors.businessName}>
                                    <input
                                        id="businessName"
                                        type="text"
                                        value={form.businessName}
                                        onChange={set("businessName")}
                                        placeholder="ABC Academy"
                                        className={inputCls(errors.businessName)}
                                    />
                                </Field>
                            </div>

                            {/* Row 2 — Email · Phone */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Business Email" id="email" error={errors.email}>
                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={set("email")}
                                        placeholder="you@yourbusiness.com"
                                        autoComplete="email"
                                        className={inputCls(errors.email)}
                                    />
                                </Field>
                                <Field
                                    label="Phone Number"
                                    id="phone"
                                    error={errors.phone}
                                    hint="Your business contact number"
                                >
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={set("phone")}
                                        placeholder="+91 98765 43210"
                                        autoComplete="tel"
                                        className={inputCls(errors.phone)}
                                    />
                                </Field>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3 py-1">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-white/5" />
                                <span className="text-xs text-gray-500 dark:text-gray-600 shrink-0">Secure your account</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-white/5" />
                            </div>

                            {/* Row 3 — Password · Confirm */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Password" id="password" error={errors.password}>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPass ? "text" : "password"}
                                            value={form.password}
                                            onChange={set("password")}
                                            placeholder="Min. 8 characters"
                                            autoComplete="new-password"
                                            className={`${inputCls(errors.password)} pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            tabIndex={-1}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            aria-label={showPass ? "Hide password" : "Show password"}
                                        >
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </Field>
                                <Field label="Confirm Password" id="confirmPassword" error={errors.confirmPassword}>
                                    <div className="relative">
                                        <input
                                            id="confirmPassword"
                                            type={showConfirm ? "text" : "password"}
                                            value={form.confirmPassword}
                                            onChange={set("confirmPassword")}
                                            placeholder="Repeat password"
                                            autoComplete="new-password"
                                            className={`${inputCls(errors.confirmPassword)} pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            tabIndex={-1}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            aria-label={showConfirm ? "Hide password" : "Show password"}
                                        >
                                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </Field>
                            </div>

                            {/* Submit */}
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Continue
                                    <ArrowRight size={15} />
                                </button>
                            </div>

                            {/* Trust row */}
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                                {[
                                    "Setup in under 2 minutes",
                                    "No coding required",
                                    "Cancel anytime",
                                ].map((item) => (
                                    <span key={item} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-600">
                                        <CheckCircle2 size={12} className="text-green-500/70 shrink-0" />
                                        {item}
                                    </span>
                                ))}
                            </div>

                            <p className="text-center text-xs text-gray-500 dark:text-gray-700">
                                By creating an account you agree to Blueslate's{" "}
                                <span className="text-gray-600 dark:text-gray-500 cursor-default">Terms of Service</span>.
                            </p>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
