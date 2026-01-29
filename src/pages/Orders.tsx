import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileDown } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import type { Order, OrderFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { OrderForm } from '../components/orders/OrderForm';
import { generateQuotePDF } from '../lib/pdf';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';

import { ORDER_STATUS_MAP } from '../constants/orderStatus';


export default function Orders() {
    const { orders, addOrder, updateOrder, updateStatus } = useOrders();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();

    useEffect(() => {
        if (location.state?.openOrderId && orders.length > 0) {
            const order = orders.find(o => o.id === location.state.openOrderId);
            if (order) {
                setEditingOrder(order);
                setIsModalOpen(true);
                // Clear state to avoid reopening if user closes and stays on page
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, orders]);

    const filteredOrders = orders.filter(o =>
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingOrder(undefined);
        setIsModalOpen(true);
    };

    const handleSubmit = (data: OrderFormData) => {
        if (editingOrder) {
            updateOrder(editingOrder.id, data);
        } else {
            addOrder(data);
        }
        setIsModalOpen(false);
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        updateStatus(id, newStatus as Order['status']);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Siparişler & Teklifler</h1>
                    <p className="text-slate-500">Sipariş takibi, teklif oluşturma ve durum yönetimi</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Yeni Sipariş
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Sipariş veya Müşteri ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Tutar</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Kayıtlı sipariş bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr 
                                        key={order.id} 
                                        className={`transition-colors border-b last:border-0 ${
                                            order.status === 'created' 
                                                ? 'bg-white hover:bg-slate-50' 
                                                : (ORDER_STATUS_MAP[order.status]?.color ? `bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-50 hover:bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-100` : 'bg-white hover:bg-slate-50')
                                        }`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            {order.grandTotal.toFixed(2)} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer outline-none appearance-none ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100'} bg-opacity-100`}
                                            >
                                                {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => generateQuotePDF(order)}
                                                    className="p-2 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-colors bg-white/50"
                                                    title="PDF İndir"
                                                >
                                                    <FileDown size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}
                                                    className="p-2 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors bg-white/50"
                                                    title="Düzenle"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingOrder ? "Sipariş Düzenle" : "Yeni Sipariş Oluştur"}
            >
                <OrderForm
                    initialData={editingOrder}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
