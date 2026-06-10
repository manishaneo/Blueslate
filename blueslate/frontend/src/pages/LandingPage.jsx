import { useState } from "react";
import { Link } from "react-router-dom";
import {
    PhoneCall, Clock, Users, Zap, Globe, ArrowRight,
    CheckCircle2, BarChart3,
    Menu, X, Moon, Sun, Star, LayoutDashboard,
    PhoneForwarded, TrendingUp, Play,
    Phone, PhoneOff, MicOff, Mic,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

// ── voice waveform bar heights for audio visualization ────────────────────────
const WAVE_HEIGHTS = [8, 18, 13, 24, 16, 28, 11, 20, 15, 19, 9];

// ── phone call mockup ─────────────────────────────────────────────────────────
// Intentionally always dark — represents an active phone-call screen overlay
function CallMockup() {
    return (
        <div className="relative select-none">
            <div className="absolute inset-0 -m-4 bg-blue-500/10 rounded-[3rem] blur-3xl pointer-events-none" />
            <div className="relative rounded-2xl border border-white/10 bg-[#111827] shadow-2xl overflow-hidden max-w-[340px] mx-auto">

                {/* ── status bar ── */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#0d1420] border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                            <Phone size={12} className="text-white" />
                        </div>
                        <span className="text-[13px] font-semibold text-white">Inbound Call</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">Live</span>
                    </div>
                </div>

                {/* ── call centre ── */}
                <div className="px-5 py-6 text-center">
                    {/* Avatar with pulse rings */}
                    <div className="relative inline-flex items-center justify-center mb-4">
                        <div
                            className="absolute w-24 h-24 rounded-full bg-blue-500/20 animate-ping"
                            style={{ animationDuration: "2.5s" }}
                        />
                        <div className="absolute w-20 h-20 rounded-full bg-blue-500/10 animate-pulse" />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
                            <span className="text-xl font-black text-white">A</span>
                        </div>
                    </div>

                    <p className="text-white font-bold text-[15px] leading-none">Auri</p>
                    <p className="text-gray-500 text-xs mt-1">AI Receptionist · ABC Academy</p>

                    {/* Call timer */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="font-mono text-sm text-green-400 font-semibold tracking-wider">02:14</span>
                    </div>

                    {/* Voice waveform — staggered animate-pulse gives audio-meter effect */}
                    <div className="flex items-center justify-center gap-[3px] h-8 mt-3">
                        {WAVE_HEIGHTS.map((h, i) => (
                            <div
                                key={i}
                                className="w-[3px] rounded-full bg-blue-500 animate-pulse"
                                style={{
                                    height: `${h}px`,
                                    animationDelay: `${i * 90}ms`,
                                    animationDuration: `${700 + (i % 4) * 150}ms`,
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mt-2">
                        Auri is speaking
                    </p>
                </div>

                {/* ── caller inquiry ── */}
                <div className="mx-4 mb-3 rounded-xl bg-[#1a2535] border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Mic size={11} className="text-orange-400" />
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Caller</span>
                    </div>
                    <p className="text-[13px] text-gray-200 leading-relaxed">
                        "What are your membership plans and pricing?"
                    </p>
                </div>

                {/* ── lead captured ── */}
                <div className="mx-4 mb-4 bg-green-900/30 border border-green-500/25 rounded-xl px-3.5 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                        <p className="text-[11px] text-green-400 font-bold uppercase tracking-widest">Lead captured</p>
                    </div>
                    <div className="space-y-1 pl-[21px]">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] text-green-600 font-semibold w-12 shrink-0">Name</span>
                            <span className="text-[12px] text-green-300 font-medium">###########</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] text-green-600 font-semibold w-12 shrink-0">Phone</span>
                            <span className="text-[12px] text-green-300 font-medium">+91 XXXXX XXXXX</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] text-green-600 font-semibold w-12 shrink-0">Interest</span>
                            <span className="text-[12px] text-green-300 font-medium">Membership Pricing</span>
                        </div>
                    </div>
                </div>

                {/* ── call controls ── */}
                <div className="flex items-center justify-center gap-4 px-4 pb-5 pt-3 border-t border-white/5">
                    <button
                        disabled
                        aria-label="Mute"
                        className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center"
                    >
                        <MicOff size={15} className="text-gray-500" />
                    </button>
                    <button
                        disabled
                        aria-label="End call"
                        className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-md shadow-red-600/40"
                    >
                        <PhoneOff size={18} className="text-white" />
                    </button>
                    <button
                        disabled
                        aria-label="Transfer call"
                        className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center"
                    >
                        <PhoneForwarded size={15} className="text-gray-500" />
                    </button>
                </div>

            </div>
        </div>
    );
}

// ── navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
    const { dark, toggle } = useTheme();
    const [open, setOpen] = useState(false);

    const links = [
        { label: "Features",     href: "#features" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Demo",         href: "#demo" },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#060c17]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-auto md:mr-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/40">
                        <LayoutDashboard size={14} className="text-white" />
                    </div>
                    <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">Blueslate</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                    {links.map(({ label, href }) => (
                        <a key={label} href={href} className="px-3.5 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                            {label}
                        </a>
                    ))}
                </nav>

                {/* Right */}
                <div className="hidden md:flex items-center gap-2 ml-auto md:ml-0">
                    <button
                        onClick={toggle}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        title={dark ? "Light mode" : "Dark mode"}
                    >
                        {dark ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <Link
                        to="/login"
                        className="text-sm font-medium px-3.5 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        Login
                    </Link>
                    <Link
                        to="/join"
                        className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm shadow-blue-600/30"
                    >
                        Get started
                        <ArrowRight size={14} />
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setOpen(!open)}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden bg-white dark:bg-[#060c17] border-t border-gray-100 dark:border-white/5 px-4 py-4 space-y-1">
                    {links.map(({ label, href }) => (
                        <a
                            key={label}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        >
                            {label}
                        </a>
                    ))}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 mt-2 space-y-2">
                        <Link
                            to="/login"
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all w-full"
                        >
                            Login
                        </Link>
                        <Link
                            to="/join"
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors w-full"
                        >
                            Get started free <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}

// ── hero ──────────────────────────────────────────────────────────────────────

function Hero() {
    return (
        <section className="relative bg-white dark:bg-[#060c17] overflow-hidden">
            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute top-1/2 -right-48 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-32 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left: Copy */}
                <div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6">
                        <Zap size={11} />
                        AI-Powered Business Receptionist
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-[1.08] tracking-tight">
                        Never miss a<br />
                        <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                            customer call
                        </span><br />
                        again.
                    </h1>

                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
                        Blueslate's AI receptionist answers every call, captures every lead, and escalates when it matters — 24/7, without lifting a finger.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/demo"
                            className="flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-600/25"
                        >
                            Try Blueslate Free
                            <ArrowRight size={15} />
                        </Link>
                        <a
                            href="#demo"
                            className="flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        >
                            <Play size={13} className="fill-current" />
                            See it in action
                        </a>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-green-500" />
                            No credit card required
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-green-500" />
                            Live in under 60 seconds
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-green-500" />
                            No coding needed
                        </span>
                    </div>
                </div>

                {/* Right: Call mockup */}
                <div className="lg:pl-6">
                    <CallMockup />
                </div>
            </div>
        </section>
    );
}



// ── problem ───────────────────────────────────────────────────────────────────

function Problem() {
    const PAINS = [
        {
            Icon:  PhoneCall,
            color: "text-red-400",
            bg:    "bg-red-500/10",
            title: "Missed calls cost you customers",
            body:  "67% of callers never call back after reaching voicemail. Every unanswered call is a lost opportunity.",
        },
        {
            Icon:  Clock,
            color: "text-orange-400",
            bg:    "bg-orange-500/10",
            title: "Your business sleeps. Customers don't.",
            body:  "Nearly half of all calls happen outside your business hours. Silence is losing you sales every night.",
        },
        {
            Icon:  Users,
            color: "text-yellow-400",
            bg:    "bg-yellow-500/10",
            title: "Staff answering the same questions",
            body:  "Hours wasted on \"What are your hours?\" and \"How much does it cost?\" — questions an AI can answer instantly.",
        },
    ];

    return (
        <section className="bg-white dark:bg-gray-950 py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-3">The problem</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                        Traditional receptionists can't scale.<br className="hidden sm:block" /> Your business can't afford to miss calls.
                    </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                    {PAINS.map(({ Icon, color, bg, title, body }) => (
                        <div key={title} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                                <Icon size={20} className={color} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── how it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
    const STEPS = [
        {
            n:     "01",
            Icon:  Globe,
            title: "Share your website",
            body:  "Paste your business URL. Auri reads your site and learns your services, pricing, hours, and FAQs in seconds.",
        },
        {
            n:     "02",
            Icon:  Zap,
            title: "Go live instantly",
            body:  "Your AI receptionist is trained and ready. No scripts, no flows, no developers — just working out of the box.",
        },
        {
            n:     "03",
            Icon:  TrendingUp,
            title: "Leads flow in automatically",
            body:  "Every call answered, every lead logged, every escalation handled — while you focus on running your business.",
        },
    ];

    return (
        <section id="how-it-works" className="bg-gray-50 dark:bg-gray-900 py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">How it works</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                        From URL to live receptionist<br className="hidden sm:block" /> in under 60 seconds.
                    </h2>
                </div>

                <div className="relative grid sm:grid-cols-3 gap-8">
                    {/* Connector line — desktop only */}
                    <div className="hidden sm:block absolute top-10 left-[calc(16.6667%+1.5rem)] right-[calc(16.6667%+1.5rem)] h-px bg-gradient-to-r from-gray-200 via-blue-300 to-gray-200 dark:from-gray-700 dark:via-blue-600 dark:to-gray-700" />

                    {STEPS.map(({ n, Icon, title, body }) => (
                        <div key={n} className="relative flex flex-col items-center text-center">
                            {/* Number + icon circle */}
                            <div className="relative mb-5">
                                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/60 shadow-sm flex items-center justify-center">
                                    <Icon size={28} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow">
                                    <span className="text-[10px] font-black text-white">{n}</span>
                                </div>
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── features ──────────────────────────────────────────────────────────────────

function Features() {
    const FEATURES = [
        { Icon: Clock,          color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/30",    title: "Always available",      body: "24/7 coverage. No sick days, no lunch breaks, no after-hours silence." },
        { Icon: Users,          color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30",  title: "Automatic lead capture", body: "Name, email, phone captured from every interested caller. Automatically." },
        { Icon: PhoneForwarded, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30",  title: "Smart escalation",      body: "Urgent issues routed to a real human immediately. Nothing critical falls through." },
        { Icon: Globe,          color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30", title: "Trained on your business", body: "Reads your website and answers questions with accurate, up-to-date information." },
        { Icon: BarChart3,      color: "text-rose-600 dark:text-rose-400",   bg: "bg-rose-50 dark:bg-rose-900/30",   title: "Full call analytics",   body: "Every call logged with transcript, lead data, intent, and outcome — in one dashboard." },
        { Icon: Zap,            color: "text-cyan-600 dark:text-cyan-400",   bg: "bg-cyan-50 dark:bg-cyan-900/30",   title: "Zero setup time",       body: "Paste a URL. Go live. No scripting, no integrations, no engineering required." },
    ];

    return (
        <section id="features" className="bg-white dark:bg-gray-950 py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Features</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                        Everything your front desk does,<br className="hidden sm:block" /> at a fraction of the cost.
                    </h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map(({ Icon, color, bg, title, body }) => (
                        <div
                            key={title}
                            className="group bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                                <Icon size={20} className={color} />
                            </div>
                            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── demo section ──────────────────────────────────────────────────────────────

function Demo() {
    return (
        <section id="demo" className="relative bg-gray-50 dark:bg-[#060c17] overflow-hidden py-20 sm:py-28">
            {/* Gradient orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/6 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Left: CTA */}
                <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Try it yourself</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-5">
                        Your AI receptionist,<br /> ready in 60 seconds.
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-md">
                        Enter your business website. Blueslate reads it, trains your AI receptionist, and has it live instantly — no setup, no code, no waiting.
                    </p>

                    {/* Steps */}
                    <div className="space-y-4 mb-10">
                        {[
                            { n: "1", label: "Enter your website URL" },
                            { n: "2", label: "AI reads and learns your business" },
                            { n: "3", label: "Your receptionist goes live" },
                        ].map(({ n, label }) => (
                            <div key={n} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow shadow-blue-600/30">
                                    <span className="text-xs font-black text-white">{n}</span>
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                            </div>
                        ))}
                    </div>

                    <Link
                        to="/demo"
                        className="inline-flex items-center gap-2 text-base font-bold px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/25"
                    >
                        Try Blueslate free
                        <ArrowRight size={16} />
                    </Link>

                    <p className="text-xs text-gray-500 dark:text-gray-600 mt-3">No account needed. No credit card.</p>
                </div>

                {/* Right: Call mockup */}
                <div>
                    <CallMockup />
                </div>
            </div>
        </section>
    );
}



// ── final cta ─────────────────────────────────────────────────────────────────

function FinalCTA() {
    return (
        <section className="relative bg-gray-50 dark:bg-[#060c17] overflow-hidden py-24 sm:py-32">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 right-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6">
                    <PhoneCall size={11} />
                    Your AI receptionist is waiting
                </div>

                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-6">
                    Ready to stop<br />
                    <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                        missing calls?
                    </span>
                </h2>

                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-10">
                    Join businesses using Blueslate to answer every call, capture every lead, and deliver exceptional service around the clock.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/demo"
                        className="inline-flex items-center justify-center gap-2 text-base font-bold px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/25"
                    >
                        Try Blueslate Free
                        <ArrowRight size={16} />
                    </Link>
                    <a
                        href="#demo"
                        className="inline-flex items-center justify-center gap-2 text-base font-semibold px-7 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        <Play size={14} className="fill-current" />
                        Watch demo
                    </a>
                </div>

                <p className="mt-5 text-xs text-gray-500 dark:text-gray-600 flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500" /> No credit card</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500" /> Free to start</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500" /> Live in 60s</span>
                </p>
            </div>
        </section>
    );
}

// ── footer ────────────────────────────────────────────────────────────────────

function Footer() {
    return (
        <footer className="bg-gray-100 dark:bg-[#040810] border-t border-gray-200 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                        <LayoutDashboard size={12} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Blueslate</span>
                    <span className="text-gray-400 dark:text-gray-700 text-sm">·</span>
                    <span className="text-xs text-gray-500 dark:text-gray-600">AI Receptionist Platform</span>
                </div>

                {/* Links */}
                <nav className="flex items-center gap-5">
                    {[
                        { label: "Features",     href: "#features" },
                        { label: "How it works", href: "#how-it-works" },
                        { label: "Demo",         href: "#demo" },
                    ].map(({ label, href }) => (
                        <a key={label} href={href} className="text-xs text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors">
                            {label}
                        </a>
                    ))}
                    <Link to="/dashboard" className="text-xs text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 transition-colors">
                        Dashboard
                    </Link>
                </nav>

                <p className="text-xs text-gray-500 dark:text-gray-700">
                    © 2026 Blueslate. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 antialiased">
            <Navbar />
            <Hero />
            
            <Problem />
            <HowItWorks />
            <Features />
            <Demo />
            
            <FinalCTA />
            <Footer />
        </div>
    );
}
