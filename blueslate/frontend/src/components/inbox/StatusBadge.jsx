import React from 'react';

export const StatusBadge = ({ status, className = "" }) => {
    const config = {
        NEW: { color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50", label: "New" },
        OPEN: { color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50", label: "Open" },
        ASSIGNED: { color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50", label: "Assigned" },
        IN_PROGRESS: { color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50", label: "In Progress" },
        RESOLVED: { color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50", label: "Resolved" },
        CLOSED: { color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50", label: "Closed" }
    };

    const current = config[status] || config.NEW;

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${current.color} ${className}`}>
            {current.label}
        </span>
    );
};
