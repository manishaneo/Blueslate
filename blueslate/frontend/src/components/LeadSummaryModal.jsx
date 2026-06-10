import { useEffect, useRef } from "react";
import { CheckCircle2, MessageSquare, PhoneCall, X } from "lucide-react";

export default function LeadSummaryModal({
    open,
    businessName = "",
    source = "CHAT",   // "VOICE" | "CHAT"
    agentName = "Virtual Receptionist",
    onClose,
}) {
    const panelRef   = useRef(null);
    const SourceIcon = source === "VOICE" ? PhoneCall : MessageSquare;

    // Escape closes
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    // Focus close button on open
    useEffect(() => {
        if (!open) return;
        panelRef.current?.querySelector("button")?.focus();
    }, [open]);

    // Focus trap
    useEffect(() => {
        if (!open) return;
        const onTab = (e) => {
            if (e.key !== "Tab") return;
            const nodes = panelRef.current?.querySelectorAll(
                'button, [href], input, [tabindex]:not([tabindex="-1"])'
            );
            if (!nodes?.length) return;
            const first = nodes[0];
            const last  = nodes[nodes.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener("keydown", onTab);
        return () => document.removeEventListener("keydown", onTab);
    }, [open]);

    if (!open) return null;

    const heading  = businessName ? `Thank you for contacting ${businessName}.` : "Thank you for reaching out.";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Conversation ended"
                className="relative w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mx-0 sm:mx-4"
            >
                {/* drag handle — mobile only */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* close */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <X size={15} />
                </button>

                <div className="px-6 pt-4 pb-7 sm:pt-6 flex flex-col items-center text-center gap-4">

                    {/* icon */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shadow-inner">
                            <CheckCircle2 size={30} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border-2 border-blue-100 dark:border-blue-900">
                            <SourceIcon size={11} className="text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>

                    {/* text */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Thank you!
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                            {heading}
                        </p>
                    </div>

                    {/* confirmation chip */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-1.5">
                        <SourceIcon size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Conversation ended · {agentName}
                        </span>
                    </div>

                    {/* close button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow shadow-blue-200 dark:shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 mt-1"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
