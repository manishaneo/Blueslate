import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    PhoneCall,
    BarChart3,
    BookOpen,
    Settings,
    FlaskConical,
    Moon,
    Sun,
    Menu,
    X,
    LogOut,
    Building2,
    ChevronDown,
    Check,
    Plus,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { getCurrentUser, logout, setAuth } from "../utils/auth";

const NAV_ITEMS = [
    { label: "Dashboard",      path: "/dashboard",     Icon: LayoutDashboard },
    { label: "Leads",          path: "/leads",          Icon: Users },
    { label: "Conversations",  path: "/conversations",  Icon: MessageSquare },
    { label: "Call History",   path: "/call-history",   Icon: PhoneCall },
    { label: "Analytics",      path: "/analytics",      Icon: BarChart3},
    { label: "Knowledge Base", path: "/knowledge-base", Icon: BookOpen},
    { label: "Settings",       path: "/settings",       Icon: Settings},
    { label: "Test Your AI",   path: "/test-ai",        Icon: FlaskConical },
];

function SidebarNav({ onClose }) {
    return (
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ label, path, Icon, soon }) => {
                if (soon) {
                    return (
                        <div
                            key={label}
                            className="flex items-center justify-between px-3 py-2 rounded-xl select-none cursor-not-allowed"
                        >
                            <span className="flex items-center gap-3 text-sm font-medium text-gray-300 dark:text-gray-600">
                                <Icon size={16} className="shrink-0 opacity-40" />
                                {label}
                            </span>
                            <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 px-1.5 py-0.5 rounded-full leading-4">
                                Soon
                            </span>
                        </div>
                    );
                }
                return (
                    <NavLink
                        key={label}
                        to={path}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <span className="absolute left-0 inset-y-2 w-0.5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                                )}
                                <Icon
                                    size={16}
                                    className={`shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}
                                />
                                {label}
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}

// ── Business Switcher ─────────────────────────────────────────────────────────

function BusinessSwitcher({ businesses, activeBusinessId, onSelect }) {
    const [open, setOpen] = useState(false);
    const ref             = useRef(null);

    const activeBusiness = businesses.find((b) => b.id === activeBusinessId);
    const displayName    = activeBusiness?.name ?? "My Business";
    const hasMultiple    = businesses.length > 1;

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!ref.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleSelect = (business) => {
        setOpen(false);
        if (business.id !== activeBusinessId) onSelect(business);
    };

    // Single business — static card, no dropdown chrome
    if (!hasMultiple) {
        return (
            <div className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                            {displayName}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 px-1.5 py-0.5 rounded-full leading-3">
                            Business Admin
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Multiple businesses — interactive dropdown
    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                            {displayName}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 px-1.5 py-0.5 rounded-full leading-3">
                            Business Admin
                        </span>
                    </div>
                    <ChevronDown
                        size={13}
                        className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute bottom-full left-0 right-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
                >
                    <div className="px-2 pt-2 pb-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-2 pb-1.5">
                            Switch Business
                        </p>
                        <div className="space-y-0.5">
                            {businesses.map((business) => {
                                const isActive = business.id === activeBusinessId;
                                return (
                                    <button
                                        key={business.id}
                                        role="option"
                                        aria-selected={isActive}
                                        onClick={() => handleSelect(business)}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                            isActive
                                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                        }`}>
                                            {business.name[0].toUpperCase()}
                                        </div>
                                        <span className="truncate font-medium flex-1">{business.name}</span>
                                        {isActive && (
                                            <Check size={12} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sidebar footer ────────────────────────────────────────────────────────────

function SidebarFooter({ user, businesses, activeBusinessId, onSwitch, onLogout, onClose = () => {} }) {
    return (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0 space-y-1">
            <BusinessSwitcher
                businesses={businesses}
                activeBusinessId={activeBusinessId}
                onSelect={onSwitch}
            />
            <NavLink
                to="/add-business"
                onClick={onClose}
                className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                        isActive
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                    }`
                }
            >
                <Plus size={14} className="shrink-0" />
                Add Business
            </NavLink>
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
                <LogOut size={14} className="shrink-0" />
                Logout
            </button>
        </div>
    );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AdminLayout() {
    const { dark, toggle } = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const user       = getCurrentUser();
    const businesses = user?.businesses ?? [];

    // React state so header breadcrumb and Outlet key stay reactive on switch
    const [activeBusinessId, setActiveBusinessId] = useState(user?.activeBusinessId ?? null);

    const activeBusiness = businesses.find((b) => b.id === activeBusinessId);
    const businessName   = activeBusiness?.name ?? user?.businessName ?? "";

    const closeDrawer = () => setDrawerOpen(false);

    const handleSwitch = (business) => {
        // Persist to localStorage first so api.js interceptor picks it up immediately
        const current = getCurrentUser();
        setAuth({
            ...current,
            activeBusinessId: business.id,
            businessName:     business.name,
        });
        // Update React state: triggers breadcrumb update + Outlet remount via key
        setActiveBusinessId(business.id);
    };

    const footerProps = {
        user,
        businesses,
        activeBusinessId,
        onSwitch: handleSwitch,
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

            {/* ── Desktop sidebar ───────────────────────────────────────────── */}
            <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                {/* Brand */}
                <div className="h-14 flex items-center px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                            <LayoutDashboard size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                            Blueslate
                        </span>
                    </div>
                </div>

                <SidebarNav onClose={() => {}} />
                <SidebarFooter {...footerProps} onLogout={logout} />
            </aside>

            {/* ── Mobile drawer ──────────────────────────────────────────────── */}
            {drawerOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={closeDrawer}
                    />
                    <aside className="relative z-10 w-64 flex flex-col bg-white dark:bg-gray-900 shadow-2xl">
                        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                    <LayoutDashboard size={14} className="text-white" />
                                </div>
                                <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                                    Blueslate
                                </span>
                            </div>
                            <button
                                onClick={closeDrawer}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <SidebarNav onClose={closeDrawer} />
                        <SidebarFooter
                            {...footerProps}
                            onLogout={() => { closeDrawer(); logout(); }}
                            onClose={closeDrawer}
                        />
                    </aside>
                </div>
            )}

            {/* ── Main area ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <header className="h-14 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 sm:px-5 gap-3 z-10">

                    {/* Hamburger — mobile */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu size={18} />
                    </button>

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mr-auto">
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                            <LayoutDashboard size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Blueslate</span>
                    </div>

                    {/* Business name breadcrumb — desktop, reactive to switch */}
                    {businessName ? (
                        <div className="hidden lg:flex flex-1 items-center gap-1.5 min-w-0">
                            <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">Business</span>
                            <span className="text-gray-300 dark:text-gray-700 text-xs shrink-0">/</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                                {businessName}
                            </span>
                        </div>
                    ) : (
                        <div className="hidden lg:flex flex-1" />
                    )}

                    {/* Right actions */}
                    <div className="ml-auto flex items-center gap-1.5">
                        <button
                            onClick={toggle}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={dark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {dark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

                        {/* User avatar */}
                        <div className="relative group">
                            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform hover:scale-105">
                                <span className="text-xs font-bold text-white select-none">
                                    {(user?.name ?? "U")[0].toUpperCase()}
                                </span>
                            </button>
                            {user?.email && (
                                <div className="absolute right-0 top-10 z-20 hidden group-hover:block pointer-events-none">
                                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                        {user.email}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content — key forces remount when active business changes */}
                <main key={activeBusinessId} className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
