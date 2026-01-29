import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
    createdAt: string;
}

export function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/notifications?userId=${user.id}&roleId=${user.roleId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (ids: string[]) => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        await handleMarkRead([notification.id]);
        if (notification.relatedId) {
            // Simple navigation logic
            if (notification.title.includes('Onay') || notification.title.includes('Atama')) {
                 // For approvals, we might need similar logic in Approvals.tsx, but user asked to view the "job"
                 // If it is an order assignment, it is likely in Orders list too.
                 // But if it's "Onay", it's in Approvals page.
                 // Let's check type or title more carefully.
                 // Actually, if it is "Yeni İş Ataması" (New Job Assignment), it is usually an Order.
                 // If "Onay Bekliyor" (Waiting Approval), it is Approval.
                 
                 // My backend creates: 'Yeni İş Ataması' or 'Departman İş Ataması'.
                 // Both refer to an Order.
                 navigate('/orders', { state: { openOrderId: notification.relatedId } });
            } else {
                 navigate('/orders', { state: { openOrderId: notification.relatedId } });
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors outline-none"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-white">
                        {notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Bildirimler</h3>
                        {notifications.length > 0 && (
                            <button 
                                onClick={() => handleMarkRead(notifications.map(n => n.id))}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Tümünü Okundu İşaretle
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                Yeni bildiriminiz yok.
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                                        <span className="text-xs text-slate-400">
                                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{notification.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
