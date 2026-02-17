import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileDown, CheckCircle } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import type { Order, OrderFormData } from '../types';
import { Modal } from '../components/ui/Modal';
import { OrderForm } from '../components/orders/OrderForm';
import { generateQuotePDF } from '../lib/pdf';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';
import { useAI } from '../context/AIContext';

import { ORDER_STATUS_MAP } from '../constants/orderStatus';


type OrderTypePrefix = 'IHR' | 'ICP' | 'IKA';

export default function Orders() {
    const { orders, addOrder, updateOrder, updateStatus } = useOrders();
    const { trackAction } = useAI();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [selectedTypePrefix, setSelectedTypePrefix] = useState<OrderTypePrefix | null>(null);
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
        setSelectedTypePrefix(null);
        setIsTypeModalOpen(true);
        trackAction('open_create_order_modal');
    };

    const handleSubmit = async (data: OrderFormData) => {
        if (editingOrder) {
            await updateOrder(editingOrder.id, data);
            trackAction('update_order', { id: editingOrder.id });
        } else {
            const typePrefix: OrderTypePrefix = selectedTypePrefix || 'ICP';
            await addOrder(data, { typePrefix });
            trackAction('create_order', { typePrefix });
        }
        setIsModalOpen(false);
    };

    // Helper to check if order is locked for editing
    const isOrderLocked = (order: Order) => {
        // Sales personnel can only edit in specific statuses
        const editableStatuses = ['created', 'offer_sent', 'revision_requested'];
        return !editableStatuses.includes(order.status);
    };

    const handleOfferAccepted = (id: string) => {
        if (confirm('Teklifin müşteri tarafından onaylandığını teyit ediyor musunuz?')) {
            updateStatus(id, 'offer_accepted' as Order['status']);
            trackAction('confirm_offer_acceptance', { id });
        }
    };

    return (
        <>
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
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Kayıtlı sipariş bulunamadı.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                        </div>
                                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100'} bg-opacity-100`}>
                                            {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <div>{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</div>
                                        <div className="font-semibold text-slate-700">{order.grandTotal.toFixed(2)} {order.currency}</div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        {(order.status === 'offer_sent' || order.status === 'revision_requested') && (
                                            <button
                                                onClick={() => handleOfferAccepted(order.id)}
                                                className="p-2 text-green-600 bg-green-50 rounded-lg"
                                                title="Teklif Onaylandı"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => generateQuotePDF(order)}
                                            className="p-2 text-slate-600 bg-slate-50 rounded-lg"
                                            title="PDF İndir"
                                        >
                                            <FileDown size={18} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}
                                            className={`p-2 rounded-lg ${isOrderLocked(order) ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                            title={isOrderLocked(order) ? "Görüntüle" : "Düzenle"}
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
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
                                            <div className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100'} bg-opacity-100`}>
                                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {(order.status === 'offer_sent' || order.status === 'revision_requested') && (
                                                    <button
                                                        onClick={() => handleOfferAccepted(order.id)}
                                                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors bg-white/50"
                                                        title="Teklif Onaylandı"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => generateQuotePDF(order)}
                                                    className="p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors bg-white/50"
                                                    title="PDF İndir"
                                                >
                                                    <FileDown size={18} />
                                                </button>
                                                
                                                <button
                                                    onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}
                                                    className={`p-2 rounded-lg transition-colors bg-white/50 ${isOrderLocked(order) ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'}`}
                                                    title={isOrderLocked(order) ? "Görüntüle" : "Düzenle"}
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
                title={editingOrder ? (isOrderLocked(editingOrder) ? "Sipariş Görüntüle" : "Sipariş Düzenle") : "Yeni Sipariş Oluştur"}
            >
                <OrderForm
                    initialData={editingOrder}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    readOnly={editingOrder ? isOrderLocked(editingOrder) : false}
                    defaultVatRate={!editingOrder && selectedTypePrefix === 'IHR' ? 0 : 20}
                />
            </Modal>
        </div>

        <Modal
            isOpen={isTypeModalOpen}
            onClose={() => setIsTypeModalOpen(false)}
            title="Sipariş Tipi Seçimi"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Lütfen oluşturacağınız siparişin tipini seçin. Sipariş numarası bu seçime göre otomatik verilecektir.
                </p>
                <div className="grid grid-cols-1 gap-3">
                    <button
                        type="button"
                        onClick={() => { setSelectedTypePrefix('IHR'); setIsTypeModalOpen(false); setIsModalOpen(true); }}
                        className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-indigo-50 border-slate-200"
                    >
                        <div>
                            <div className="font-semibold text-slate-800">İhracat</div>
                            <div className="text-xs text-slate-500">Sipariş numarası IHR ile başlayacaktır.</div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">Örn: IHR1, IHR2</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedTypePrefix('ICP'); setIsTypeModalOpen(false); setIsModalOpen(true); }}
                        className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-indigo-50 border-slate-200"
                    >
                        <div>
                            <div className="font-semibold text-slate-800">İç Piyasa</div>
                            <div className="text-xs text-slate-500">Sipariş numarası ICP ile başlayacaktır.</div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">Örn: ICP1, ICP2</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedTypePrefix('IKA'); setIsTypeModalOpen(false); setIsModalOpen(true); }}
                        className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-indigo-50 border-slate-200"
                    >
                        <div>
                            <div className="font-semibold text-slate-800">İhraç Kayıtlı</div>
                            <div className="text-xs text-slate-500">Sipariş numarası IKA ile başlayacaktır.</div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">Örn: IKA1, IKA2</span>
                    </button>
                </div>
            </div>
        </Modal>
        </>
    );
}
