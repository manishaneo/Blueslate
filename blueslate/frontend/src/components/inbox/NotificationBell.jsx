import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { isToday, isYesterday } from 'date-fns';

export const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification) => {
        setIsOpen(false);
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        if (notification.requestId) {
            navigate(`/inbox/${notification.requestId}`);
        } else {
            navigate('/inbox');
        }
    };

    // Grouping
    const groupedNotifications = useMemo(() => {
        const groups = { critical: [], today: [], yesterday: [], earlier: [] };
        notifications.forEach(n => {
            const date = new Date(n.createdAt);
            if (n.priority === 'CRITICAL') groups.critical.push(n);
            else if (isToday(date)) groups.today.push(n);
            else if (isYesterday(date)) groups.yesterday.push(n);
            else groups.earlier.push(n);
        });
        return groups;
    }, [notifications]);

    const renderGroup = (title, items) => {
        if (items.length === 0) return null;
        return (
            <div key={title}>
                <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-800/80 sticky top-0 backdrop-blur-sm z-10 border-y border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map(n => <NotificationItem key={n.id} notification={n} onClick={handleNotificationClick} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 flex flex-col max-h-[85vh]">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                            >
                                <Check size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                        {loading ? (
                            <div className="p-4"><LoadingSkeleton type="notification" count={5} /></div>
                        ) : notifications.length === 0 ? (
                            <EmptyState title="No new notifications" description="We'll notify you when new customer requests or escalations arrive." icon={Bell} />
                        ) : (
                            <>
                                {renderGroup("Critical & Urgent", groupedNotifications.critical)}
                                {renderGroup("Today", groupedNotifications.today)}
                                {renderGroup("Yesterday", groupedNotifications.yesterday)}
                                {renderGroup("Earlier", groupedNotifications.earlier)}
                            </>
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-800/30">
                        <button 
                            onClick={() => { setIsOpen(false); navigate('/inbox'); }}
                            className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            View Inbox <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
