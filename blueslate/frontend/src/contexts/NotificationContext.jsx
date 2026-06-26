import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService';
import { getCurrentUser } from '../utils/auth';
import { Bell, X } from 'lucide-react';

function NotificationToasts({ toasts, dismissToast }) {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
            {toasts.map(t => (
                <div key={t.id} className="animate-fade-in-up bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-80 relative flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                        <Bell size={18} />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.notification.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.notification.description}</p>
                    </div>
                    <button onClick={() => dismissToast(t.id)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const prevIdsRef = useRef(new Set());
    const [toasts, setToasts] = useState([]);
    const isFirstLoadRef = useRef(true);

    const showToast = useCallback((notification) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, notification }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const fetchNotifications = useCallback(async () => {
        const user = getCurrentUser();
        // Only fetch if user is logged in
        if (!user) return;
        
        try {
            const data = await notificationService.getNotifications();
            
            if (!isFirstLoadRef.current) {
                const newNotifs = data.filter(n => !prevIdsRef.current.has(n.id) && !n.isRead);
                newNotifs.forEach(n => showToast(n));
            } else {
                isFirstLoadRef.current = false;
            }
            
            prevIdsRef.current = new Set(data.map(n => n.id));

            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchNotifications();

        // Setup polling every 30 seconds
        const intervalId = setInterval(fetchNotifications, 30000);

        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            await notificationService.markNotificationAsRead(id);
        } catch (error) {
            console.error("Failed to mark notification as read", error);
            // Revert on failure
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);

            await notificationService.markAllNotificationsAsRead();
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
            fetchNotifications();
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            <NotificationToasts toasts={toasts} dismissToast={dismissToast} />
            {children}
        </NotificationContext.Provider>
    );
};
