import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Moon, Sun } from "lucide-react";
import AIConversationTester from "../components/AIConversationTester";
import { LeadCaptureForm, PostConvOverlay, FollowUpPrompt } from "../components/CustomerPortalComponents";
import { useTheme } from "../hooks/useTheme";
import { API_BASE_URL } from "../utils/api";

// ── Dialing trust checkmark ───────────────────────────────────────────────────

function TrustCheck({ delay, text }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div className={`flex items-start gap-3 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
            <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-300 leading-snug">{text}</span>
        </div>
    );
}

// ── Session helpers ────────────────────────────────────────────────────────────

function loadCallSession(token) {
    try {
        const s = sessionStorage.getItem(`portal_call_${token}`);
        return s ? JSON.parse(s) : null;
    } catch { return null; }
}

function saveCallSession(token, data) {
    try {
        sessionStorage.setItem(`portal_call_${token}`, JSON.stringify(data));
    } catch { /* non-fatal */ }
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerCallPage() {
    const { token }  = useParams();
    const location   = useLocation();
    const navigate   = useNavigate();
    const { dark, toggle } = useTheme();

    // Business identity — from nav state (first load) or sessionStorage (refresh)
    const [sessionData] = useState(() => {
        if (location.state?.businessName) return location.state;
        try {
            const stored = sessionStorage.getItem(`portal_session_${token}`);
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (!sessionData) navigate("/customer", { replace: true });
    }, [sessionData, navigate]);

    const businessName     = sessionData?.businessName     || "";
    const receptionistName = sessionData?.receptionistName || "Virtual Receptionist";
    const website          = sessionData?.website          || "";

    // Hydrate persisted call state
    const [callPersist]  = useState(() => loadCallSession(token));
    const wasCallStarted = callPersist?.callStarted || false;

    // Dialing flow (skipped entirely on refresh if call was already active)
    const [isDialing,   setIsDialing]   = useState(!wasCallStarted);
    const [isConnected, setIsConnected] = useState(false);
    const [callActive,  setCallActive]  = useState(wasCallStarted);

    // Persisted transcript (updated via onMessagesChange from AIConversationTester)
    const [callMessages, setCallMessages] = useState(callPersist?.messages || []);

    // callStartTime — persisted when call first becomes active
    const callStartTimeRef = useRef(callPersist?.callStartTime || null);

    // Compute elapsed seconds for timer resume (only meaningful on refresh)
    const initialCallSeconds = callPersist?.callStartTime
        ? Math.max(0, Math.floor((Date.now() - new Date(callPersist.callStartTime).getTime()) / 1000))
        : 0;

    // Skip greeting TTS + replay when restoring an already-started call
    const skipGreeting = wasCallStarted;

    // Post-call state (hydrate from persist so outcome screen survives refresh)
    const [callEnded,           setCallEnded]           = useState(callPersist?.callEnded           || false);
    const [thankYouVariant,     setThankYouVariant]     = useState(callPersist?.thankYouVariant     || null);
    const [callDurationSeconds, setCallDurationSeconds] = useState(callPersist?.callDurationSeconds ?? null);
    const [callOutcome,         setCallOutcome]         = useState(callPersist?.callOutcome         || "INFORMATION_ONLY");
    const [capturedLeadData,    setCapturedLeadData]    = useState(callPersist?.capturedLeadData    || null);

    // Lead form
    const [showLeadForm,       setShowLeadForm]       = useState(callPersist?.showLeadForm    || false);
    const [leadFormLoading,    setLeadFormLoading]    = useState(false);
    const [leadFormError,      setLeadFormError]      = useState(null);
    const [postConvConvId,     setPostConvConvId]     = useState(callPersist?.postConvConvId  || null);
    const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);

    // ── Persist to sessionStorage on every state change ───────────────────────
    useEffect(() => {
        if (!sessionData) return;
        saveCallSession(token, {
            callStarted:        callActive,
            callStartTime:      callStartTimeRef.current,
            messages:           callMessages,
            callEnded,
            thankYouVariant,
            callDurationSeconds,
            callOutcome,
            capturedLeadData,
            showLeadForm,
            postConvConvId,
        });
    }, [callActive, callMessages, callEnded, thankYouVariant, callDurationSeconds, callOutcome, capturedLeadData, showLeadForm, postConvConvId, token, sessionData]);

    // ── Dialing sequence (skipped when restoring an active call) ─────────────
    useEffect(() => {
        if (!sessionData || wasCallStarted) return;
        const t1 = setTimeout(() => {
            setIsDialing(false);
            setIsConnected(true);
            const t2 = setTimeout(() => {
                setIsConnected(false);
                callStartTimeRef.current = new Date().toISOString();
                setCallActive(true);
            }, 700);
            return () => clearTimeout(t2);
        }, 2800);
        return () => clearTimeout(t1);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const callGreeting = businessName
        ? `Hi! Thank you for calling ${businessName}. This is ${receptionistName}. How can I help you today?`
        : `Hi! This is ${receptionistName}. How can I help you today?`;

    // ── Handlers ─────────────────────────────────────────────────────────────

    // Back: preserve call session — only Done clears sessionStorage
    const handleBack = useCallback(() => {
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    // Done: clear only the call session, keep portal session, return to Step 2
    const handleDone = useCallback(() => {
        sessionStorage.removeItem(`portal_call_${token}`);
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    // Call Again: clear call session, start fresh at the same route
    const handleRetry = useCallback(() => {
        sessionStorage.removeItem(`portal_call_${token}`);
        navigate(`/receptionist/${token}`, { state: { businessName, receptionistName, website } });
    }, [token, businessName, receptionistName, website, navigate]);

    const handleMessagesChange = useCallback((msgs) => {
        setCallMessages(msgs);
    }, []);

    const portalSendMessage = async (content, existingConvId) => {
        const res  = await fetch(`${API_BASE_URL}/portal/chat`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                conversationToken: token,
                question:          content,
                conversationId:    existingConvId ?? null,
                source:            "customer_portal_voice",
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
        return data.data;
    };

    const handleCallEnd = (callData) => {
        // Fire-and-forget — do not block the follow-up prompt on network latency
        if (callData?.conversationId) {
            fetch(`${API_BASE_URL}/portal/finalize/${callData.conversationId}`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    conversationToken: token,
                    metadata: {
                        durationSeconds: callData.durationSeconds ?? null,
                        outcome:         callData.outcome         ?? "INFORMATION_ONLY",
                        lastIntent:      callData.lastIntent      ?? null,
                        startedAt:       callData.startedAt       ?? null,
                        lead:            callData.lead            ?? null,
                    },
                }),
            }).catch(() => {});
        }

        const dur  = callData?.durationSeconds ?? null;
        const outc = callData?.outcome ?? "INFORMATION_ONLY";
        setCallDurationSeconds(dur);
        setCallOutcome(outc);

        // Store any inline lead data
        const inlineLead = callData?.lead;
        if (inlineLead && (inlineLead.name || inlineLead.email || inlineLead.phone)) {
            setCapturedLeadData(inlineLead);
        }

        // If lead was captured inline, skip follow-up prompt and go directly to outcome
        if (callData?.leadCapturedInline) {
            setCallEnded(true);
            return;
        }

        // Store convId for the lead form (in case user says Yes to follow-up)
        if (callData?.conversationId) {
            setPostConvConvId(callData.conversationId);
        }

        // Always ask follow-up question before showing outcome
        setShowFollowUpPrompt(true);
    };

    const handleFollowUpYes = () => {
        setShowFollowUpPrompt(false);
        setShowLeadForm(true);
    };

    const handleFollowUpNo = () => {
        setShowFollowUpPrompt(false);
        setCallOutcome("INFORMATION_ONLY");
        setCallEnded(true);
    };

    const handleLeadFormSubmit = async ({ name, email, phone, notes }) => {
        setLeadFormLoading(true);
        setLeadFormError(null);
        try {
            const res  = await fetch(`${API_BASE_URL}/portal/leads`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    conversationToken: token,
                    name, email, phone, notes,
                    conversationId:    postConvConvId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
            setShowLeadForm(false);
            setCapturedLeadData({ name, email, phone });
            setThankYouVariant("submitted");
            setCallOutcome("LEAD_CAPTURED");
            setCallEnded(true);
        } catch (err) {
            setLeadFormError(err.message);
        } finally {
            setLeadFormLoading(false);
        }
    };

    const handleLeadFormSkip = () => {
        setShowLeadForm(false);
        setThankYouVariant("skipped");
        setCallEnded(true);
    };

    if (!sessionData) return null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Dialing overlay — trust frame */}
            {isDialing && (
                <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col px-8">
                    {/* Back + theme toggle row */}
                    <div className="pt-5 pb-2 shrink-0 flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <ArrowLeft size={13} />
                            Back to Portal
                        </button>
                        <button
                            onClick={toggle}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                            title={dark ? "Light mode" : "Dark mode"}
                        >
                            {dark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mb-6">
                            <span className="text-2xl font-black text-blue-400">
                                {(businessName || "B").charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <p className="text-white text-lg font-bold mb-8 text-center">Calling {businessName}</p>
                        <div className="w-full max-w-xs space-y-3.5 mb-8">
                            <TrustCheck delay={120} text={`Connected to ${businessName}`} />
                            <TrustCheck delay={350} text="Receptionist available" />
                            <TrustCheck delay={620} text="This conversation may be recorded for follow-up purposes" />
                        </div>
                        <div className="flex items-center gap-2">
                            {[0, 150, 300].map((d) => (
                                <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                            <span className="text-sm text-gray-400 ml-1">Connecting...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Connected moment — brief transition screen */}
            {isConnected && (
                <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-4 px-8">
                    <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                        <CheckCircle2 size={28} className="text-green-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white text-lg font-bold">Connected</p>
                        <p className="text-gray-400 text-sm mt-1">{receptionistName} has joined the call</p>
                    </div>
                </div>
            )}

            {/* Active voice call */}
            {callActive && !callEnded && !showLeadForm && (
                <AIConversationTester
                    greeting={callGreeting}
                    businessName={businessName}
                    businessContextId=""
                    businessContextUrl={website}
                    mode="receptionist"
                    agentName={receptionistName}
                    portalMode={true}
                    sendMessage={portalSendMessage}
                    onCallEnd={handleCallEnd}
                    initialMessages={callMessages}
                    onMessagesChange={handleMessagesChange}
                    skipGreeting={skipGreeting}
                    initialCallSeconds={initialCallSeconds}
                />
            )}

            {/* Follow-up prompt — shown before lead form */}
            {showFollowUpPrompt && !callEnded && !showLeadForm && (
                <FollowUpPrompt
                    businessName={businessName}
                    mode="call"
                    onYes={handleFollowUpYes}
                    onNo={handleFollowUpNo}
                />
            )}

            {/* Post-call lead capture form */}
            {showLeadForm && !callEnded && (
                <LeadCaptureForm
                    businessName={businessName}
                    onSubmit={handleLeadFormSubmit}
                    onSkip={handleLeadFormSkip}
                    loading={leadFormLoading}
                    error={leadFormError}
                />
            )}

            {/* Post-call outcome screen */}
            {callEnded && (
                <PostConvOverlay
                    mode="call"
                    businessName={businessName}
                    website={website}
                    thankYouVariant={thankYouVariant}
                    outcome={callOutcome}
                    durationSeconds={callDurationSeconds}
                    capturedLeadData={capturedLeadData}
                    onLeaveDetails={() => { setCallEnded(false); setThankYouVariant(null); setShowLeadForm(true); }}
                    onRetry={handleRetry}
                    onDone={handleDone}
                />
            )}
        </>
    );
}
