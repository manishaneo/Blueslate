import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({ title, description, icon: Icon = Inbox }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {description}
            </p>
        </div>
    );
};
