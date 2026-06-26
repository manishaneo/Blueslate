import React from 'react';

export const LoadingSkeleton = ({ count = 3, type = 'card' }) => {
    return (
        <div className="space-y-4 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse flex p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                    {type === 'card' && (
                        <div className="flex gap-4 w-full items-center">
                            <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-10 w-10 shrink-0"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                            </div>
                            <div className="shrink-0 space-y-2 py-1 w-24">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 ml-auto"></div>
                            </div>
                        </div>
                    )}
                    {type === 'notification' && (
                        <div className="flex gap-3 w-full">
                            <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-8 w-8 shrink-0"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
