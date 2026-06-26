import React from 'react';
import { History, FileText } from 'lucide-react';

export const CustomerHistory = () => {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <History size={16} className="text-gray-400" /> Customer History
            </h3>

            {/* As per requirements, if there is no full history fetched by the backend, display a premium empty state */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                    <FileText size={18} className="text-gray-500 dark:text-gray-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    No previous interactions
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] leading-relaxed">
                    Customer history will appear here after future interactions.
                </p>
            </div>
        </div>
    );
};
