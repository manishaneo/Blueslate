import { useState, useRef, useEffect } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Globe,
    Loader2,
    MessageSquare,
    Moon,
    PhoneCall,
    Send,
    Sun,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import AIConversationTester from "../components/AIConversationTester";

const API_BASE = "http://localhost:5000/api";

const LEAD_CAPTURE_INTENTS = new Set(["trial_booking", "admissions", "pricing"]);

// ── Wordmark ──────────────────────────────────────────────────────────────────

function Wordmark() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50 shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="text-white w-[18px] h-[18px]">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
            </div>
            <div>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                    Blueslate
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                    Customer Portal
                </p>
            </div>
        </div>
    );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ role, content }) {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isUser
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                }`}
            >
                {content}
            </div>
        </div>
    );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                    {[0, 150, 300].map((delay) => (
                        <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Post-conversation lead capture form ───────────────────────────────────────

function LeadCaptureForm({ businessName, onSubmit, onSkip, loading, error }) {
    const [name,            setName]            = useState("");
    const [email,           setEmail]           = useState("");
    const [phone,           setPhone]           = useState("");
    const [notes,           setNotes]           = useState("");
    const [validationError, setValidationError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setValidationError("Please enter your name.");
            return;
        }
        if (!email.trim() && !phone.trim()) {
            setValidationError("Please enter an email address or phone number.");
            return;
        }
        setValidationError("");
        onSubmit({
            name:  name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
        });
    };

    const inputClass =
        "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm " +
        "text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 " +
        "bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 " +
        "focus:border-transparent transition disabled:opacity-50";

    return (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">

                <div className="px-7 pt-7 pb-5">
                    <Wordmark />
                    <div className="mt-5">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                            Stay in touch
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                            Leave your details and {businessName || "the team"} will follow up with you.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-3">
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setValidationError(""); }}
                        disabled={loading}
                        className={inputClass}
                    />
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setValidationError(""); }}
                        disabled={loading}
                        className={inputClass}
                    />
                    <input
                        type="tel"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setValidationError(""); }}
                        disabled={loading}
                        className={inputClass}
                    />
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            How can we help you?
                        </label>
                        <textarea
                            placeholder="Optional — describe what you need help with"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading}
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {(validationError || error) && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {validationError || error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center justify-center gap-2 mt-1"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                Saving…
                            </>
                        ) : "Submit"}
                    </button>

                    <button
                        type="button"
                        onClick={onSkip}
                        disabled={loading}
                        className="w-full py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                        Skip
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerPortalPage() {
    const { dark, toggle } = useTheme();

    // State machine: 1 = lookup, 2 = CTAs, 3 = chat, 4 = voice-call
    const [step, setStep] = useState(1);

    // Step 1
    const [website,       setWebsite]       = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError,   setLookupError]   = useState(null);

    // Carried across steps 2 → 3 / 4
    const [businessName,      setBusinessName]      = useState("");
    const [conversationToken, setConversationToken] = useState(null);
    const [receptionistName,  setReceptionistName]  = useState("Virtual Receptionist");

    // Step 3 — chat
    const [messages,       setMessages]       = useState([]);
    const [inputText,      setInputText]      = useState("");
    const [chatLoading,    setChatLoading]    = useState(false);
    const [chatError,      setChatError]      = useState(null);
    const [conversationId, setConversationId] = useState(null);

    // Step 4 — voice call
    const [isDialing,       setIsDialing]       = useState(false);
    const [callEnded,       setCallEnded]        = useState(false);
    const [thankYouVariant, setThankYouVariant]  = useState(null); // "submitted" | "skipped" | null

    // Post-conversation lead capture form
    const [showLeadForm,    setShowLeadForm]    = useState(false);
    const [leadFormLoading, setLeadFormLoading] = useState(false);
    const [leadFormError,   setLeadFormError]   = useState(null);
    const [leadFormSource,  setLeadFormSource]  = useState(null); // "chat" | "voice"
    const [postConvConvId,  setPostConvConvId]  = useState(null);
    const [chatEscalated,   setChatEscalated]   = useState(false);

    const messagesEndRef             = useRef(null);
    const chatAwaitingLeadCaptureRef = useRef(false);
    const chatEscalatedRef           = useRef(false);
    const chatLeadCapturedRef        = useRef(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatLoading]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const resetChat = () => {
        chatAwaitingLeadCaptureRef.current = false;
        chatEscalatedRef.current           = false;
        chatLeadCapturedRef.current        = false;
        setMessages([]);
        setConversationId(null);
        setChatError(null);
        setInputText("");
        setChatEscalated(false);
    };

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!website.trim()) return;

        setLookupLoading(true);
        setLookupError(null);

        try {
            const res  = await fetch(`${API_BASE}/portal/lookup`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ website: website.trim() }),
            });
            const data = await res.json();

            if (!res.ok) {
                setLookupError(data.message ?? "Something went wrong. Please try again.");
                return;
            }

            setBusinessName(data.data.businessName);
            setConversationToken(data.data.conversationToken);
            setReceptionistName(data.data.receptionistName ?? "Virtual Receptionist");
            setStep(2);
        } catch {
            setLookupError("Could not reach the server. Please try again.");
        } finally {
            setLookupLoading(false);
        }
    };

    const handleStartChat = () => {
        resetChat();
        setMessages([
            {
                role:    "assistant",
                content: `Hi! I'm ${receptionistName}, your virtual receptionist for ${businessName}. How can I help you today?`,
            },
        ]);
        setStep(3);
    };

    const handleStartCall = () => {
        setIsDialing(true);
        setTimeout(() => {
            setIsDialing(false);
            setStep(4);
        }, 1500);
    };

    // Called from the "End chat" link and the Back button while in step 3.
    // Shows the lead form when the conversation qualifies (lead intent detected
    // or the customer sent at least 4 messages).
    const handleEndChat = () => {
        const userMsgCount   = messages.filter((m) => m.role === "user").length;
        const shouldShowForm =
            !chatLeadCapturedRef.current &&
            (chatAwaitingLeadCaptureRef.current || chatEscalatedRef.current || userMsgCount >= 4) &&
            !!conversationId;

        if (shouldShowForm) {
            setPostConvConvId(conversationId);
            setLeadFormSource("chat");
            setShowLeadForm(true);
        } else {
            resetChat();
            setStep(2);
        }
    };

    const handleCallEnd = async (callData) => {
        if (callData?.conversationId && conversationToken) {
            try {
                await fetch(`${API_BASE}/portal/finalize/${callData.conversationId}`, {
                    method:  "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        conversationToken,
                        metadata: {
                            durationSeconds: callData.durationSeconds ?? null,
                            outcome:         callData.outcome         ?? "INFORMATION_ONLY",
                            lastIntent:      callData.lastIntent      ?? null,
                            startedAt:       callData.startedAt       ?? null,
                            lead:            callData.lead            ?? null,
                        },
                    }),
                });
            } catch {
                // non-fatal
            }
        }

        const escalated          = callData?.outcome === "ESCALATED";
        const leadIntentDetected = callData?.outcome === "LEAD_CAPTURED";
        const enoughMessages     = (callData?.callerMessageCount ?? 0) >= 4;
        const leadCaptured       = callData?.leadCapturedInline ?? false;

        const shouldShowForm =
            !leadCaptured &&
            (escalated || leadIntentDetected || enoughMessages) &&
            !!callData?.conversationId;

        if (shouldShowForm) {
            setPostConvConvId(callData.conversationId);
            setLeadFormSource("voice");
            setShowLeadForm(true);
        } else {
            setCallEnded(true);
        }
    };

    const handleLeadFormSubmit = async ({ name, email, phone, notes }) => {
        setLeadFormLoading(true);
        setLeadFormError(null);
        try {
            const res = await fetch(`${API_BASE}/portal/leads`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    conversationToken,
                    name,
                    email,
                    phone,
                    notes,
                    conversationId: postConvConvId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Something went wrong. Please try again.");

            setShowLeadForm(false);
            setLeadFormError(null);
            if (leadFormSource === "voice") {
                setThankYouVariant("submitted");
                setCallEnded(true);
            } else {
                resetChat();
                setStep(2);
            }
        } catch (err) {
            setLeadFormError(err.message);
        } finally {
            setLeadFormLoading(false);
        }
    };

    const handleLeadFormSkip = () => {
        setShowLeadForm(false);
        setLeadFormError(null);
        if (leadFormSource === "voice") {
            setThankYouVariant("skipped");
            setCallEnded(true);
        } else {
            resetChat();
            setStep(2);
        }
    };

    // portalSendMessage — passed to AIConversationTester as sendMessage prop.
    // AIConversationTester calls it as sendMessageOverride(content, conversationIdRef.current),
    // so the second argument carries the conversation ID tracked inside the tester.
    const portalSendMessage = async (content, existingConvId) => {
        const res = await fetch(`${API_BASE}/portal/chat`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                conversationToken,
                question:       content,
                conversationId: existingConvId ?? null,
                source:         "customer_portal_voice",
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
        setConversationId(data.data.conversationId);
        return data.data; // { answer, intent, conversationId }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        const q = inputText.trim();
        if (!q || chatLoading || chatEscalated) return;

        setMessages((prev) => [...prev, { role: "user", content: q }]);
        setInputText("");
        setChatLoading(true);
        setChatError(null);

        try {
            const res  = await fetch(`${API_BASE}/portal/chat`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    conversationToken,
                    question:       q,
                    conversationId: conversationId ?? null,
                    source:         "customer_portal_chat",
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setChatError(data.message ?? "Something went wrong. Please try again.");
                return;
            }

            const newConvId = data.data.conversationId;
            setConversationId(newConvId);

            if (data.data.leadCaptured) {
                chatLeadCapturedRef.current = true;
            }

            setMessages((prev) => [...prev, { role: "assistant", content: data.data.answer }]);

            const intent = data.data.intent;

            if (intent?.requiresHuman && !chatEscalatedRef.current) {
                chatEscalatedRef.current = true;
                setChatEscalated(true);
                const handoffMsg = "I completely understand. Let me connect you with our team — someone will follow up with you shortly.";
                setMessages((prev) => [...prev, { role: "assistant", content: handoffMsg }]);
                if (!chatLeadCapturedRef.current) {
                    setPostConvConvId(newConvId);
                    setLeadFormSource("chat");
                    setShowLeadForm(true);
                }
            } else if (!chatAwaitingLeadCaptureRef.current && LEAD_CAPTURE_INTENTS.has(intent?.intent)) {
                chatAwaitingLeadCaptureRef.current = true;
                const followUp = "I'd be happy to help. Could I get your name and email address or phone number so our team can contact you?";
                setMessages((prev) => [...prev, { role: "assistant", content: followUp }]);
            }
        } catch {
            setChatError("Could not reach the server. Please try again.");
        } finally {
            setChatLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const goBack = () => {
        if (step === 3) {
            handleEndChat();
        } else if (step === 2) {
            setStep(1);
            setLookupError(null);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const isChat = step === 3;

    const callGreeting = businessName
        ? `Hi! Thank you for calling ${businessName}. This is ${receptionistName}. How can I help you today?`
        : `Hi! This is ${receptionistName}. How can I help you today?`;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-8 relative">

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
                <div
                    className={`bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col ${
                        isChat ? "h-[600px]" : ""
                    }`}
                >
                    {/* ── Card header ──────────────────────────────────────── */}
                    <div className="px-7 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 shrink-0">

                        {/* Back button */}
                        {step > 1 && step < 4 && (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3"
                            >
                                <ArrowLeft size={13} />
                                Back
                            </button>
                        )}

                        <Wordmark />

                        {/* Step 2 — business found */}
                        {step === 2 && (
                            <div className="mt-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                    {businessName}
                                </h2>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    {receptionistName} is available
                                </p>
                            </div>
                        )}

                        {/* Step 3 — chat header */}
                        {step === 3 && (
                            <div className="mt-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {businessName}
                                    </p>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                        {receptionistName}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Step 1 — website input ───────────────────────────── */}
                    {step === 1 && (
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
                                            onChange={(e) => {
                                                setWebsite(e.target.value);
                                                setLookupError(null);
                                            }}
                                            placeholder="yourbusiness.com"
                                            disabled={lookupLoading}
                                            autoComplete="off"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none transition focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {lookupError && (
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                        {lookupError}
                                    </p>
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
                    )}

                    {/* ── Step 2 — CTAs ────────────────────────────────────── */}
                    {step === 2 && (
                        <div className="px-6 py-6">
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
                                Hi, I'm {receptionistName}. How can I help you today?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleStartChat}
                                    className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center shrink-0 transition-colors">
                                        <MessageSquare size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Chat with {receptionistName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Get answers instantly through messaging.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleStartCall}
                                    className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center shrink-0 transition-colors">
                                        <PhoneCall size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Call {receptionistName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Speak with {receptionistName} using your microphone.</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3 — Chat ────────────────────────────────────── */}
                    {step === 3 && (
                        <>
                            {/* Message list */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {/* Welcome context card */}
                                <div className="flex justify-start mb-1">
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3.5 py-2.5 max-w-[90%]">
                                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold text-white">
                                                {(receptionistName || "A").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            Ask me anything about {businessName}
                                        </p>
                                    </div>
                                </div>
                                {messages.map((msg, i) => (
                                    <MessageBubble key={i} role={msg.role} content={msg.content} />
                                ))}

                                {chatLoading && <TypingIndicator />}

                                {chatError && (
                                    <p className="text-center text-xs text-red-500 dark:text-red-400 py-1">
                                        {chatError}
                                    </p>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input bar */}
                            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-4">
                                <form
                                    onSubmit={handleSend}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={chatEscalated ? "Our team will follow up shortly…" : "Ask a question…"}
                                        disabled={chatLoading || chatEscalated}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={chatLoading || chatEscalated || !inputText.trim()}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shrink-0"
                                        aria-label="Send message"
                                    >
                                        {chatLoading
                                            ? <Loader2 size={16} className="animate-spin" />
                                            : <Send size={16} />
                                        }
                                    </button>
                                </form>
                                <div className="flex items-center justify-end mt-2">
                                    <button
                                        type="button"
                                        onClick={handleEndChat}
                                        className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        End chat
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Dialing overlay ──────────────────────────────────────────── */}
            {isDialing && (
                <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center animate-pulse">
                        <PhoneCall size={40} className="text-blue-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white text-xl font-semibold">{receptionistName}</p>
                        <p className="text-gray-400 text-sm mt-1">Calling...</p>
                    </div>
                </div>
            )}

            {/* ── Voice call overlay ───────────────────────────────────────── */}
            {step === 4 && !callEnded && !showLeadForm && (
                <div className="fixed inset-0 z-50">
                    <AIConversationTester
                        greeting={callGreeting}
                        businessName={businessName}
                        businessContextId=""
                        businessContextUrl=""
                        mode="receptionist"
                        agentName={receptionistName}
                        portalMode={true}
                        sendMessage={portalSendMessage}
                        onCallEnd={handleCallEnd}
                    />
                </div>
            )}

            {/* ── Post-conversation lead capture form ──────────────────────── */}
            {showLeadForm && (
                <LeadCaptureForm
                    businessName={businessName}
                    onSubmit={handleLeadFormSubmit}
                    onSkip={handleLeadFormSkip}
                    loading={leadFormLoading}
                    error={leadFormError}
                />
            )}

            {/* ── Thank-you overlay ────────────────────────────────────────── */}
            {callEnded && (
                <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100 dark:border-gray-800">
                        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-5">
                            <PhoneCall size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                            {thankYouVariant === "submitted"
                                ? "Thank you. A team member will contact you."
                                : thankYouVariant === "skipped"
                                ? "Thank you for contacting us."
                                : `Thank you for contacting ${businessName}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {thankYouVariant === "submitted" ? "We'll be in touch soon." : "We appreciate your time."}
                        </p>
                        <button
                            onClick={() => { window.location.href = "/customer"; }}
                            className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
