import { useState, useRef, useEffect } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ORDER_STATUS_MAP } from '../../constants/orderStatus';
import type { Order } from '../../types';

export function DepartmentTasks() {
    const { orders } = useOrders();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // If no user or no role, we still render but with empty list
    // if (!user || !user.role) return null;

    // Define which statuses belong to which role (Current Workload)
    const getRoleStatuses = (roleName: string): string[] => {
        if (!roleName) return [];
        switch (roleName) {
            case 'Satış':
                return ['created', 'offer_sent', 'offer_cancelled'];
            case 'Tasarımcı':
                return ['design_waiting'];
            case 'Tedarik':
            case 'Matbaa':
                return ['supply_waiting'];
            case 'Fabrika Müdürü':
            case 'Üretim':
                return ['production_planned', 'production_started'];
            case 'Muhasebe':
                return ['invoice_waiting'];
            case 'Sevkiyat':
                return ['shipping_waiting'];
            case 'Admin':
            case 'Yönetici':
                // Admin might see everything or nothing specific. 
                // Let's show "Pending Approval" tasks for Admin maybe?
                return ['shipping_completed']; // Final approval
            default:
                return [];
        }
    };

    const userRoleName = user?.role?.name || '';
    const targetStatuses = getRoleStatuses(userRoleName);
    
    // Filter orders
    const pendingOrders = orders.filter(order => targetStatuses.includes(order.status));

    // If role has no specific tasks defined, maybe hide? 
    // Or show 0. User said "o departmanın elindeki işler".
    // If Admin, showing 0 is fine if no logic defined.

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors outline-none flex items-center gap-2 group"
                title="Bekleyen İşler"
            >
                <div className="relative">
                    <ClipboardList size={20} />
                    {pendingOrders.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full border border-white">
                            {pendingOrders.length}
                        </span>
                    )}
                </div>
                <span className="text-sm font-medium hidden md:block group-hover:text-indigo-600 transition-colors">
                    İş Listesi
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-slate-800">Bekleyen İşler</h3>
                            <p className="text-xs text-slate-500">{userRoleName || 'Departman Seçilmedi'} Departmanı</p>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {pendingOrders.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500">
                                <ClipboardList className="mx-auto mb-2 text-slate-300" size={32} />
                                <p className="text-sm">Bekleyen iş bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {pendingOrders.map(order => (
                                    <div key={order.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {format(new Date(order.updatedAt || order.createdAt), 'dd MMM HH:mm', { locale: tr })}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-800 mb-1 line-clamp-1">
                                            {order.customerName}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-xs text-slate-500">
                            Toplam {pendingOrders.length} iş beklemede
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
