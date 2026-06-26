import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Users,
    MessageSquare,
    CalendarDays,
    TrendingUp,
    AlertTriangle,
    BarChart3,
    Clock,
    CheckCircle,
    Star,
    Briefcase,
    Lightbulb,
    PhoneCall,
    FileText,
    Zap,
    Bot
} from "lucide-react";
import { getAnalyticsDashboard } from "../services/analyticsService";
import { generateInsights, generateRecommendations, calculateBusinessHealth } from "../utils/analyticsInsights";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const COLORS = {
    blue: '#3b82f6',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
    gray: '#6b7280'
};

const PIE_COLORS = [COLORS.amber, COLORS.red, COLORS.purple, COLORS.blue];

function MetricCard({ title, value, icon: Icon, color, trend }) {
    const colorClasses = {
        blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
        green: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
        amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
        red: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
        purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{trend}</span>
                </div>
            )}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <BarChart3 className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState("30"); // days

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const now = new Date();
            let startDate = null;
            let endDate = null;

            if (dateRange !== 'all') {
                startDate = new Date();
                startDate.setDate(now.getDate() - parseInt(dateRange));
                startDate = startDate.toISOString();
                endDate = now.toISOString();
            }

            const res = await getAnalyticsDashboard({ startDate, endDate });
            setData(res);
            setError(null);
        } catch (err) {
            console.error("Error fetching analytics:", err);
            setError("Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const healthScore = useMemo(() => calculateBusinessHealth(data), [data]);
    const insights = useMemo(() => generateInsights(data), [data]);
    const recommendations = useMemo(() => generateRecommendations(data), [data]);

    const healthColor = healthScore > 80 ? 'text-green-600' : healthScore > 50 ? 'text-amber-600' : 'text-red-600';
    const requestPieData = useMemo(() => {
        if (!data) return [];
        return [
            { name: 'Complaints', value: data.complaints },
            { name: 'Escalations', value: data.escalations },
            { name: 'Callbacks', value: data.callbackRequests },
            { name: 'General', value: data.generalSupport },
        ].filter(d => d.value > 0);
    }, [data]);

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    <p>{error}</p>
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-white rounded-lg shadow-sm font-medium hover:bg-gray-50 transition">Retry</button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 dark:bg-gray-900 min-h-screen">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Intelligence</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">AI-powered insights and analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="1">Today</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* AI Business Summary (Hero Card) */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-6 h-6 text-yellow-300" />
                        <h2 className="text-xl font-bold">AI Business Summary</h2>
                    </div>
                    <ul className="space-y-3 md:space-y-2 text-lg text-blue-50">
                        <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-300" /> {data.newLeads} new leads captured</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-300" /> AI resolved {data.aiResolvedConvs} conversations automatically</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-300" /> {data.complaints} complaints require your attention</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-300" /> {data.callbackRequests} customers requested callbacks</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-300" /> Customer satisfaction is {data.averageRating}★</li>
                    </ul>
                </div>
            </div>

            {/* Business Health & KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Business Health Score</h3>
                    <div className="flex items-end gap-4">
                        <span className={`text-6xl font-bold ${healthColor}`}>{healthScore}</span>
                        <span className="text-gray-400 text-2xl mb-1">/100</span>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4 text-sm">
                        <div className="flex flex-col">
                            <span className="text-gray-500">AI Resolution</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{data.aiResolutionRate}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-500">Avg Rating</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{data.averageRating}★</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-500">Pending Requests</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{data.pendingRequests}</span>
                        </div>
                    </div>
                </div>

                <MetricCard title="Total Leads" value={data.totalLeadsPeriod} icon={Users} color="blue" trend={`All time: ${data.totalLeadsAllTime}`} />
                <MetricCard title="Conversion Rate" value={`${data.conversionRate}%`} icon={TrendingUp} color="green" trend={`${data.convertedLeads} converted`} />
                <MetricCard title="Active Requests" value={data.pendingRequests} icon={Briefcase} color="amber" trend={`${data.resolvedRequests} resolved`} />
                <MetricCard title="AI Resolution Rate" value={`${data.aiResolutionRate}%`} icon={Bot} color="purple" trend={`${data.aiResolvedConvs} handled`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Insights & Recommendations */}
                <div className="col-span-1 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            Business Insights
                        </h3>
                        {insights.length > 0 ? (
                            <ul className="space-y-4">
                                {insights.map((insight, i) => (
                                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState message="More insights will appear as customer interactions increase." />
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-500" />
                            AI Recommendations
                        </h3>
                        {recommendations.length > 0 ? (
                            <ul className="space-y-3">
                                {recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${rec.priority === 'High' ? 'bg-red-500' : rec.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec.text}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState message="No current recommendations. You're doing great!" />
                        )}
                    </div>
                </div>

                {/* Charts Area */}
                <div className="col-span-1 lg:col-span-2 space-y-8">
                    {/* Sales Performance Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Sales Performance (Leads)</h3>
                        <div className="h-72 w-full">
                            {data.trends.leads.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.trends.leads}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="count" stroke={COLORS.blue} strokeWidth={3} dot={{r: 4, fill: COLORS.blue, strokeWidth: 0}} activeDot={{r: 6}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="No leads data available for this period." />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Customer Support Types Pie */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Support Requests</h3>
                            <div className="h-56 w-full">
                                {requestPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={requestPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {requestPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState message="No support requests in this period." />
                                )}
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {requestPieData.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                        {entry.name} ({entry.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Peak Activity Bar Chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Peak Activity (Hours)</h3>
                            <div className="h-64 w-full">
                                {data.trends.peakHours.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.trends.peakHours}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState message="Not enough activity to determine peak hours." />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Journey Funnel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Customer Journey</h3>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {[
                        { label: 'Conversations', value: data.totalConversations, color: 'bg-gray-100 text-gray-800' },
                        { label: 'Leads Captured', value: data.totalLeadsPeriod, color: 'bg-blue-100 text-blue-800' },
                        { label: 'Follow-ups', value: data.contactedLeads, color: 'bg-amber-100 text-amber-800' },
                        { label: 'Meetings', value: data.meetingsScheduled, color: 'bg-purple-100 text-purple-800' },
                        { label: 'Converted', value: data.convertedLeads, color: 'bg-green-100 text-green-800' }
                    ].map((step, idx, arr) => (
                        <div key={idx} className="flex flex-col items-center flex-1 w-full relative">
                            <div className={`w-full py-4 px-2 rounded-xl text-center shadow-sm ${step.color}`}>
                                <h4 className="text-2xl font-bold">{step.value}</h4>
                                <p className="text-xs font-medium uppercase tracking-wider mt-1 opacity-80">{step.label}</p>
                            </div>
                            {idx < arr.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-gray-300 dark:border-gray-600 z-0"></div>
                            )}
                            {idx > 0 && step.value > 0 && arr[idx-1].value > 0 && (
                                <p className="text-xs text-gray-500 mt-2 font-medium">
                                    {Math.round((step.value / arr[idx-1].value) * 100)}% Conv
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Activity Timeline</h3>
                <div className="space-y-6">
                    {data.activityTimeline.length > 0 ? (
                        data.activityTimeline.map((item, idx) => {
                            let Icon = FileText;
                            let color = "text-gray-500 bg-gray-100 dark:bg-gray-800";
                            
                            if (item.type === 'LEAD') { Icon = Users; color = "text-blue-600 bg-blue-100 dark:bg-blue-900/30"; }
                            else if (item.type === 'REQUEST') { 
                                Icon = AlertTriangle; 
                                color = item.requestType === 'COMPLAINT' || item.requestType === 'ESCALATION' ? "text-red-600 bg-red-100 dark:bg-red-900/30" : "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
                            }
                            else if (item.type === 'MEETING') { Icon = CalendarDays; color = "text-purple-600 bg-purple-100 dark:bg-purple-900/30"; }
                            else if (item.type === 'RATING') { Icon = Star; color = "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30"; }

                            return (
                                <div key={idx} className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 pb-6 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <EmptyState message="No recent activity to display." />
                    )}
                </div>
            </div>
        </div>
    );
}
