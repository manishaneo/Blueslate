import { useState } from "react";
import {
    ArrowLeft, LayoutDashboard, Moon, Sun, Phone, ExternalLink,
    BarChart2, CheckCircle2, Clock, User, PhoneCall, MessageSquare,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import AgentStatusBadge from "../components/AgentStatusBadge";

// ── Mock data (replace with real API calls when Twilio is connected) ──────────
const MOCK_CALLS = [
    { caller: "Rahul Sharma",  phone: "+91 98765 43210", duration: "3m 42s", time: "Today, 2:15 PM"      },
    { caller: "Priya Nair",    phone: "+91 87654 32109", duration: "2m 18s", time: "Today, 11:40 AM"     },
    { caller: "Arjun Mehta",   phone: "+91 76543 21098", duration: "5m 07s", time: "Yesterday, 4:30 PM"  },
    { caller: "Sneha Kapoor",  phone: "+91 65432 10987", duration: "1m 55s", time: "Yesterday, 10:05 AM" },
];

const MOCK_LEADS = [
    { name: "Rahul Sharma",  phone: "+91 98765 43210", interest: "Season Membership", status: "Hot"  },
    { name: "Priya Nair",    phone: "+91 87654 32109", interest: "Trial Class",        status: "Warm" },
    { name: "Arjun Mehta",   phone: "+91 76543 21098", interest: "Birthday Party",     status: "Hot"  },
    { name: "Sneha Kapoor",  phone: "+91 65432 10987", interest: "General Inquiry",    status: "Cold" },
];

const MOCK_TRANSCRIPT = [
    { role: "ai",   text: "Hi, thank you for calling XP League Frisco. This is Auri, your AI receptionist. How may I help you today?" },
    { role: "user", text: "Hi, I'm interested in signing up my kids for soccer. What programs do you have?" },
    { role: "ai",   text: "That's great! We offer recreational leagues for ages 4–16, competitive travel teams, and skill-development academies. Are your kids beginners or have they played before?" },
    { role: "user", text: "They're beginners, ages 7 and 9." },
    { role: "ai",   text: "Perfect! Our Rookie League is ideal for that age group — it focuses on fundamentals in a fun environment. Sessions run on Saturday mornings. Would you like me to capture your contact details so our coach can reach out with enrollment dates?" },
    { role: "user", text: "Yes please, that would be great." },
    { role: "ai",   text: "Wonderful! Could I get your name and best phone number?" },
];

const LEAD_STATUS_STYLES = {
    Hot:  "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    Warm: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
    Cold: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
};

export default function DemoPage() {
    const { dark, toggle } = useTheme();
    const [view, setView]  = useState("home"); // "home" | "dashboard"

    // Replace with Twilio call-started / call-ended webhook events when ready
    const [agentStatus, setAgentStatus] = useState("available"); // "available" | "busy"

    return (
        <div className="min-h-screen bg-white dark:bg-[#060c17] flex flex-col antialiased">

            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
                <div className="absolute bottom-0 -left-32 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-5 shrink-0">
                <div className="flex items-center gap-4">
                    <a href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/40">
                            <LayoutDashboard size={14} className="text-white" />
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                            Blueslate
                        </span>
                    </a>

                    {view === "dashboard" && (
                        <>
                            <span className="text-gray-300 dark:text-white/15 select-none leading-none" aria-hidden="true">/</span>
                            <button
                                onClick={() => setView("home")}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                <ArrowLeft size={12} />
                                Back to Showcase
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={toggle}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
                    title={dark ? "Light mode" : "Dark mode"}
                >
                    {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>

            {/* ── Home view ─────────────────────────────────────────────────────── */}
            {view === "home" && (
                <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-lg">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-5">
                                <Phone size={11} />
                                Live AI Receptionist Demo
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
                                XP League Frisco
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                AI Receptionist Demo
                            </p>
                        </div>

                        <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl shadow-gray-200/60 dark:shadow-black/40 p-6 sm:p-8 space-y-6">

                            {/* Status cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        Knowledge Base
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-green-500" />
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ready</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        AI Status
                                    </p>
                                    <AgentStatusBadge status={agentStatus} />
                                </div>
                            </div>

                            {/* Phone number */}
                            <div className="text-center py-6 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/2">
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                    Demo Line
                                </p>
                                <div className="flex items-center justify-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow shadow-blue-600/30">
                                        <Phone size={14} className="text-white" />
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
                                        +91 XXXXXXXXXX
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                                    Call this number from your phone to speak with the AI receptionist.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setView("dashboard")}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    <BarChart2 size={15} />
                                    View XP League Dashboard
                                </button>
                                <a
                                    href="https://xpleague.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <ExternalLink size={14} />
                                    Visit XP League Website
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Dashboard view ────────────────────────────────────────────────── */}
            {view === "dashboard" && (
                <div className="relative z-10 flex-1 px-4 pb-16 max-w-5xl mx-auto w-full">

                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            XP League Dashboard
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Live activity from your AI receptionist
                        </p>
                    </div>

                    <div className="space-y-10">

                        {/* ── Call History ─────────────────────────────────────── */}
                        <section>
                            <SectionHeader icon={PhoneCall} title="Call History" count={MOCK_CALLS.length} unit="calls" />
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-x-auto">
                                <table className="w-full text-sm min-w-[540px]">
                                    <TableHead cols={["Caller", "Phone Number", "Duration", "Time"]} />
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {MOCK_CALLS.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{row.caller}</td>
                                                <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{row.phone}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                        <Clock size={12} />
                                                        {row.duration}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{row.time}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* ── Leads Captured ───────────────────────────────────── */}
                        <section>
                            <SectionHeader icon={User} title="Leads Captured" count={MOCK_LEADS.length} unit="leads" />
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-x-auto">
                                <table className="w-full text-sm min-w-[540px]">
                                    <TableHead cols={["Name", "Phone", "Interest", "Status"]} />
                                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                        {MOCK_LEADS.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{row.name}</td>
                                                <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{row.phone}</td>
                                                <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{row.interest}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${LEAD_STATUS_STYLES[row.status]}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* ── Conversation Transcript ───────────────────────────── */}
                        <section>
                            <SectionHeader icon={MessageSquare} title="Conversation Transcript" subtitle="Sample · Rahul Sharma · Today, 2:15 PM" />
                            <div className="bg-white dark:bg-[#0d1420] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-5 space-y-3">
                                {MOCK_TRANSCRIPT.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                                            msg.role === "ai"
                                                ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                                                : "bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-tr-sm"
                                        }`}>
                                            {msg.role === "ai" && (
                                                <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mb-1 uppercase tracking-wider">
                                                    Auri · AI
                                                </p>
                                            )}
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>
                </div>
            )}
        </div>
    );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, unit, subtitle }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-gray-500">({count} {unit})</span>
            )}
            {subtitle && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>
            )}
        </div>
    );
}

function TableHead({ cols }) {
    return (
        <thead>
            <tr className="border-b border-gray-100 dark:border-white/8">
                {cols.map((h) => (
                    <th
                        key={h}
                        className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                    >
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
    );
}
