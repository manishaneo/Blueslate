import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight, ArrowLeft, Globe, Zap, LayoutDashboard, AlertCircle,
    CheckCircle2, FileText, MessageSquare, Clock,
} from "lucide-react";
import AIConversationTester from "../components/AIConversationTester";
import DemoResultsModal from "../components/DemoResultsModal";

const API = "http://localhost:5000/api";

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
    { label: "Connecting to your website",   delay: 0     },
    { label: "Reading your pages",           delay: 2000  },
    { label: "Analyzing your content",       delay: 8000  },
    { label: "Building your AI receptionist", delay: 18000 },
];

export default function DemoPage() {
    const navigate = useNavigate();

    // ── Core step flow ────────────────────────────────────────────────────────
    // url-input → scraping → preview → call → results
    const [step,                 setStep]                = useState("url-input");
    const [url,                  setUrl]                 = useState("");
    const [error,                setError]               = useState(null);
    const [demoSession,          setDemoSession]         = useState(null);
    const [callResults,          setCallResults]         = useState(null);

    // ── Scraping progress state ───────────────────────────────────────────────
    const [scrapeStage,          setScrapeStage]         = useState(0);
    const [scrapeStartedAt,      setScrapeStartedAt]     = useState(null);
    const [scrapeDurationSeconds, setScrapeDurationSeconds] = useState(null);
    const [elapsedSeconds,       setElapsedSeconds]      = useState(0);

    const scrapeRef      = useRef(false); // guard against StrictMode double-invoke
    const stageTimersRef = useRef([]);
    const elapsedTimerRef = useRef(null);

    // ── Stage advancement during scraping ─────────────────────────────────────
    useEffect(() => {
        if (step !== "scraping") return;

        // Clear any leftover timers
        stageTimersRef.current.forEach(clearTimeout);
        stageTimersRef.current = [];
        setScrapeStage(0);

        // Schedule each stage transition (purely cosmetic)
        const timers = [
            setTimeout(() => setScrapeStage(1), 2000),
            setTimeout(() => setScrapeStage(2), 8000),
            setTimeout(() => setScrapeStage(3), 18000),
        ];
        stageTimersRef.current = timers;

        // Elapsed seconds counter
        setElapsedSeconds(0);
        elapsedTimerRef.current = setInterval(
            () => setElapsedSeconds((s) => s + 1),
            1000,
        );

        return () => {
            timers.forEach(clearTimeout);
            clearInterval(elapsedTimerRef.current);
        };
    }, [step]);

    // ── Scrape ────────────────────────────────────────────────────────────────
    const handleScrape = async (e) => {
        e.preventDefault();
        if (!url.trim()) { setError("Please enter a website URL."); return; }
        if (scrapeRef.current) return;

        scrapeRef.current = true;
        setError(null);
        setScrapeStartedAt(Date.now());
        setStep("scraping");

        try {
            const resp = await fetch(`${API}/demo/scrape`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ url: url.trim() }),
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) {
                throw new Error(json.message || "Could not read that website.");
            }

            // Stop cosmetic timers immediately — API resolved
            stageTimersRef.current.forEach(clearTimeout);
            clearInterval(elapsedTimerRef.current);

            const duration = Math.round((Date.now() - scrapeStartedAt) / 1000);
            setScrapeDurationSeconds(duration);
            setDemoSession(json.data);
            setStep("preview");
        } catch (err) {
            stageTimersRef.current.forEach(clearTimeout);
            clearInterval(elapsedTimerRef.current);
            setError(err.message);
            setStep("url-input");
        } finally {
            scrapeRef.current = false;
        }
    };

    // ── Start demo call (user-initiated only) ─────────────────────────────────
    const handleStartDemoCall = () => {
        setStep("call");
    };

    // ── Try a different URL ───────────────────────────────────────────────────
    const handleBackToInput = () => {
        setStep("url-input");
        setDemoSession(null);
        setScrapeDurationSeconds(null);
        setError(null);
    };

    // ── Demo chat — override passed to AIConversationTester ──────────────────
    const demoSendMessage = useCallback(async (message) => {
        try {
            const resp = await fetch(`${API}/demo/chat`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    message,
                    demoSessionId: demoSession?.demoSessionId,
                }),
            });
            const json = await resp.json();
            if (!resp.ok) {
                return { answer: "I'm having a little trouble right now. Please try again in a moment." };
            }
            return json.data; // { answer, intent, leadData }
        } catch {
            return { answer: "I'm having a little trouble right now. Please try again in a moment." };
        }
    }, [demoSession?.demoSessionId]);

    // ── Call ended ────────────────────────────────────────────────────────────
    const handleCallEnd = (results) => {
        setCallResults(results);
        setStep("results");
    };

    // ── Exit demo — clear all state ───────────────────────────────────────────
    const handleExit = () => {
        setStep("url-input");
        setUrl("");
        setError(null);
        setDemoSession(null);
        setCallResults(null);
        setScrapeDurationSeconds(null);
        navigate("/");
    };

    // ── Start onboarding — pass followUp state to /join ───────────────────────
    const handleStartOnboarding = (followUp) => {
        navigate("/join", {
            state: {
                websiteUrl:   url,
                businessName: demoSession?.businessName ?? "",
                contactName:  followUp.name,
                contactEmail: followUp.email,
                contactPhone: followUp.phone,
            },
        });
    };

    const greeting = demoSession
        ? `Hi, thank you for calling ${demoSession.businessName}. This is Auri, your AI receptionist. How may I help you today?`
        : "";

    // ── Shared top bar (hidden during call so AIConversationTester fills screen)
    const showTopBar = step !== "call" && step !== "results";

    return (
        <div className="min-h-screen bg-white dark:bg-[#060c17] flex flex-col antialiased">

            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
            </div>

            {showTopBar && (
                <div className="relative z-10 flex items-center px-6 py-5 shrink-0">
                    <a href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/40">
                            <LayoutDashboard size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                            Blueslate
                        </span>
                    </a>
                </div>
            )}

            {/* ── Step: url-input ──────────────────────────────────────────────── */}
            {step === "url-input" && (
                <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-lg">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-5">
                                <Zap size={11} />
                                No account needed · Free demo
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
                                Try Blueslate Free
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Enter your business website. We'll read it, train your AI receptionist,
                                and have it live in seconds.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl shadow-gray-200/60 dark:shadow-black/40 p-6 sm:p-8">
                            <form onSubmit={handleScrape} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="websiteUrl"
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                                    >
                                        Business Website URL
                                    </label>
                                    <div className="relative">
                                        <Globe
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                        />
                                        <input
                                            id="websiteUrl"
                                            type="url"
                                            value={url}
                                            onChange={(e) => { setUrl(e.target.value); setError(null); }}
                                            placeholder="https://yourbusiness.com"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                                        />
                                    </div>
                                    {error && (
                                        <p className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
                                            <AlertCircle size={12} className="shrink-0" />
                                            {error}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Build my AI receptionist
                                    <ArrowRight size={15} />
                                </button>
                            </form>

                            <div className="mt-5 space-y-1.5">
                                {[
                                    "1  Enter your website URL",
                                    "2  AI reads your services, hours, and FAQs",
                                    "3  Your receptionist goes live instantly",
                                ].map((s) => (
                                    <p key={s} className="text-xs text-gray-400 dark:text-gray-500">{s}</p>
                                ))}
                            </div>
                        </div>

                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
                            No account required. Nothing is saved.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Step: scraping ───────────────────────────────────────────────── */}
            {step === "scraping" && (
                <div className="relative z-10 flex-1 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">

                        {/* URL chip */}
                        <div className="flex items-center justify-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-xs font-medium max-w-full">
                                <Globe size={11} className="shrink-0 text-blue-500" />
                                <span className="truncate">{url}</span>
                            </div>
                        </div>

                        {/* Stage tracker */}
                        <div className="space-y-4 mb-8">
                            {STAGES.map((stage, i) => {
                                const isComplete = i < scrapeStage;
                                const isCurrent  = i === scrapeStage;
                                const isPending  = i > scrapeStage;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        {/* Stage indicator */}
                                        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                                            {isComplete ? (
                                                <CheckCircle2 size={18} className="text-blue-500" />
                                            ) : isCurrent ? (
                                                <span className="w-4 h-4 rounded-full bg-blue-500 animate-pulse block" />
                                            ) : (
                                                <span className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-700 block" />
                                            )}
                                        </div>

                                        {/* Stage label */}
                                        <span className={`text-sm ${
                                            isComplete ? "text-blue-600 dark:text-blue-400 font-medium"
                                          : isCurrent  ? "text-gray-900 dark:text-white font-semibold"
                                          :              "text-gray-400 dark:text-gray-600"
                                        }`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Elapsed timer */}
                        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                            <Clock size={11} />
                            <span className="font-mono">{elapsedSeconds}s</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step: preview ────────────────────────────────────────────────── */}
            {step === "preview" && demoSession && (
                <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
                    <div className="w-full max-w-2xl">

                        {/* Card */}
                        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden">

                            {/* Card header */}
                            <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-gray-100 dark:border-white/8">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Ready badge */}
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-[11px] font-semibold mb-3">
                                            <CheckCircle2 size={11} />
                                            Ready in {scrapeDurationSeconds ?? 0}s
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug mb-2">
                                            Your AI receptionist knows{" "}
                                            <span className="text-blue-600 dark:text-blue-400">
                                                {demoSession.businessName}
                                            </span>
                                        </h2>
                                        {demoSession.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                                                {demoSession.description}
                                            </p>
                                        )}
                                    </div>
                                    {/* AI avatar */}
                                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/25">
                                        <span className="text-2xl font-black text-white">A</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/8 border-b border-gray-100 dark:border-white/8">
                                {[
                                    { label: "Pages Scanned",    value: demoSession.crawledPages,        icon: Globe },
                                    { label: "Services Found",   value: demoSession.services?.length ?? 0, icon: FileText },
                                    { label: "FAQs Detected",    value: demoSession.faqs?.length ?? 0,    icon: MessageSquare },
                                ].map(({ label, value, icon: Icon }) => (
                                    <div key={label} className="px-4 sm:px-6 py-4 text-center">
                                        <Icon size={14} className="mx-auto mb-1.5 text-blue-500 dark:text-blue-400" />
                                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                                            {value}
                                        </p>
                                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5">
                                            {label}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Services */}
                            {demoSession.services?.length > 0 && (
                                <div className="px-6 sm:px-8 pt-5 pb-4">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                        Services
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {demoSession.services.slice(0, 5).map((svc) => (
                                            <span
                                                key={svc}
                                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium"
                                            >
                                                {svc}
                                            </span>
                                        ))}
                                        {demoSession.services.length > 5 && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/6 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs font-medium">
                                                +{demoSession.services.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* FAQs */}
                            {demoSession.faqs?.length > 0 && (
                                <div className="px-6 sm:px-8 pb-5 border-t border-gray-100 dark:border-white/8 pt-4">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                        Top Questions Your AI Can Answer
                                    </p>
                                    <div className="space-y-2">
                                        {demoSession.faqs.slice(0, 2).map((faq, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8"
                                            >
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                                    Q
                                                </span>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                                    {faq.question}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CTA area */}
                            <div className="px-6 sm:px-8 pb-7 pt-4 flex flex-col sm:flex-row gap-3 items-center border-t border-gray-100 dark:border-white/8">
                                <button
                                    onClick={handleStartDemoCall}
                                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Start Demo Call
                                    <ArrowRight size={15} />
                                </button>
                                <button
                                    onClick={handleBackToInput}
                                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-3.5 px-5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <ArrowLeft size={14} />
                                    Try a different URL
                                </button>
                            </div>

                        </div>

                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
                            No account required. Nothing is saved.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Steps: call + results ─────────────────────────────────────────── */}
            {(step === "call" || step === "results") && demoSession && (
                <div className="flex-1 flex flex-col" style={{ minHeight: "100vh" }}>
                    <AIConversationTester
                        greeting={greeting}
                        businessName={demoSession.businessName}
                        agentName="Auri"
                        compact={false}
                        testMode={false}
                        sendMessage={demoSendMessage}
                        onCallEnd={handleCallEnd}
                    />

                    {step === "results" && (
                        <DemoResultsModal
                            open
                            callResults={callResults}
                            businessName={demoSession.businessName}
                            onStartOnboarding={handleStartOnboarding}
                            onExit={handleExit}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
