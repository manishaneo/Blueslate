import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CheckCircle2, Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { BusinessAvatar, PoweredBy, FollowUpScreen } from "../components/CustomerPortalComponents";
import { API_BASE_URL } from "../utils/api";

// ── Animated trust-check row (shown on the "calling you now" screen) ──────────

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

    // ── Form state ────────────────────────────────────────────────────────────
    const [phone,    setPhone]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [calling,  setCalling]  = useState(false); // "we're calling you now" screen
    const [callId,   setCallId]   = useState(null);
    const [callEnded, setCallEnded] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handleBack = useCallback(() => {
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    const handleDone = useCallback(() => {
        navigate("/customer", { state: { step: 2, businessName, receptionistName, website, token } });
    }, [token, businessName, receptionistName, website, navigate]);

    const handleManualDoneClick = () => {
        setCallEnded(true);
    };

    // ── Call polling ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!calling || !callId || callEnded) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/portal/call-status/${token}?callId=${callId}`);
                const data = await res.json();
                if (data.isEnded) {
                    setCallEnded(true);
                }
            } catch (err) {
                console.error("Poll error:", err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [calling, callId, callEnded, token]);

    // ── Call Me ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        const raw = phone.trim();
        if (!raw) {
            setError("Please enter your phone number.");
            return;
        }
        const digits = raw.replace(/\D/g, "");
        const validE164 = raw.startsWith("+") && digits.length >= 7 && digits.length <= 15;
        const validUS10 = !raw.startsWith("+") && digits.length === 10;
        if (!validE164 && !validUS10) {
            setError("Enter a valid number — international format (e.g. +917205672015) or 10-digit US number.");
            return;
        }

        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/portal/call-me`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ conversationToken: token, phone: raw }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Something went wrong. Please try again.");
            setCallId(data.data?.callId);
            setCalling(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!sessionData) return null;

    // ── Follow-Up Screen ──────────────────────────────────────────────────────
    if (callEnded && !feedbackSubmitted) {
        return (
            <FollowUpScreen
                businessName={businessName}
                logoUrl={sessionData?.businessData?.logoUrl}
                loading={loading}
                error={error}
                onSubmit={async (data) => {
                    setLoading(true);
                    setError(null);
                    try {
                        const res = await fetch(`${API_BASE_URL}/portal/follow-up`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                conversationToken: token,
                                callId: callId,
                                ...data
                            })
                        });
                        if (!res.ok) throw new Error("Failed to submit feedback");
                        setFeedbackSubmitted(true);
                        handleDone();
                    } catch (err) {
                        setError(err.message);
                        setLoading(false);
                    }
                }}
                onSkip={() => {
                    setFeedbackSubmitted(true);
                    handleDone();
                }}
            />
        );
    }

    // ── "We're calling you now" screen ────────────────────────────────────────
    if (calling) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col px-8 min-h-[100dvh]">
                {/* Top bar */}
                <div className="pt-5 pb-2 shrink-0 flex items-center justify-between">
                    <button
                        onClick={handleDone}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <ArrowLeft size={13} />
                        Back to Portal
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleManualDoneClick}
                            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                        >
                            <CheckCircle2 size={16} className="text-green-500" />
                            Done
                        </button>
                        <button
                            onClick={toggle}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                            title={dark ? "Light mode" : "Dark mode"}
                        >
                            {dark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center pb-12">
                    {/* Business avatar */}
                    <div className="mb-6">
                        <BusinessAvatar businessName={businessName} logoUrl={sessionData?.businessData?.logoUrl} className="w-16 h-16 text-2xl" />
                    </div>

                    <p className="text-white text-xl font-bold mb-1 text-center">Your phone will ring shortly</p>
                    <p className="text-gray-400 text-sm mb-8 text-center">
                        {receptionistName} from {businessName} is calling {phone}
                    </p>

                    {/* Trust checkmarks */}
                    <div className="w-full max-w-xs space-y-3.5 mb-10">
                        <TrustCheck delay={200}  text={`Connected to ${businessName}`} />
                        <TrustCheck delay={500}  text="AI receptionist is ready to assist you" />
                        <TrustCheck delay={900}  text="This call may be recorded for follow-up purposes" />
                    </div>

                    {/* Pulse ring animation */}
                    <div className="relative flex items-center justify-center mb-8">
                        <span className="absolute inline-flex h-14 w-14 rounded-full bg-green-400/20 animate-ping" />
                        <div className="relative w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <Phone size={22} className="text-green-400" />
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // ── Phone number form ─────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col px-8 min-h-[100dvh]">
            {/* Top bar */}
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

            {/* Form */}
            <div className="flex-1 flex flex-col items-center justify-center pb-12">
                {/* Business avatar */}
                <div className="mb-6">
                    <BusinessAvatar businessName={businessName} logoUrl={sessionData?.businessData?.logoUrl} className="w-16 h-16 text-2xl" />
                </div>

                <p className="text-white text-xl font-bold mb-1 text-center">Talk to {receptionistName}</p>
                <p className="text-gray-400 text-sm mb-8 text-center max-w-xs">
                    Enter your phone number and {businessName || "the business"} will call you right now.
                </p>

                <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
                    <div>
                        <label htmlFor="phone" className="block text-xs text-gray-400 mb-1.5">
                            Your phone number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+1 (555) 123-4567"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setError(null); }}
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs leading-snug">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !phone.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                Placing call…
                            </>
                        ) : (
                            <>
                                <Phone size={15} />
                                Call Me Now
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-600">
                        Standard call rates apply. The AI receptionist will call you within seconds.
                    </p>
                </form>
                
                <div className="absolute bottom-8">
                    <PoweredBy />
                </div>
            </div>
        </div>
    );
}
