import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Users,
    MessageSquare,
    CalendarDays,
    TrendingUp,
    Globe,
    Bot,
    Phone,
    AlertTriangle,
} from "lucide-react";
import { getAnalytics } from "../services/analyticsService";

// ── date helpers ──────────────────────────────────────────────────────────────

const fmtLong = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Parse "YYYY-MM-DD" without UTC offset drift.
const fmtShort = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
    NEW:       "bg-blue-50  text-blue-700  dark:bg-blue-900/30  dark:text-blue-300",
    CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    CONVERTED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function StatusBadge({ status }) {
    const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status ?? "—"}
        </span>
    );
}

// ── kpi config ────────────────────────────────────────────────────────────────

const KPI_CONFIG = [
    {
        key:        "totalLeads",
        label:      "Total Leads",
        Icon:       Users,
        iconBg:     "bg-blue-100 dark:bg-blue-900/30",
        iconCls:    "text-blue-600 dark:text-blue-400",
        valueColor: "text-blue-600 dark:text-blue-400",
    },
    {
        key:        "totalConversations",
        label:      "Total Conversations",
        Icon:       MessageSquare,
        iconBg:     "bg-violet-100 dark:bg-violet-900/30",
        iconCls:    "text-violet-600 dark:text-violet-400",
        valueColor: "text-violet-600 dark:text-violet-400",
    },
    {
        key:        "leadsThisWeek",
        label:      "Leads This Week",
        Icon:       CalendarDays,
        iconBg:     "bg-emerald-100 dark:bg-emerald-900/30",
        iconCls:    "text-emerald-600 dark:text-emerald-400",
        valueColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
        key:        "conversationsThisWeek",
        label:      "Conversations This Week",
        Icon:       TrendingUp,
        iconBg:     "bg-amber-100 dark:bg-amber-900/30",
        iconCls:    "text-amber-600 dark:text-amber-400",
        valueColor: "text-amber-600 dark:text-amber-400",
    },
    {
        key:        "escalatedConversations",
        label:      "Escalated Conversations",
        Icon:       AlertTriangle,
        iconBg:     "bg-red-100 dark:bg-red-900/30",
        iconCls:    "text-red-600 dark:text-red-400",
        valueColor: "text-red-600 dark:text-red-400",
    },
];

// ── donut chart ───────────────────────────────────────────────────────────────
// Segments drawn with the stroke-dasharray technique.
// Each <circle> paints one arc; the <g> is rotated -90° so arcs start at 12 o'clock.

