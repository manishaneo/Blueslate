import { useState, useEffect, useCallback, useRef } from "react";
import {
    BookOpen, Globe, RefreshCw, Database, HelpCircle,
    Zap, AlertCircle, CheckCircle2, Loader2, Send,
    ChevronDown, ChevronUp,
} from "lucide-react";
import { getSettings, getKnowledgeBase, retrainAI } from "../services/settingsService";
import { sendMessage } from "../services/chatService";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function formatBytes(n) {
    if (!n) return "0 B";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ── small ui atoms ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, iconBg, iconCls, badge, children }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={iconCls} />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{title}</h2>
                {badge != null && (
                    <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            <div className="px-5 py-5">
                {children}
            </div>
        </div>
    );
}

function MetaRow({ label, value, mono }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-sm text-gray-800 dark:text-gray-200 break-all ${mono ? "font-mono text-xs" : ""}`}>
                {value ?? <span className="italic text-gray-400 dark:text-gray-600 text-xs">Not set</span>}
            </p>
        </div>
    );
}

function Toast({ message, type }) {
    if (!message) return null;
    const ok = type === "success";
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
            {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
        </div>
    );
}

// ── FAQ accordion item ────────────────────────────────────────────────────────

function FaqItem({ question, answer, index }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-start gap-2.5 min-w-0">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{question}</p>
                </div>
                {open
                    ? <ChevronUp size={14} className="shrink-0 text-gray-400" />
                    : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800">
                    {answer
                        ? <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-7">{answer}</p>
                        : <p className="text-xs italic text-gray-400 dark:text-gray-600 pl-7">No answer extracted.</p>
                    }
                </div>
            )}
        </div>
    );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [business,   setBusiness]   = useState(null);
    const [kb,         setKb]         = useState(null);
    const [retraining, setRetraining] = useState(false);
    const [toast,      setToast]      = useState({ message: "", type: "success" });

    // test-AI state
    const [testQ,       setTestQ]       = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const [testResult,  setTestResult]  = useState(null);
    const testConvRef = useRef(null);

    const showToast = useCallback((message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "success" }), 3500);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [settingsData, kbData] = await Promise.all([
                getSettings(),
                getKnowledgeBase(),
            ]);
            setBusiness(settingsData.business);
            // Merge: settingsData.knowledgeBase supplies metadata (hasContent, contentLength,
            // preview, lastScrapedAt); kbData supplies the full content and faqs.
            setKb({ ...settingsData.knowledgeBase, ...kbData });
        } catch (err) {
            setError(err?.response?.data?.message ?? "Failed to load knowledge base.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRetrain = async () => {
        setRetraining(true);
        try {
            await retrainAI();
            showToast("Knowledge base updated successfully.", "success");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message ?? "Retrain failed.", "error");
        } finally {
            setRetraining(false);
        }
    };

    const handleTest = async () => {
        const q = testQ.trim();
        if (!q) return;
        setTestLoading(true);
        setTestResult(null);
        try {
            const res = await sendMessage(q, testConvRef.current, "business_chat");
            if (res.conversationId) testConvRef.current = res.conversationId;
            setTestResult({ answer: res.answer, error: null });
        } catch (err) {
            setTestResult({ answer: null, error: err?.response?.data?.message ?? "Request failed." });
        } finally {
            setTestLoading(false);
        }
    };

    const handleTestKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTest(); }
    };

    // ── states ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading knowledge base…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            </div>
        );
    }

    const faqs = kb?.faqs ?? [];

    // ── render ──────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    View and manage the content your AI uses to answer questions for{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{business?.name}</span>.
                </p>
            </div>

            {/* ── SECTION 1: Status + Retrain ───────────────────────────────── */}
            <SectionCard
                title="Website Information"
                icon={Globe}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconCls="text-blue-600 dark:text-blue-400"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <MetaRow label="Website" value={business?.website} mono />
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                        {kb?.hasContent ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                <CheckCircle2 size={13} /> Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <AlertCircle size={13} /> No content indexed
                            </span>
                        )}
                    </div>
                    <MetaRow label="Last Scraped"  value={formatDate(kb?.lastScrapedAt)} />
                    <MetaRow label="Content Size"  value={formatBytes(kb?.contentLength)} />
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Re-scrape{" "}
                        <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{business?.website}</span>{" "}
                        to update the indexed content. This replaces the existing knowledge base.
                    </p>
                    <button
                        onClick={handleRetrain}
                        disabled={retraining}
                        className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                        {retraining
                            ? <><Loader2 size={14} className="animate-spin" /> Scraping website…</>
                            : <><RefreshCw size={14} /> Re-Scrape Website</>}
                    </button>
                    {retraining && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin" />
                            This may take up to 30 seconds depending on website size.
                        </p>
                    )}
                </div>
            </SectionCard>

            {/* ── SECTION 2: Full Content Viewer ───────────────────────────── */}
            <SectionCard
                title="Indexed Content"
                icon={Database}
                iconBg="bg-gray-100 dark:bg-gray-800"
                iconCls="text-gray-500 dark:text-gray-400"
                badge={kb?.contentLength ? formatBytes(kb.contentLength) : null}
            >
                {kb?.content ? (
                    <div
                        className="h-96 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap select-text"
                        aria-label="Full indexed content (read-only)"
                    >
                        {kb.content}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Database size={24} className="text-gray-300 dark:text-gray-700" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            No content indexed yet.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600">
                            Use Re-Scrape Website above to index your website.
                        </p>
                    </div>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                    Full indexed content shown. Read-only.
                </p>
            </SectionCard>

            {/* ── SECTION 3: FAQ Viewer ─────────────────────────────────────── */}
            <SectionCard
                title="Extracted FAQs"
                icon={HelpCircle}
                iconBg="bg-violet-100 dark:bg-violet-900/30"
                iconCls="text-violet-600 dark:text-violet-400"
                badge={faqs.length > 0 ? faqs.length : null}
            >
                {faqs.length > 0 ? (
                    <div className="space-y-2">
                        {faqs.map((faq, i) => (
                            <FaqItem key={i} index={i} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <HelpCircle size={24} className="text-gray-300 dark:text-gray-700" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            No FAQs detected.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xs">
                            FAQs are automatically extracted from FAQ sections, accordions, and
                            &lt;details&gt; elements on your website.
                        </p>
                    </div>
                )}
            </SectionCard>

            {/* ── SECTION 4: Test Your AI ───────────────────────────────────── */}
            <SectionCard
                title="Test Your AI"
                icon={Zap}
                iconBg="bg-amber-100 dark:bg-amber-900/30"
                iconCls="text-amber-600 dark:text-amber-400"
            >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Ask a question to see how the AI responds using the current knowledge base.
                    Responses are powered by the same pipeline your customers use.
                </p>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={testQ}
                        onChange={(e) => setTestQ(e.target.value)}
                        onKeyDown={handleTestKey}
                        placeholder="e.g. What are your business hours?"
                        disabled={testLoading || !kb?.hasContent}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleTest}
                        disabled={testLoading || !testQ.trim() || !kb?.hasContent}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {testLoading ? "Asking…" : "Ask"}
                    </button>
                </div>

                {!kb?.hasContent && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        Scrape your website first to enable testing.
                    </p>
                )}

                {testResult && (
                    <div className="mt-4">
                        {testResult.error ? (
                            <div className="flex items-start gap-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                {testResult.error}
                            </div>
                        ) : (
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 px-4 py-3">
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                                    AI Response
                                </p>
                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {testResult.answer}
                                </p>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                            Test queries are recorded in Conversations with source "business_chat".
                        </p>
                    </div>
                )}
            </SectionCard>

            <Toast message={toast.message} type={toast.type} />
        </div>
    );
}
