import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    Shield,
    Menu,
    X,
    Sun,
    Moon,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
    { label: "Dashboard",  path: "/app-admin",             Icon: LayoutDashboard, end: true  },
    { label: "Businesses", path: "/app-admin/businesses",  Icon: Building2,       end: false },
];

function SidebarNav({ onClose }) {
    return (
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ label, path, Icon, end }) => (
                <NavLink
                    key={label}
                    to={path}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                            isActive
                                ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100"
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <span className="absolute left-0 inset-y-2 w-0.5 bg-violet-600 dark:bg-violet-500 rounded-r-full" />
                            )}
                            <Icon
                                size={16}
                                className={`shrink-0 ${isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500"}`}
                            />
                            {label}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default function AppAdminLayout() {
    const { dark, toggle } = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const closeDrawer = () => setDrawerOpen(false);

    const brandLogo = (
        <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                    <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                </svg>
            </div>
            <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                Blueslate
            </span>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

            {/* ── Desktop sidebar ───────────────────────────────────────────── */}
            <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                {/* Brand + role badge */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    {brandLogo}
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-md px-2 py-1">
                        <Shield size={10} />
                        App Admin
                    </div>
                </div>

                <SidebarNav onClose={() => {}} />

                {/* Admin identity footer */}
                <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">A</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">App Admin</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">admin@blueslate.com</p>
                        </div>
                    </div>
                </div>
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
                            {brandLogo}
                            <button
                                onClick={closeDrawer}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-md px-2 py-1">
                                <Shield size={10} />
                                App Admin
                            </div>
                        </div>
                        <SidebarNav onClose={closeDrawer} />
                        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-white">A</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">App Admin</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">admin@blueslate.com</p>
                                </div>
                            </div>
                        </div>
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
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white">
                                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.81 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.13 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.124-2.81-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                            </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Blueslate</span>
                    </div>

                    {/* Desktop breadcrumb */}
                    <div className="hidden lg:flex flex-1 items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-600">Admin</span>
                        <span className="text-gray-300 dark:text-gray-700 text-xs">/</span>
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                            <Shield size={11} />
                            App Admin
                        </div>
                    </div>

                    {/* Right: theme toggle + avatar */}
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
                            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform hover:scale-105">
                                <span className="text-xs font-bold text-white select-none">A</span>
                            </button>
                            <div className="absolute right-0 top-10 z-20 hidden group-hover:block pointer-events-none">
                                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                    App Admin
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
