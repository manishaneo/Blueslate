import React from 'react';
import { Sparkles, Target, Lightbulb, MessageSquare, Activity } from 'lucide-react';

export const AISummaryCard = ({ summary, reason, recommendation, confidence, priority }) => {
    // Determine color scheme based on severity (priority)
    const getColorScheme = () => {
        if (priority === 'HIGH' || priority === 'URGENT') {
            return {
                bg: "from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-900/10",
                border: "border-red-100 dark:border-red-900/30",
                iconBg: "bg-red-100 dark:bg-red-900/50",
                icon: "text-red-600 dark:text-red-400",
                text: "text-red-900 dark:text-red-100",
                titleText: "text-red-800/70 dark:text-red-300/70",
                valueText: "text-red-950 dark:text-red-50"
            };
        }
        if (priority === 'MEDIUM') {
            return {
                bg: "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-900/10",
                border: "border-amber-100 dark:border-amber-900/30",
                iconBg: "bg-amber-100 dark:bg-amber-900/50",
                icon: "text-amber-600 dark:text-amber-400",
                text: "text-amber-900 dark:text-amber-100",
                titleText: "text-amber-800/70 dark:text-amber-300/70",
                valueText: "text-amber-950 dark:text-amber-50"
            };
        }
        return {
            bg: "from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-900/10",
            border: "border-emerald-100 dark:border-emerald-900/30",
            iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
            icon: "text-emerald-600 dark:text-emerald-400",
            text: "text-emerald-900 dark:text-emerald-100",
            titleText: "text-emerald-800/70 dark:text-emerald-300/70",
            valueText: "text-emerald-950 dark:text-emerald-50"
        };
    };

    const scheme = getColorScheme();

    return (
        <div className={`bg-gradient-to-br ${scheme.bg} border ${scheme.border} rounded-2xl p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${scheme.iconBg} flex items-center justify-center`}>
                        <Sparkles size={20} className={scheme.icon} />
                    </div>
                    <h3 className={`text-lg font-bold ${scheme.text}`}>AI Analysis</h3>
                </div>
                {confidence && (
                    <span className={`text-xs font-bold ${scheme.icon} ${scheme.iconBg} px-2.5 py-1 rounded-md`}>
                        {confidence}% Confidence
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                    <div>
                        <h4 className={`text-xs font-bold ${scheme.titleText} uppercase tracking-wider mb-1.5 flex items-center gap-1.5`}>
                            <MessageSquare size={14} /> AI Summary
                        </h4>
                        <p className={`text-sm ${scheme.valueText} leading-relaxed`}>
                            {summary || <span className="italic opacity-60">Not enough data yet</span>}
                        </p>
                    </div>
                    
                    <div>
                        <h4 className={`text-xs font-bold ${scheme.titleText} uppercase tracking-wider mb-1.5 flex items-center gap-1.5`}>
                            <Target size={14} /> Reason for Escalation
                        </h4>
                        <p className={`text-sm ${scheme.valueText} leading-relaxed`}>
                            {reason || <span className="italic opacity-60">Not enough data yet</span>}
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <h4 className={`text-xs font-bold ${scheme.titleText} uppercase tracking-wider mb-1.5 flex items-center gap-1.5`}>
                            <Activity size={14} /> Customer Sentiment
                        </h4>
                        <p className={`text-sm ${scheme.valueText} leading-relaxed`}>
                            {/* Backend does not provide sentiment yet */}
                            <span className="italic opacity-60">Not enough data yet</span>
                        </p>
                    </div>

                    <div>
                        <h4 className={`text-xs font-bold ${scheme.icon} uppercase tracking-wider mb-1.5 flex items-center gap-1.5`}>
                            <Lightbulb size={14} /> Suggested Action
                        </h4>
                        <div className={`text-sm ${scheme.valueText} leading-relaxed bg-white/50 dark:bg-black/10 p-3 rounded-xl border ${scheme.border}`}>
                            {recommendation || <span className="italic opacity-60">No suggested action available</span>}
                        </div>
                    </div>
                </div>
            </div>
            
            {!summary && !reason && !recommendation && (
                <p className={`text-sm ${scheme.titleText} italic mt-4`}>
                    No AI insights available for this request.
                </p>
            )}
        </div>
    );
};
