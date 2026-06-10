import { useState, useEffect } from "react";
import { FlaskConical, ShieldCheck, X, User, Mail, Phone, Zap, CheckCircle, XCircle } from "lucide-react";
import AIConversationTester from "../components/AIConversationTester";
import { getCurrentUser } from "../utils/auth";
import { getSettings } from "../services/settingsService";

// ── helpers ───────────────────────────────────────────────────────────────────

function intentLabel(intent) {
    if (!intent) return "—";
    return intent.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Test Results Modal ────────────────────────────────────────────────────────

function TestResultsModal({ results, agentName, onTestAgain, onClose }) {
    const lead       = results?.leadData ?? { name: null, email: null, phone: null };
    const lastIntent = results?.lastIntent ?? null;
    const detected   = !!(lead.email || lead.phone);

    const row = (Icon, label, value) => (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-none mb-1">
                    {label}
                </p>
                <p className={`text-sm leading-snug ${value ? "text-gray-900 dark:text-white font-medium" : "text-gray-400 dark:text-gray-600 italic"}`}>
                    {value || "—"}
                </p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                Test Results
                            </h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                Not saved to database
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Extracted from the test conversation with {agentName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Lead detected badge */}
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    {detected ? (
                        <CheckCircle size={15} className="text-green-500 shrink-0" />
                    ) : (
                        <XCircle size={15} className="text-gray-400 shrink-0" />
                    )}
                    <span className={`text-sm font-semibold ${detected ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
                        Lead {detected ? "detected" : "not detected"}
                    </span>
                </div>

                {/* Extracted fields */}
                <div className="px-5">
                    {row(User,  "Extracted Name",  lead.name)}
                    {row(Mail,  "Extracted Email", lead.email)}
                    {row(Phone, "Extracted Phone", lead.phone)}
                    {row(Zap,   "Detected Intent", intentLabel(lastIntent?.intent))}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-4 flex gap-2">
                    <button
                        onClick={onTestAgain}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white transition-all"
                    >
                        Test Again
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestAIPage() {
    const [isActive,       setIsActive]       = useState(false);
    const [agentName,      setAgentName]      = useState("Virtual Receptionist");
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [showResults,    setShowResults]    = useState(false);
    const [testResults,    setTestResults]    = useState(null);

    useEffect(() => {
        getSettings()
            .then((s) => {
                console.log("[TestAI] settings response:", s);
                console.log("[TestAI] aiPersonaName:", s?.aiPersonaName);
                setAgentName(s.settings?.aiPersonaName ?? "Virtual Receptionist");
            })
            .catch((err) => {
                console.log("[TestAI] getSettings failed:", err);
                setAgentName("Virtual Receptionist");
            })
            .finally(() => {
                setSettingsLoaded(true);
            });
    }, []);

    // Log when tester actually mounts so we can verify agentName at render time.
    useEffect(() => {
        if (isActive && settingsLoaded) {
            console.log("[TestAI] rendering with agentName:", agentName);
            console.log("[TestAI] settingsLoaded:", settingsLoaded);
        }
    }, [isActive, settingsLoaded, agentName]);

    const user         = getCurrentUser();
    const businessName = user?.businessName ?? "";
    const businessId   = user?.activeBusinessId ?? "";

    const greeting = businessName
        ? `Hi, thank you for calling ${businessName}. This is ${agentName}, your virtual receptionist. How may I help you today?`
        : `Hi, thank you for calling. This is ${agentName}, your virtual receptionist. How may I help you today?`;

    const handleCallEnd = (results) => {
        setTestResults(results ?? null);
        setIsActive(false);
        setShowResults(true);
    };

    const handleTestAgain = () => {
        setShowResults(false);
        setTestResults(null);
        setIsActive(true);
    };

    const handleCloseResults = () => {
        setShowResults(false);
        setTestResults(null);
    };

    return (
        <>
            {/* ── Idle page — always rendered ───────────────────────────────── */}
            <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">

                {/* Page header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                            <FlaskConical size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Test Your AI</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-12">
                        Simulate a caller conversation to verify your AI is answering correctly.
                        Nothing is saved — no leads, no history, no analytics.
                    </p>
                </div>

                {/* Test card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                            <FlaskConical size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Test Call</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                                    Safe
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                Simulate a caller conversation without creating any records.
                            </p>
                        </div>
                    </div>

                    <ul className="space-y-1.5">
                        {[
                            "No conversations saved",
                            "No leads created",
                            "No analytics recorded",
                            "Uses your live knowledge base",
                        ].map((b) => (
                            <li key={b} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                                {b}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => setIsActive(true)}
                        disabled={!settingsLoaded}
                        className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm flex items-center justify-center gap-2"
                    >
                        {!settingsLoaded && (
                            <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        )}
                        {settingsLoaded ? "Start Test Call" : "Loading…"}
                    </button>
                </div>

                {businessName && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        <ShieldCheck size={12} />
                        <span>Testing as <span className="font-medium text-gray-600 dark:text-gray-300">{businessName}</span></span>
                    </div>
                )}
            </div>

            {/* ── Tester modal — centered, backdrop, page visible behind ──────── */}
            {isActive && settingsLoaded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-full sm:max-w-xl mx-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <AIConversationTester
                            greeting={greeting}
                            businessName={businessName}
                            businessContextId={businessId}
                            businessContextUrl=""
                            mode="receptionist"
                            agentName={agentName}
                            testMode={true}
                            compact={true}
                            onCallEnd={handleCallEnd}
                        />
                    </div>
                </div>
            )}

            {/* ── Results modal ──────────────────────────────────────────────── */}
            {showResults && (
                <TestResultsModal
                    results={testResults}
                    agentName={agentName}
                    onTestAgain={handleTestAgain}
                    onClose={handleCloseResults}
                />
            )}
        </>
    );
}