function DonutChart({ segments }) {
    const total = segments.reduce((s, d) => s + d.value, 0);
    const r     = 44;
    const cx    = 56;
    const cy    = 56;
    const circ  = 2 * Math.PI * r;

    let cumPct = 0;
    const slices = segments.map((seg) => {
        const pct  = total > 0 ? seg.value / total : 0;
        const dash = pct * circ;
        const off  = -cumPct * circ;   // negative = start further clockwise
        cumPct += pct;
        return { ...seg, dash, off };
    });

    return (
        <div className="flex items-center gap-5">
            {/* SVG ring */}
            <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 112 112" className="w-full h-full" aria-hidden="true">
                    <g transform={`rotate(-90 ${cx} ${cy})`}>
                        {total === 0 ? (
                            <circle cx={cx} cy={cy} r={r}
                                fill="none" strokeWidth="18" stroke="#e5e7eb"
                            />
                        ) : (
                            slices.map((s, i) => (
                                <circle key={i} cx={cx} cy={cy} r={r}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth="18"
                                    strokeDasharray={`${s.dash} ${circ}`}
                                    strokeDashoffset={s.off}
                                />
                            ))
                        )}
                    </g>
                </svg>
                {/* Centre label — HTML so dark mode works normally */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                        {total}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">total</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                {segments.map((s, i) => {
                    const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : 0;
                    return (
                        <div key={i} className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {s.label}
                            </span>
                            <span className="ml-auto pl-2 text-xs font-bold text-gray-800 dark:text-gray-200 shrink-0">
                                {s.value}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right shrink-0">
                                {pct}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── shared empty-chart placeholder ───────────────────────────────────────────

function EmptyChartPlaceholder() {
    return (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">No data yet</span>
        </div>
    );
}

// ── trend line chart ──────────────────────────────────────────────────────────
// Pure SVG polyline + area gradient. No library required.
// preserveAspectRatio="none" lets the chart fill its container width.
// vectorEffect="non-scaling-stroke" keeps strokeWidth at 1.5px regardless of scaling.

function TrendChart({ data, color, gradientId }) {
    if (!data?.length || data.length < 2) {
        return <EmptyChartPlaceholder />;
    }
    const W   = 400;
    const H   = 80;
    const PAD = 2;
    const max = Math.max(...data.map((d) => d.count), 1);

    const pts = data.map((d, i) => ({
        x: PAD + (i / (data.length - 1)) * (W - 2 * PAD),
        y: PAD + (1 - d.count / max) * (H - 2 * PAD),
    }));

    const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const areaD = [
        `M ${pts[0].x} ${H}`,
        ...pts.map((p) => `L ${p.x} ${p.y}`),
        `L ${pts[pts.length - 1].x} ${H}`,
        "Z",
    ].join(" ");

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${gradientId})`} />
            <polyline
                points={polyPts}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

// ── lead trend chart (professional, full-width) ──────────────────────────────

// Returns the smallest multiple of `ticks` that is ≥ maxVal and has clean tick labels.
function niceMax(maxVal, ticks = 4) {
    if (!maxVal || maxVal <= 0) return ticks;
    const raw  = maxVal / ticks;
    const pow  = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
    const step = [1, 2, 5, 10].find((f) => f * pow >= raw) ?? 10;
    return step * pow * ticks;
}

// Catmull-Rom spline → cubic bezier path string for a smooth, library-free trend line.
// Control-point Y values are clamped to [minY, maxY] to prevent overshooting.
function smoothPath(pts, minY, maxY) {
    if (pts.length < 2) return "";
    const clamp = (v) => Math.min(Math.max(v, minY), maxY);
    const d = [`M ${pts[0].x},${pts[0].y}`];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = clamp(p1.y + (p2.y - p0.y) / 6);
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = clamp(p2.y - (p3.y - p1.y) / 6);
        d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
    }
    return d.join(" ");
}

function LeadTrendChart({ data }) {
    if (!data?.length || data.length < 2) {
        return (
            <div className="flex items-center justify-center h-full">
                <EmptyChartPlaceholder />
            </div>
        );
    }

    const W = 600, H = 180;
    const ML = 36, MR = 12, MT = 14, MB = 28;
    const cW = W - ML - MR;
    const cH = H - MT - MB;

    const maxRaw = Math.max(...data.map((d) => d.count));
    const yMax   = niceMax(maxRaw, 4);
    const TICKS  = 4;

    const toX = (i) => ML + (i / (data.length - 1)) * cW;
    const toY = (v) => MT + (1 - v / yMax) * cH;

    const pts      = data.map((d, i) => ({ x: toX(i), y: toY(d.count) }));
    const linePath = smoothPath(pts, MT, MT + cH);
    const areaPath = `${linePath} L ${pts[pts.length - 1].x},${MT + cH} L ${pts[0].x},${MT + cH} Z`;

    const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => (yMax / TICKS) * i);
    // X labels every ~5 days; deduplicate in case last index coincides with 25
    const xIdxs = [0, 5, 10, 15, 20, 25, data.length - 1].filter(
        (v, i, a) => v < data.length && a.indexOf(v) === i,
    );
    // Peak marker — highest-count day
    const peakIdx = maxRaw > 0
        ? data.reduce((mi, d, i) => (d.count > data[mi].count ? i : mi), 0)
        : -1;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            aria-label="Lead trend over last 30 days"
        >
            <defs>
                <linearGradient id="leadTrendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {/* Horizontal grid lines + Y-axis labels */}
            {yTicks.map((v, i) => (
                <g key={i}>
                    <line
                        x1={ML} y1={toY(v)} x2={W - MR} y2={toY(v)}
                        className="stroke-gray-100 dark:stroke-gray-800"
                        strokeWidth="1"
                    />
                    <text
                        x={ML - 6} y={toY(v)}
                        textAnchor="end" dominantBaseline="middle"
                        fontSize="9"
                        className="fill-gray-400 dark:fill-gray-500"
                    >
                        {v}
                    </text>
                </g>
            ))}

            {/* Gradient area under the line */}
            <path d={areaPath} fill="url(#leadTrendAreaGrad)" />

            {/* Smooth trend line */}
            <path
                d={linePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Peak day dot */}
            {peakIdx >= 0 && (
                <circle
                    cx={pts[peakIdx].x}
                    cy={pts[peakIdx].y}
                    r="3.5"
                    fill="#2563eb"
                    className="stroke-white dark:stroke-gray-900"
                    strokeWidth="1.5"
                />
            )}

            {/* X-axis day labels */}
            {xIdxs.map((i) => (
                <text
                    key={i}
                    x={pts[i].x}
                    y={H - MB + 14}
                    textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                    fontSize="9"
                    className="fill-gray-400 dark:fill-gray-500"
                >
                    {fmtShort(data[i].date)}
                </text>
            ))}
        </svg>
    );
}

// ── horizontal bar chart ──────────────────────────────────────────────────────

const STATUS_BARS = [
    { key: "NEW",       label: "New",       barCls: "bg-blue-500",  textCls: "text-blue-600 dark:text-blue-400" },
    { key: "CONTACTED", label: "Contacted", barCls: "bg-amber-500", textCls: "text-amber-600 dark:text-amber-400" },
    { key: "CONVERTED", label: "Converted", barCls: "bg-green-500", textCls: "text-green-600 dark:text-green-400" },
];

function StatusBars({ data }) {
    const safeData = data ?? {};
    const max = Math.max(...STATUS_BARS.map((b) => safeData[b.key] ?? 0), 1);
    return (
        <div className="flex flex-col gap-4">
            {STATUS_BARS.map(({ key, label, barCls, textCls }) => {
                const value = safeData[key] ?? 0;
                const pct   = ((value / max) * 100).toFixed(0);
                return (
                    <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-semibold ${textCls}`}>{label}</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{value}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${barCls} rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── lead status funnel ────────────────────────────────────────────────────────
// CONVERTED is displayed as "Qualified" — it is the final successful stage in
// this pipeline (no API change; just a UI label).

const FUNNEL_STAGES = [
    {
        key:    "NEW",
        label:  "New",
        color:  "#2563eb",
        bgCls:  "bg-blue-50 dark:bg-blue-900/20",
        bdrCls: "border-blue-200 dark:border-blue-800",
        numCls: "text-blue-700 dark:text-blue-300",
        barCls: "bg-blue-500",
    },
    {
        key:    "CONTACTED",
        label:  "Contacted",
        color:  "#d97706",
        bgCls:  "bg-amber-50 dark:bg-amber-900/20",
        bdrCls: "border-amber-200 dark:border-amber-800",
        numCls: "text-amber-700 dark:text-amber-300",
        barCls: "bg-amber-500",
    },
    {
        key:    "CONVERTED",
        label:  "Qualified",
        color:  "#059669",
        bgCls:  "bg-emerald-50 dark:bg-emerald-900/20",
        bdrCls: "border-emerald-200 dark:border-emerald-800",
        numCls: "text-emerald-700 dark:text-emerald-300",
        barCls: "bg-emerald-500",
    },
];

function LeadStatusFunnel({ statusData }) {
    const safeData = statusData ?? {};
    const stages   = FUNNEL_STAGES.map((s) => ({ ...s, count: safeData[s.key] ?? 0 }));
    const total    = stages.reduce((sum, s) => sum + s.count, 0);

    // Conversion rate from stage[i] → stage[i+1]; null when denominator is 0.
    const convRates = stages.slice(0, -1).map((s, i) =>
        s.count > 0 ? (stages[i + 1].count / s.count) * 100 : null,
    );

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <TrendingUp size={20} className="text-gray-400 dark:text-gray-600" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No leads yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Pipeline data will appear as leads are captured.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {stages.map((stage, i) => {
                const pct    = total > 0 ? (stage.count / total) * 100 : 0;
                const isLast = i === stages.length - 1;
                return (
                    <div key={stage.key}>
                        {/* Stage row */}
                        <div className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border ${stage.bgCls} ${stage.bdrCls}`}>
                            {/* Colour accent bar */}
                            <div
                                className="w-1 h-10 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">
                                        {stage.label}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-sm font-bold tabular-nums ${stage.numCls}`}>
                                            {stage.count}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-9 text-right">
                                            {pct.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                {/* Proportional bar */}
                                <div className="h-1.5 bg-white/70 dark:bg-gray-900/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${stage.barCls} rounded-full transition-all duration-700`}
                                        style={{ width: `${pct.toFixed(1)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Conversion connector */}
                        {!isLast && (
                            <div className="flex items-center gap-1.5 pl-[22px] py-1.5">
                                <div className="flex flex-col items-center gap-px shrink-0">
                                    <div className="w-px h-2 bg-gray-200 dark:bg-gray-700" />
                                    {/* Down-arrow chevron */}
                                    <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true">
                                        <path d="M4 5L0 0h8L4 5z" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                    {convRates[i] !== null
                                        ? `${convRates[i].toFixed(0)}% conversion`
                                        : "— conversion (no upstream leads)"}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Summary footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">Total leads</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{total}</span>
            </div>
        </div>
    );
}

// ── source config (donut colours mirror the existing source cards) ─────────────

const DONUT_SOURCES = [
    { key: "customer_portal", label: "Customer Portal", color: "#7c3aed" }, // violet-700
    { key: "business_chat",   label: "Business Chat",   color: "#2563eb" }, // blue-600
    { key: "receptionist",    label: "Receptionist",    color: "#059669" }, // emerald-600
];

// ── professional conversation sources donut ──────────────────────────────────

function ConversationSourcesDonut({ sources }) {
    const segments = DONUT_SOURCES.map((s) => ({
        ...s,
        count: sources?.[s.key] ?? 0,
    }));
    const total = segments.reduce((sum, s) => sum + s.count, 0);

    const r    = 54;
    const cx   = 72;
    const cy   = 72;
    const circ = 2 * Math.PI * r;

    let cum = 0;
    const slices = segments.map((seg) => {
        const pct  = total > 0 ? seg.count / total : 0;
        const dash = pct * circ;
        const off  = -cum * circ;
        cum += pct;
        return { ...seg, pct, dash, off };
    });

    return (
        <div className="flex flex-col items-center gap-5">
            {/* Ring */}
            <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 144 144" className="w-full h-full" aria-hidden="true">
                    {/* background track */}
                    <circle
                        cx={cx} cy={cy} r={r}
                        fill="none" strokeWidth="20"
                        className="stroke-gray-100 dark:stroke-gray-800"
                    />
                    {total > 0 && (
                        <g transform={`rotate(-90 ${cx} ${cy})`}>
                            {slices.map((s, i) => (
                                <circle
                                    key={i}
                                    cx={cx} cy={cy} r={r}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth="20"
                                    strokeDasharray={`${s.dash} ${circ}`}
                                    strokeDashoffset={s.off}
                                />
                            ))}
                        </g>
                    )}
                </svg>
                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                        {total}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {total === 0 ? "no data" : "total"}
                    </span>
                </div>
            </div>

            {/* Legend — colour swatch + label + count + mini bar + percentage */}
            <div className="w-full flex flex-col gap-3">
                {slices.map((s, i) => (
                    <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                                {s.label}
                            </span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                {s.count}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right tabular-nums">
                                {total > 0 ? `${(s.pct * 100).toFixed(0)}%` : "–"}
                            </span>
                        </div>
                        {/* proportional bar */}
                        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width:           `${(s.pct * 100).toFixed(0)}%`,
                                    backgroundColor: s.color,
                                    opacity:         s.count === 0 ? 0.25 : 1,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty-state hint */}
            {total === 0 && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 -mt-1">
                    No conversations recorded yet.
                </p>
            )}
        </div>
    );
}

// ── SectionCard wrapper ───────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, className = "" }) {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 ${className}`}>
            <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
                )}
            </div>
            {children}
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await getAnalytics());
        } catch (err) {
            setError(err?.response?.data?.message ?? "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Derived values computed once data is available.
    const leads30Total = data?.leadsByDay?.reduce((s, d) => s + d.count, 0) ?? 0;
    const convs30Total = data?.conversationsByDay?.reduce((s, d) => s + d.count, 0) ?? 0;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Page header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Activity summary for your AI receptionist
                </p>
            </div>

            {/* ── Loading skeleton ───────────────────────────────────────────── */}
            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 animate-pulse">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3" />
                                <div className="h-7 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2" />
                                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-44 animate-pulse" />
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-44 animate-pulse" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-48 animate-pulse" />
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-48 animate-pulse" />
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-64 animate-pulse" />
                </div>
            )}

            {/* ── Error ─────────────────────────────────────────────────────── */}
            {error && !loading && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Failed to load analytics</p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* ── Content ───────────────────────────────────────────────────── */}
            {!loading && !error && data && (
                <>
                    {/* 1 ─ KPI cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {KPI_CONFIG.map(({ key, label, Icon, iconBg, iconCls, valueColor }) => (
                            <div
                                key={key}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                                    <Icon size={18} className={iconCls} />
                                </div>
                                <div>
                                    <p className={`text-2xl sm:text-3xl font-bold leading-none ${valueColor}`}>
                                        {data[key] ?? 0}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5 leading-snug">
                                        {label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 2 ─ Lead trend — full-width professional chart */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Lead Trend — Last 30 Days
                                </h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    Daily lead captures
                                </p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                                    {leads30Total}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                    total in period
                                </p>
                            </div>
                        </div>
                        <div className="h-44">
                            <LeadTrendChart data={data.leadsByDay ?? []} />
                        </div>
                    </div>

                    {/* 3 ─ Trend sparklines */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Leads trend */}
                        <SectionCard
                            title="Leads Trend"
                            subtitle="Last 30 days"
                        >
                            <div className="flex items-baseline justify-between mb-3">
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {leads30Total}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    leads captured
                                </span>
                            </div>
                            <div className="h-20">
                                <TrendChart
                                    data={data.leadsByDay ?? []}
                                    color="#2563eb"
                                    gradientId="grad-leads"
                                />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.leadsByDay?.[0] ? fmtShort(data.leadsByDay[0].date) : "–"}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.leadsByDay?.length > 0 ? fmtShort(data.leadsByDay[data.leadsByDay.length - 1].date) : "–"}
                                </span>
                            </div>
                        </SectionCard>

                        {/* Conversations trend */}
                        <SectionCard
                            title="Conversations Trend"
                            subtitle="Last 30 days"
                        >
                            <div className="flex items-baseline justify-between mb-3">
                                <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                                    {convs30Total}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    conversations
                                </span>
                            </div>
                            <div className="h-20">
                                <TrendChart
                                    data={data.conversationsByDay ?? []}
                                    color="#7c3aed"
                                    gradientId="grad-convs"
                                />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.conversationsByDay?.[0] ? fmtShort(data.conversationsByDay[0].date) : "–"}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.conversationsByDay?.length > 0 ? fmtShort(data.conversationsByDay[data.conversationsByDay.length - 1].date) : "–"}
                                </span>
                            </div>
                        </SectionCard>
                    </div>

                    {/* 4 ─ Conversation Sources donut + Status bars */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Professional conversation sources donut */}
                        <SectionCard
                            title="Conversation Sources"
                            subtitle="How visitors reach your AI receptionist"
                            className="flex flex-col justify-between"
                        >
                            <ConversationSourcesDonut sources={data?.conversationSources ?? {}} />
                        </SectionCard>

                        {/* Lead status funnel */}
                        <SectionCard
                            title="Lead Status Funnel"
                            subtitle="Pipeline conversion from capture to qualified"
                        >
                            <LeadStatusFunnel statusData={data.leadsByStatus ?? {}} />
                        </SectionCard>
                    </div>

                    {/* 5 ─ Recent leads table */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Leads</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    Last {data.recentLeads?.length ?? 0} captured contacts
                                </p>
                            </div>
                            <Link
                                to="/leads"
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                View all
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                                </svg>
                            </Link>
                        </div>

                        {(data.recentLeads?.length ?? 0) === 0 ? (
                            <div className="px-8 py-16 flex flex-col items-center text-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Users size={22} className="text-gray-400 dark:text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No leads yet</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Leads captured by your AI receptionist will appear here.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[580px]">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Name</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Email</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Phone</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Interest</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {data.recentLeads.map((lead) => (
                                                <tr key={lead.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        {lead.name ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                        {lead.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[100px]">
                                                                    {lead.name}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                                                        {lead.email ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                        {lead.phone ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                                                        {lead.interest ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <StatusBadge status={lead.status} />
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                                                        {fmtLong(lead.createdAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <Link to="/leads" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                        View all {data.totalLeads} leads →
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
