import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Building2, ChevronRight, LogOut } from "lucide-react";
import { getCurrentUser, getActiveBusiness, setAuth, logout } from "../utils/auth";
import { refreshBusinesses } from "../services/authService";

export default function DisabledBusinessPage() {
    const navigate   = useNavigate();
    const activeId   = getCurrentUser()?.activeBusinessId ?? null;

    // Reactive businesses — refreshed from the backend on mount and window focus.
    // When a re-enabled business is detected, this triggers auto-redirect to /dashboard.
    const [businesses, setBusinesses] = useState(
        () => getCurrentUser()?.businesses ?? []
    );

    const activeBusiness  = businesses.find((b) => b.id === activeId) ?? null;
    const otherActive     = businesses.filter((b) => b.id !== activeId && b.status === "active");
    const hasAlternatives = otherActive.length > 0;

    const [showSwitcher, setShowSwitcher] = useState(false);

    // On mount and whenever the window regains focus, check whether the active
    // business has been re-enabled. If so, redirect to the dashboard automatically.
    useEffect(() => {
        const check = async () => {
            try {
                const fresh = await refreshBusinesses();
                const nowActive = fresh.find((b) => b.id === activeId);
                if (nowActive && nowActive.status !== "disabled") {
                    navigate("/dashboard", { replace: true });
                    return;
                }
                setBusinesses(fresh);
            } catch {
                // Network error or unauthenticated — stay on this page silently
            }
        };
        check();
        window.addEventListener("focus", check);
        return () => window.removeEventListener("focus", check);
    }, [navigate, activeId]);

    const handleSwitch = (business) => {
        const user = getCurrentUser();
        setAuth({ ...user, activeBusinessId: business.id, businessName: business.name });
        navigate("/dashboard", { replace: true });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Icon + heading */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 mb-5">
                        <Ban size={30} className="text-red-600 dark:text-red-400" />
                    </div>

                    {activeBusiness?.name && (
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2">
                            {activeBusiness.name}
                        </p>
                    )}

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Business Account Disabled
                    </h1>

                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {hasAlternatives
                            ? "This business has been temporarily disabled by an administrator. You can switch to another business below."
                            : "This business has been temporarily disabled by an administrator. Please contact support if you believe this is an error."}
                    </p>
                </div>

                {/* Inline business list — toggled by the primary button */}
                {hasAlternatives && showSwitcher && (
                    <div className="mb-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                        <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                                Switch to
                            </p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {otherActive.map((business) => (
                                <button
                                    key={business.id}
                                    onClick={() => handleSwitch(business)}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {business.name[0].toUpperCase()}
                                    </div>
                                    <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {business.name}
                                    </span>
                                    <ChevronRight size={14} className="shrink-0 text-gray-400 dark:text-gray-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {hasAlternatives && (
                        <button
                            onClick={() => setShowSwitcher((v) => !v)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
                        >
                            <Building2 size={15} />
                            {showSwitcher ? "Hide Other Businesses" : "Switch to Another Business"}
                        </button>
                    )}

                    <button
                        onClick={logout}
                        className={`flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-5 py-2.5 transition-colors ${
                            hasAlternatives
                                ? "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                        }`}
                    >
                        <LogOut size={15} />
                        Sign Out
                    </button>
                </div>

            </div>
        </div>
    );
}
