import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Moon, Send, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Wordmark, LeadCaptureForm, PostConvOverlay, FollowUpPrompt } from "../components/CustomerPortalComponents";
import { API_BASE_URL } from "../utils/api";
const LEAD_CAPTURE_INTENTS = new Set(["trial_booking", "admissions", "pricing"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (d) =>
    d instanceof Date ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

function loadChatSession(token) {
    try {
        const s = sessionStorage.getItem(`portal_chat_${token}`);
        return s ? JSON.parse(s) : null;
    } catch { return null; }
}

function saveChatSession(token, data) {
    try {
        sessionStorage.setItem(`portal_chat_${token}`, JSON.stringify(data));
    } catch { /* non-fatal */ }
}


// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ role, content, agentName, time }) {
    const isUser = role === "user";
    return (
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-0.5`}>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600 px-1">
                {isUser
                    ? `${time ? `${fmtTime(time)} · ` : ""}You`
                    : `${agentName || "Receptionist"}${time ? ` · ${fmtTime(time)}` : ""}`}
            </p>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                isUser
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
            }`}>
                {content}
            </div>
        </div>
    );
}

function TypingIndicator({ agentName }) {
    return (
        <div className="flex flex-col items-start gap-0.5">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600 px-1">
                {agentName || "Receptionist"} is typing...
            </p>
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
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerChatPage() {
    const { token }        = useParams();
    const location         = useLocation();
    const navigate         = useNavigate();
    const { dark, toggle } = useTheme();

    // ── Business identity — from nav state or sessionStorage ─────────────────
    const [sessionData] = useState(() => {
        if (location.state?.businessName) return location.state;
        try {
            const s = sessionStorage.getItem(`portal_session_${token}`);
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (!sessionData) navigate("/customer", { replace: true });
    }, [sessionData, navigate]);

    const businessName     = sessionData?.businessName     || "";
    const receptionistName = sessionData?.receptionistName || "Virtual Receptionist";
    const website          = sessionData?.website          || "";

    // ── Hydrate state from sessionStorage (refresh-safe) ─────────────────────
    const [persist] = useState(() => loadChatSession(token));

    const [messages,         setMessages]         = useState(() =>
        persist?.messages || []
    );
    const [chatMessageTimes, setChatMessageTimes] = useState(() =>
        (persist?.chatMessageTimes || []).map((t) => new Date(t))
    );
    const [conversationId,   setConversationId]   = useState(persist?.conversationId   || null);
    const [chatEscalated,    setChatEscalated]    = useState(persist?.chatEscalated    || false);
    const [inputText,        setInputText]        = useState("");
    const [chatLoading,      setChatLoading]      = useState(false);
    const [chatError,        setChatError]        = useState(null);

    // Outcome state (shared with call flow)
    const [chatEnded,        setChatEnded]        = useState(persist?.chatEnded        || false);
    const [thankYouVariant,  setThankYouVariant]  = useState(persist?.thankYouVariant  || null);
    const [capturedLeadData, setCapturedLeadData] = useState(persist?.capturedLeadData || null);
    const [chatOutcome,      setChatOutcome]      = useState(persist?.chatOutcome      || "INFORMATION_ONLY");

    // Lead form
    const [showLeadForm,       setShowLeadForm]       = useState(persist?.showLeadForm    || false);
    const [leadFormLoading,    setLeadFormLoading]    = useState(false);
    const [leadFormError,      setLeadFormError]      = useState(null);
    const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);

    // ── Refs (initialized from persisted state) ───────────────────────────────
    const messagesEndRef             = useRef(null);
    const chatAwaitingLeadCaptureRef = useRef(persist?.awaitingLeadCapture || false);
    const chatEscalatedRef           = useRef(persist?.chatEscalated       || false);
    const chatLeadCapturedRef        = useRef(persist?.leadCaptured        || false);
    const greetingInitRef            = useRef((persist?.messages?.length   || 0) > 0);
    // Start prevMsgCount at the already-restored message count
    const prevMsgCountRef            = useRef(persist?.messages?.length    || 0);

    // ── Persist to sessionStorage on every relevant state change ─────────────
    useEffect(() => {
        if (!sessionData) return;
        saveChatSession(token, {
            messages,
            chatMessageTimes: chatMessageTimes.map((d) => (d instanceof Date ? d.toISOString() : d)),
            conversationId,
            chatEscalated,
            chatEnded,
            thankYouVariant,
            capturedLeadData,
            chatOutcome,
            showLeadForm,
            awaitingLeadCapture: chatAwaitingLeadCaptureRef.current,
            leadCaptured:        chatLeadCapturedRef.current,
        });
    }, [messages, chatMessageTimes, conversationId, chatEscalated, chatEnded, thankYouVariant, capturedLeadData, chatOutcome, showLeadForm, token, sessionData]);

    // ── Greeting — only on first load (skip if restoring from session) ────────
    useEffect(() => {
        if (!sessionData || greetingInitRef.current) return;
        greetingInitRef.current = true;
        setMessages([{
            role:    "assistant",
            content: `Hi! I'm ${receptionistName}, your virtual receptionist for ${businessName}. How can I help you today?`,
        }]);
    }, [sessionData, businessName, receptionistName]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, chatLoading]);

    // ── Per-message timestamps (only for newly added messages) ────────────────
    useEffect(() => {
        const added = messages.length - prevMsgCountRef.current;
        if (added > 0) {
            const now = new Date();
            setChatMessageTimes((prev) => [...prev, ...Array(added).fill(now)]);
            prevMsgCountRef.current = messages.length;
        }
    }, [messages.length]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    // Back: preserve full conversation — nothing is cleared
    const handleBack = useCallback(() => {
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    // Done: clear this conversation, keep portal session, return to Step 2
    const handleDone = useCallback(() => {
        sessionStorage.removeItem(`portal_chat_${token}`);
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    // New Chat: clear conversation, start fresh at the same route
    const handleRetry = useCallback(() => {
        sessionStorage.removeItem(`portal_chat_${token}`);
        navigate(`/chat/${token}`, { state: { businessName, receptionistName, website } });
    }, [token, businessName, receptionistName, website, navigate]);

    const handleSend = async (e) => {
        e?.preventDefault();
        const q = inputText.trim();
        if (!q || chatLoading || chatEscalated) return;

        setMessages((prev) => [...prev, { role: "user", content: q }]);
        setInputText("");
        setChatLoading(true);
        setChatError(null);

        try {
            const res  = await fetch(`${API_BASE_URL}/portal/chat`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    conversationToken: token,
                    question:          q,
                    conversationId:    conversationId ?? null,
                    source:            "customer_portal_chat",
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setChatError(data.message ?? "Something went wrong. Please try again.");
                return;
            }

            const newConvId = data.data.conversationId;
            setConversationId(newConvId);

            if (data.data.leadCaptured) chatLeadCapturedRef.current = true;

            setMessages((prev) => [...prev, { role: "assistant", content: data.data.answer }]);

            const intent = data.data.intent;
            if (intent?.requiresHuman && !chatEscalatedRef.current) {
                chatEscalatedRef.current = true;
                setChatEscalated(true);
                setMessages((prev) => [...prev, {
                    role:    "assistant",
                    content: "I completely understand. Let me connect you with our team — someone will follow up with you shortly.",
                }]);
                if (!chatLeadCapturedRef.current) {
                    setChatOutcome("ESCALATED");
                    setShowLeadForm(true);
                }
            } else if (!chatAwaitingLeadCaptureRef.current && LEAD_CAPTURE_INTENTS.has(intent?.intent)) {
                chatAwaitingLeadCaptureRef.current = true;
                setMessages((prev) => [...prev, {
                    role:    "assistant",
                    content: "I'd be happy to help. Could I get your name and email address or phone number so our team can contact you?",
                }]);
            }
        } catch {
            setChatError("Could not reach the server. Please try again.");
        } finally {
            setChatLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleEndChat = () => {
        // Lead was captured inline — no further prompts needed
        if (chatLeadCapturedRef.current) {
            setChatOutcome("LEAD_CAPTURED");
            setChatEnded(true);
            return;
        }
        // Always ask follow-up question before ending
        setShowFollowUpPrompt(true);
    };

    const handleFollowUpYes = () => {
        setShowFollowUpPrompt(false);
        if (conversationId) {
            setChatOutcome(chatEscalatedRef.current ? "ESCALATED" : "LEAD_CAPTURED");
            setShowLeadForm(true);
        } else {
            // No conversation yet — nothing to save
            setChatOutcome("INFORMATION_ONLY");
            setChatEnded(true);
        }
    };

    const handleFollowUpNo = () => {
        setShowFollowUpPrompt(false);
        setChatOutcome("INFORMATION_ONLY");
        setChatEnded(true);
    };

    const handleLeadFormSubmit = async ({ name, email, phone, notes }) => {
        setLeadFormLoading(true);
        setLeadFormError(null);
        try {
            const res  = await fetch(`${API_BASE_URL}/portal/leads`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ conversationToken: token, name, email, phone, notes, conversationId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Something went wrong.");

            chatLeadCapturedRef.current = true;
            setShowLeadForm(false);
            setCapturedLeadData({ name, email, phone });
            setThankYouVariant("submitted");
            setChatOutcome("LEAD_CAPTURED");
            setChatEnded(true);
        } catch (err) {
            setLeadFormError(err.message);
        } finally {
            setLeadFormLoading(false);
        }
    };

    const handleLeadFormSkip = () => {
        setShowLeadForm(false);
        setThankYouVariant("skipped");
        setChatEnded(true);
    };

    if (!sessionData) return null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-start sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-8 relative">

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

            <div className="w-full sm:max-w-md h-screen sm:h-auto">
                <div className="bg-white dark:bg-gray-900 sm:rounded-3xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 border-0 sm:border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-full sm:h-[600px]">

                    {/* Header */}
                    <div className="px-7 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3"
                        >
                            <ArrowLeft size={13} />
                            Back to Portal
                        </button>
                        <Wordmark />
                        <div className="mt-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                                    {(businessName || "B").charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{businessName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                    <span className="text-[11px] text-green-600 dark:text-green-400 font-medium shrink-0">{receptionistName}</span>
                                    {website && <span className="text-[11px] text-gray-400 dark:text-gray-600 truncate min-w-0">· {website}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message list — scrollable, custom scrollbar */}
                    <div className="flex-1 overflow-y-auto portal-scrollbar px-5 py-4 space-y-3">
                        <div className="flex items-center gap-3 pb-1">
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide shrink-0">Chat started</span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                        </div>
                        {messages.map((msg, i) => (
                            <MessageBubble
                                key={i}
                                role={msg.role}
                                content={msg.content}
                                agentName={receptionistName}
                                time={chatMessageTimes[i]}
                            />
                        ))}
                        {chatLoading && <TypingIndicator agentName={receptionistName} />}
                        {chatError && (
                            <p className="text-center text-xs text-red-500 dark:text-red-400 py-1">{chatError}</p>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-4">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
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
                                {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
                </div>
            </div>

            {/* Follow-up prompt — shown before lead form */}
            {showFollowUpPrompt && !chatEnded && !showLeadForm && (
                <FollowUpPrompt
                    businessName={businessName}
                    mode="chat"
                    onYes={handleFollowUpYes}
                    onNo={handleFollowUpNo}
                />
            )}

            {/* Lead capture form */}
            {showLeadForm && !chatEnded && (
                <LeadCaptureForm
                    businessName={businessName}
                    onSubmit={handleLeadFormSubmit}
                    onSkip={handleLeadFormSkip}
                    loading={leadFormLoading}
                    error={leadFormError}
                />
            )}

            {/* Post-chat outcome screen */}
            {chatEnded && (
                <PostConvOverlay
                    mode="chat"
                    businessName={businessName}
                    website={website}
                    thankYouVariant={thankYouVariant}
                    outcome={chatOutcome}
                    durationSeconds={null}
                    capturedLeadData={capturedLeadData}
                    onLeaveDetails={() => { setChatEnded(false); setThankYouVariant(null); setShowLeadForm(true); }}
                    onRetry={handleRetry}
                    onDone={handleDone}
                />
            )}
        </div>
    );
}
