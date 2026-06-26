import React from 'react';
import { format } from 'date-fns';
import { User, Activity, Edit3, ArrowRight, CheckCircle2, MessageSquare, Plus, PhoneCall } from 'lucide-react';

export const Timeline = ({ activities = [] }) => {
    
    const getIconForType = (type, description = '') => {
        const descLower = description.toLowerCase();
        if (descLower.includes('voice')) return <PhoneCall size={14} className="text-purple-500" />;
        if (descLower.includes('escalated')) return <Activity size={14} className="text-red-500" />;
        if (descLower.includes('complaint')) return <Activity size={14} className="text-orange-500" />;

        switch(type) {
            case 'CREATED': return <Plus size={14} className="text-blue-500" />;
            case 'ASSIGNED': return <User size={14} className="text-indigo-500" />;
            case 'STATUS_CHANGED': return <ArrowRight size={14} className="text-orange-500" />;
            case 'NOTE_ADDED': return <Edit3 size={14} className="text-emerald-500" />;
            case 'RESOLVED': return <CheckCircle2 size={14} className="text-green-500" />;
            default: return <Activity size={14} className="text-gray-500" />;
        }
    };

    if (activities.length === 0) {
        return <div className="text-sm text-gray-500 p-4">No activity yet.</div>;
    }

    const reversedActivities = [...activities].reverse();

    return (
        <div className="relative border-l border-gray-200 dark:border-gray-800 ml-3 py-2 space-y-6">
            {reversedActivities.map((activity, index) => (
                <div key={activity.id || index} className="relative pl-6">
                    <div className="absolute -left-3.5 top-0.5 w-7 h-7 bg-white dark:bg-gray-950 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                        {getIconForType(activity.type, activity.description)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activity.description}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                            </span>
                            {activity.actor && (
                                <>
                                    <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{activity.actor.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
