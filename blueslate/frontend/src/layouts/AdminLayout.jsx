import { useState } from "react";
import { Outlet, NavLink, Navigate, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    PhoneCall,
    BarChart3,
    BookOpen,
    Settings,
    Moon,
    Sun,
    Menu,
    X,
    LogOut,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const loadContext = () => {
    try {
        const id = localStorage.getItem("businessContextId");
        const list = JSON.parse(localStorage.getItem("businessContexts") || "[]");
        return list.find((c) => String(c.id) === String(id)) ?? null;
    } catch {
        return null;
    }
};

const NAV_ITEMS = [
    { label: "Dashboard",      path: "/dashboard",      Icon: LayoutDashboard },
    { label: "Leads",          path: "/leads",           Icon: Users },
    { label: "Call History",   path: "/call-history",    Icon: PhoneCall,    soon: true },
    { label: "Analytics",      path: "/analytics",       Icon: BarChart3,    soon: true },
    { label: "Knowledge Base", path: "/knowledge-base",  Icon: BookOpen,     soon: true },
    { label: "Settings",       path: "/settings",        Icon: Settings,     soon: true },
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

function SidebarFooter({ onChangeSetup }) {
    return (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
                onClick={onChangeSetup}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <LogOut size={14} className="shrink-0" />
                Change Business
            </button>
        </div>
    );
}

export default function AdminLayout() {
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const businessContextId = localStorage.getItem("businessContextId");
    if (!businessContextId) {
        return <Navigate to="/" replace />;
    }

    const ctx = loadContext();
    const businessName = ctx?.title || ctx?.url || "";

    const closeDrawer = () => setDrawerOpen(false);

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
                <SidebarFooter onChangeSetup={() => navigate("/")} />
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
                        <SidebarFooter onChangeSetup={() => { closeDrawer(); navigate("/"); }} />
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

                    {/* Business name breadcrumb — desktop */}
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

                        <div className="relative group">
                            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform hover:scale-105 hover:shadow-md">
                                <span className="text-xs font-bold text-white select-none">A</span>
                            </button>
                            <div className="absolute right-0 top-10 z-20 hidden group-hover:block pointer-events-none">
                                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                    Alex · AI Admin
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
