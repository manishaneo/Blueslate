import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Briefcase,
    Clock,
    ExternalLink,
    Globe,
    Headphones,
    Info,
    Loader2,
    MessageSquare,
    Moon,
    Phone,
    PhoneCall,
    Sun,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { BusinessAvatar, PoweredBy } from "../components/CustomerPortalComponents";
import { API_BASE_URL } from "../utils/api";

// ── Local helper components ───────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }) {
    return (
        <div className="mb-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-gray-50 dark:border-gray-800/60">
                <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-gray-500 dark:text-gray-400" />
                </div>
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {title}
                </h2>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

function ChipsSection({ icon, title, chips }) {
    if (!chips?.length) return null;
    return (
        <SectionCard icon={icon} title={title}>
            <div className="flex flex-wrap gap-2">
                {chips.map((chip, i) => (
                    <span
                        key={i}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium leading-none"
                    >
                        {chip}
                    </span>
                ))}
            </div>
        </SectionCard>
    );
}

function TextSection({ icon, title, content }) {
    if (!content?.trim()) return null;
    return (
        <SectionCard icon={icon} title={title}>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {content}
            </p>
        </SectionCard>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerPortalPage() {
    const { dark, toggle } = useTheme();
    const navigate         = useNavigate();
    const location         = useLocation();
    const [searchParams]   = useSearchParams();

    // When returning from /chat/:token or /receptionist/:token via the Back button,
    // location.state carries { step: 2, businessName, receptionistName, website, token }
    const returnState = (location.state?.step === 2 && location.state?.businessName)
        ? location.state
        : null;

    const [step, setStep] = useState(returnState ? 2 : 1);

    // Step 1
    const [website,       setWebsite]       = useState(returnState?.website       || "");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError,   setLookupError]   = useState(null);

    // Carried to step 2 and into child routes
    const [businessName,      setBusinessName]      = useState(returnState?.businessName      || "");
    const [conversationToken, setConversationToken] = useState(returnState?.token             || null);
    const [receptionistName,  setReceptionistName]  = useState(returnState?.receptionistName  || "Virtual Receptionist");

    // Rich business data for the welcome page — restored from sessionStorage on return
    const [businessData, setBusinessData] = useState(() => {
        if (!returnState?.token) return null;
        try {
            const raw = sessionStorage.getItem(`portal_session_${returnState.token}`);
            return raw ? (JSON.parse(raw)?.businessData ?? null) : null;
        } catch {
            return null;
        }
    });

    // Visit URL — prefer canonical URL from business data, fall back to user input
    const visitUrl = useMemo(() => {
        const raw = businessData?.websiteUrl || website || "";
        if (!raw) return null;
        return raw.startsWith("http") ? raw : `https://${raw}`;
    }, [businessData, website]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleLookup = async (e, websiteOverride = null) => {
        if (e) e.preventDefault();
        const targetWebsite = websiteOverride || website.trim();
        if (!targetWebsite) return;
        setLookupLoading(true);
        setLookupError(null);
        try {
            const res  = await fetch(`${API_BASE_URL}/portal/lookup`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ website: targetWebsite }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLookupError(data.message ?? "Something went wrong. Please try again.");
                return;
            }
            setBusinessName(data.data.businessName);
            setConversationToken(data.data.conversationToken);
            setReceptionistName(data.data.receptionistName ?? "Virtual Receptionist");
            setBusinessData(data.data.businessData ?? null);
            setStep(2);
        } catch {
            setLookupError("Could not reach the server. Please try again.");
        } finally {
            setLookupLoading(false);
        }
    };

    // Auto-lookup from query param
    useEffect(() => {
        const queryWebsite = searchParams.get("website");
        if (queryWebsite && step === 1 && !website && !returnState) {
            setWebsite(queryWebsite);
            handleLookup(null, queryWebsite);
        }
    }, [searchParams, step, returnState]);

    const saveSession = (token) => {
        try {
            sessionStorage.setItem(
                `portal_session_${token}`,
                JSON.stringify({ businessName, receptionistName, website, businessData })
            );
        } catch { /* non-fatal */ }
    };

    const handleStartChat = () => {
        saveSession(conversationToken);
        navigate(`/chat/${conversationToken}`, {
            state: { businessName, receptionistName, website },
        });
    };

    const handleStartCall = () => {
        saveSession(conversationToken);
        navigate(`/receptionist/${conversationToken}`, {
            state: { businessName, receptionistName, website },
        });
    };

    const goBack = () => {
        if (step === 2) { setStep(1); setLookupError(null); }
    };

    // ── Step 1 render ─────────────────────────────────────────────────────────

    if (step === 1) {
        return (
            <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex flex-col items-center justify-center px-4 py-8 relative">

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
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-800 overflow-hidden">

                        {/* Card header */}
                        <div className="px-7 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 text-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Portal</h2>
                        </div>

                        {/* Form */}
                        <div className="px-7 py-7">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Find your business
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                Enter the business's website to connect with their virtual receptionist.
                            </p>

                            <form onSubmit={handleLookup} className="mt-6 space-y-4">
                                <div>
                                    <label
                                        htmlFor="website"
                                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                                    >
                                        Business Website
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                            <Globe size={15} className="text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input
                                            id="website"
                                            type="text"
                                            value={website}
                                            onChange={(e) => { setWebsite(e.target.value); setLookupError(null); }}
                                            placeholder="yourbusiness.com"
                                            disabled={lookupLoading}
                                            autoComplete="off"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {lookupError && (
                                    <p className="text-xs text-red-600 dark:text-red-400">{lookupError}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={lookupLoading || !website.trim()}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {lookupLoading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Searching…
                                        </>
                                    ) : (
                                        <>
                                            Search
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                    
                    <div className="mt-8">
                        <PoweredBy />
                    </div>
                </div>
            </div>
        );
    }

    // ── Step 2 — Business Welcome Page ────────────────────────────────────────

    const bd = businessData;
    const hasDescription  = !!bd?.description?.trim();
    const hasServices     = (bd?.services?.length ?? 0) > 0;
    const hasPrograms     = (bd?.programs?.length ?? 0) > 0;
    const hasHours        = !!bd?.businessHours?.trim();
    const hasContact      = !!bd?.contactInfo?.trim();
    const hasAnyInfo      = hasDescription || hasServices || hasPrograms || hasHours || hasContact;

    return (
        <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-blue-50/20 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex flex-col">

            {/* ── Sticky header ─────────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goBack}
                            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={15} />
                            <span>Back</span>
                        </button>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                        <BusinessAvatar businessName={businessName} logoUrl={bd?.logoUrl} className="w-8 h-8" />
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight hidden sm:inline">{businessName}</span>
                    </div>
                    <button
                        onClick={toggle}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        title={dark ? "Light mode" : "Dark mode"}
                    >
                        {dark ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                </div>
            </div>

            {/* ── Page content ──────────────────────────────────────────────── */}
            <div className="max-w-lg mx-auto px-5 pt-8 pb-16">

                {/* ── Hero ──────────────────────────────────────────────────── */}
                <div className="flex flex-col items-center text-center pb-8">
                    {/* Avatar */}
                    <div className="mb-5">
                        <BusinessAvatar businessName={businessName} logoUrl={bd?.logoUrl} className="w-[72px] h-[72px] shadow-xl text-[30px]" />
                    </div>

                    <h1 className="text-[26px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                        {businessName}
                    </h1>

                    {visitUrl && (
                        <a
                            href={visitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline mt-1.5 transition-colors"
                        >
                            <Globe size={12} className="shrink-0" />
                            {website}
                        </a>
                    )}

                    {/* Online status badge */}
                    <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-900/50">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                        <span className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                            AI Receptionist Online
                        </span>
                    </div>
                </div>

                {/* ── Receptionist intro card ───────────────────────────────── */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-px shadow-lg shadow-blue-200/50 dark:shadow-blue-900/40 mb-5">
                    <div className="rounded-[15px] bg-white dark:bg-gray-900 px-5 py-4">
                        <div className="flex gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200 dark:shadow-blue-900/50">
                                <Headphones size={17} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug mb-1.5">
                                    Welcome to {businessName}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    I&apos;m{" "}
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {receptionistName}
                                    </span>
                                    , your AI receptionist. I can answer questions about services, pricing,
                                    schedules, programs, admissions, availability, and more.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Info sections (only rendered when data exists) ────────── */}
                {hasAnyInfo && (
                    <div className="mb-2">
                        <TextSection  icon={Info}     title="About"              content={bd?.description} />
                        <ChipsSection icon={Briefcase} title="Services"           chips={bd?.services} />
                        <ChipsSection icon={BookOpen}  title="Programs & Classes" chips={bd?.programs} />
                        <TextSection  icon={Clock}     title="Business Hours"     content={bd?.businessHours} />
                        <TextSection  icon={Phone}     title="Contact"            content={bd?.contactInfo} />
                    </div>
                )}

                {/* ── CTA section ───────────────────────────────────────────── */}
                <div className="mt-6">
                    {/* Divider with label */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                            How would you like to connect?
                        </p>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                    </div>

                    {/* Chat + Call CTA cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleStartChat}
                            className="group flex flex-col items-center gap-3.5 p-5 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-950/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 flex items-center justify-center transition-colors">
                                <MessageSquare size={22} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                    Chat
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                                    with Receptionist
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={handleStartCall}
                            className="group flex flex-col items-center gap-3.5 p-5 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-950/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 flex items-center justify-center transition-colors">
                                <PhoneCall size={22} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                    Call
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                                    Receptionist
                                </p>
                            </div>
                        </button>
                    </div>

                    {visitUrl && (
                        <div className="mt-5 text-center">
                            <a
                                href={visitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            >
                                <Globe size={13} />
                                Visit Website
                                <ExternalLink size={11} />
                            </a>
                        </div>
                    )}
                    
                    <div className="mt-8">
                        <PoweredBy />
                    </div>
                </div>
            </div>
        </div>
    );
}
