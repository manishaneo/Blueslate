import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { PriorityBadge } from './PriorityBadge';
import { RequestTypeBadge } from './RequestTypeBadge';

export const NotificationItem = ({ notification, onClick }) => {
    const { title, description, notificationType, priority, isRead, createdAt } = notification;

    return (
        <button 
            onClick={() => onClick(notification)}
            className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 ${!isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
        >
            <div className="shrink-0 pt-0.5 relative">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <RequestTypeBadge type={notificationType} iconOnly={true} className="text-gray-500" />
                </div>
                {!isRead && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-semibold truncate pr-2 ${!isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {title}
                    </h4>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                    </span>
                </div>
                <p className={`text-sm mb-2 line-clamp-2 ${!isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {description}
                </p>
                <div className="flex items-center gap-2">
                    <PriorityBadge priority={priority} />
                </div>
            </div>
        </button>
    );
};
