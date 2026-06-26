import React from 'react';
import { Tag, AlertTriangle, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const QuickInsightsSidebar = ({ request }) => {
    // Only display metrics backed by real data from the backend.
    // If a metric isn't available, we don't fabricate it.

    const getCategoryLabel = (type) => {
        const mapping = {
            COMPLAINT: 'Customer Complaint',
            CALLBACK_REQUEST: 'Callback Request',
            NEW_LEAD: 'New Lead',
            ESCALATION: 'AI Escalation'
        };
        return mapping[type] || type || 'General Request';
    };

    const isHighPriority = request.priority === 'HIGH' || request.priority === 'URGENT';

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Quick Insights</h3>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Tag size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {getCategoryLabel(request.requestType)}
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHighPriority ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    <AlertTriangle size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Priority</p>
                    <p className={`text-sm font-semibold ${isHighPriority ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {request.priority || 'Unknown'}
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Clock size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Time Open</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {request.createdAt ? formatDistanceToNow(new Date(request.createdAt)) : 'Unknown'}
                    </p>
                </div>
            </div>

            {/* Metrics we don't have real data for yet */}
            <div className="flex items-start gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl opacity-75">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                    <Activity size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Conversation Count</p>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 italic">
                        Not enough data yet
                    </p>
                </div>
            </div>
        </div>
    );
};
