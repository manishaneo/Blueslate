import { useState, useEffect, useCallback } from "react";
import {
    Building2, Globe, Settings2, Database, RefreshCw,
    Check, AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { getSettings, updateSettings, retrainAI } from "../services/settingsService";

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
    if (!dateStr) return "Never";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function formatBytes(n) {
    if (!n) return "0 B";
    if (n < 1024) return `${n} B`;
    return `${(n / 1024).toFixed(1)} KB`;
}

// ── small ui atoms ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, iconBg, iconCls, children }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={iconCls} />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="px-5 py-5 space-y-5">
                {children}
            </div>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <div className="space-y-1.5">
            <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {label}
                </p>
                {hint && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>
                )}
            </div>
            {children}
        </div>
    );
}

function ReadonlyValue({ value, mono }) {
    return (
        <p className={`text-sm text-gray-800 dark:text-gray-200 ${mono ? "font-mono break-all" : ""}`}>
            {value ?? <span className="text-gray-400 dark:text-gray-600 italic text-xs">Not set</span>}
        </p>
    );
}

function StatusBadge({ status }) {
    const active = status === "active";
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            active
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-amber-500"}`} />
            {active ? "Active" : status ?? "Unknown"}
        </span>
    );
}

function Toast({ message, type }) {
    if (!message) return null;
    const isSuccess = type === "success";
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            isSuccess
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
        }`}>
            {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

// ── main page ─────────────────────────────────────────────────────────────────

const TONE_OPTIONS     = ["professional", "friendly", "casual", "formal"];
const LANGUAGE_OPTIONS = [
    { value: "en",    label: "English" },
    { value: "hi",    label: "Hindi" },
    { value: "es",    label: "Spanish" },
    { value: "fr",    label: "French" },
    { value: "de",    label: "German" },
];

export default function SettingsPage() {
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    // server data
    const [business,  setBusiness]  = useState(null);
    const [kb,        setKb]        = useState(null);

    // AI config form — mirrors BusinessSettings fields
    const [form,      setForm]      = useState({
        aiPersonaName: "",
        tone:          "professional",
        language:      "en",
        greeting:      "",
    });
    const [saving,    setSaving]    = useState(false);

    // retrain
    const [retraining, setRetraining] = useState(false);

    // toast
    const [toast, setToast] = useState({ message: "", type: "success" });

    const showToast = useCallback((message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "success" }), 3000);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSettings();
            setBusiness(data.business);
            setForm({
                aiPersonaName: data.settings.aiPersonaName,
                tone:          data.settings.tone,
                language:      data.settings.language,
                greeting:      data.settings.greeting ?? "",
            });
            setKb(data.knowledgeBase);
        } catch (err) {
            setError(err?.response?.data?.message ?? "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await updateSettings(form);
            setForm((prev) => ({ ...prev, ...updated }));
            showToast("Settings updated.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "Failed to save settings.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRetrain = async () => {
        setRetraining(true);
        try {
            await retrainAI();
            showToast("Website retrained successfully.");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message ?? "Retrain failed.", "error");
        } finally {
            setRetraining(false);
        }
    };

    // ── loading / error states ─────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading settings…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            </div>
        );
    }

    // ── render ─────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Manage AI configuration and knowledge base for{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        {business?.name}
                    </span>
                </p>
            </div>

            {/* ── SECTION 1: Business Information ──────────────────────────── */}
            <SectionCard
                title="Business Information"
                icon={Building2}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconCls="text-blue-600 dark:text-blue-400"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Business Name">
                        <ReadonlyValue value={business?.name} />
                    </Field>
                    <Field label="Status">
                        <StatusBadge status={business?.status} />
                    </Field>
                </div>
                <Field label="Website">
                    <ReadonlyValue value={business?.website} mono />
                </Field>
            </SectionCard>

            {/* ── SECTION 2: AI Configuration ──────────────────────────────── */}
            <SectionCard
                title="AI Configuration"
                icon={Settings2}
                iconBg="bg-violet-100 dark:bg-violet-900/30"
                iconCls="text-violet-600 dark:text-violet-400"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="AI Name" hint="The name your AI uses to introduce itself.">
                        <input
                            type="text"
                            value={form.aiPersonaName}
                            onChange={(e) => setForm((p) => ({ ...p, aiPersonaName: e.target.value }))}
                            placeholder="Auri"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                    </Field>

                    <Field label="Tone" hint="How the AI communicates with visitors.">
                        <select
                            value={form.tone}
                            onChange={(e) => setForm((p) => ({ ...p, tone: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        >
                            {TONE_OPTIONS.map((t) => (
                                <option key={t} value={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field label="Language" hint="Primary language the AI responds in.">
                    <select
                        value={form.language}
                        onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                        className="max-w-xs w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                        {LANGUAGE_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Greeting Message" hint="Opening message shown to visitors. Leave blank for the AI-generated default.">
                    <textarea
                        value={form.greeting}
                        onChange={(e) => setForm((p) => ({ ...p, greeting: e.target.value }))}
                        placeholder={`Hi, thank you for contacting ${business?.name ?? "us"}.`}
                        rows={3}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                </Field>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 text-sm px-5 py-2 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </SectionCard>

            {/* ── SECTION 3: Knowledge Base Status ─────────────────────────── */}
            <SectionCard
                title="Knowledge Base Status"
                icon={Globe}
                iconBg="bg-amber-100 dark:bg-amber-900/30"
                iconCls="text-amber-600 dark:text-amber-400"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <KbRow label="Website"       value={business?.website} mono />
                    <KbRow label="Last Scraped"  value={relativeTime(kb?.lastScrapedAt)} />
                    <KbRow label="Content Size"  value={formatBytes(kb?.contentLength)} />
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                        {kb?.hasContent ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                <CheckCircle2 size={13} /> Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <AlertCircle size={13} /> No content available
                            </span>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* ── SECTION 4: Knowledge Base Preview ────────────────────────── */}
            <SectionCard
                title="Knowledge Base Preview"
                icon={Database}
                iconBg="bg-gray-100 dark:bg-gray-800"
                iconCls="text-gray-500 dark:text-gray-400"
            >
                {kb?.preview ? (
                    <div
                        className="h-48 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap select-text"
                        aria-label="Knowledge base preview (read-only)"
                    >
                        {kb.preview}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        No content indexed yet. Use Re-Train AI below to scrape your website.
                    </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Showing first 1,000 characters of indexed content. Read-only.
                </p>
            </SectionCard>

            {/* ── SECTION 5: Re-Train AI ────────────────────────────────────── */}
            <SectionCard
                title="Re-Train AI"
                icon={RefreshCw}
                iconBg="bg-green-100 dark:bg-green-900/30"
                iconCls="text-green-600 dark:text-green-400"
            >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Re-scrape <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{business?.website}</span> and
                    update the knowledge base. This replaces the existing indexed content.
                </p>

                <button
                    onClick={handleRetrain}
                    disabled={retraining}
                    className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-green-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                    {retraining
                        ? <><Loader2 size={14} className="animate-spin" /> Training {form.aiPersonaName || "Auri"}…</>
                        : <><RefreshCw size={14} /> Re-Scrape Website</>
                    }
                </button>

                {retraining && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                        <Loader2 size={11} className="animate-spin" />
                        This may take up to 30 seconds depending on the website size.
                    </p>
                )}
            </SectionCard>

            {/* toast */}
            <Toast message={toast.message} type={toast.type} />
        </div>
    );
}

// ── small helper component ────────────────────────────────────────────────────

function KbRow({ label, value, mono }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {label}
            </p>
            <p className={`text-sm text-gray-800 dark:text-gray-200 break-all ${mono ? "font-mono text-xs" : ""}`}>
                {value ?? <span className="text-gray-400 dark:text-gray-600 italic text-xs">Not set</span>}
            </p>
        </div>
    );
}
