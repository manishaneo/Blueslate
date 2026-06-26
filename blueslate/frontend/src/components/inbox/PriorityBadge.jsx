import React from 'react';
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

export const PriorityBadge = ({ priority, className = "" }) => {
    const config = {
        LOW: { icon: ArrowDown, color: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800", label: "Low" },
        MEDIUM: { icon: ArrowRight, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30", label: "Medium" },
        HIGH: { icon: ArrowUp, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30", label: "High" },
        CRITICAL: { icon: AlertCircle, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30", label: "Critical" }
    };

    const current = config[priority] || config.MEDIUM;
    const Icon = current.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${current.color} ${className}`}>
            <Icon size={10} strokeWidth={3} />
            {current.label}
        </span>
    );
};
