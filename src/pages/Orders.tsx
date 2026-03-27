import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileDown, CheckCircle, Edit, Filter, Star, Menu } from 'lucide-react';
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
import { useProducts } from '../hooks/useProducts';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

type OrderTypePrefix = 'IHR' | 'ICP' | 'IKA';

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        created: 'bg-slate-400', offer_sent: 'bg-blue-500', offer_accepted: 'bg-green-500',
        revision_requested: 'bg-amber-400', production_started: 'bg-orange-400',
        production_completed: 'bg-teal-500', shipping_started: 'bg-purple-500', shipping_completed: 'bg-emerald-600',
    };
    const label = ORDER_STATUS_MAP[status]?.label || status;
    const color = colors[status] || 'bg-slate-400';
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
            <span className="text-xs text-slate-700">{label}</span>
        </span>
    );
}

export default function Orders() {
    const { orders, addOrder, updateOrder, updateStatus } = useOrders();
    const { products } = useProducts();
    const { trackAction } = useAI();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [selectedTypePrefix, setSelectedTypePrefix] = useState<OrderTypePrefix | null>(null);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.openOrderId && orders.length > 0) {
            const order = orders.find(o => o.id === location.state.openOrderId);
            if (order) {
                setEditingOrder(order);
                setIsModalOpen(true);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, orders]);

    const filteredOrders = orders.filter(o =>
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingOrder(undefined); setIsViewOnly(false); setSelectedTypePrefix(null);
        setIsTypeModalOpen(true); trackAction('open_create_order_modal');
    };

    const handleSubmit = async (data: OrderFormData) => {
        if (editingOrder) {
            await updateOrder(editingOrder.id, data);
            trackAction('update_order', { id: editingOrder.id });
        } else {
            await addOrder(data, { typePrefix: selectedTypePrefix || 'ICP' });
            trackAction('create_order', { typePrefix: selectedTypePrefix || 'ICP' });
        }
        setIsModalOpen(false);
    };

    const isOrderLocked = (order: Order) =>
        !['created', 'offer_sent', 'revision_requested'].includes(order.status);

    const handleOfferAccepted = (id: string) => {
        if (confirm('Teklifin müşteri tarafından onaylandığını teyit ediyor musunuz?')) {
            updateStatus(id, 'offer_accepted' as Order['status']);
            trackAction('confirm_offer_acceptance', { id });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setIsViewOnly(false);
        setTimeout(() => setEditingOrder(undefined), 300);
    };

    return (
        <>
            <ERPPageLayout
                breadcrumbs={[
                    { label: 'Satış' },
                    { label: 'Satışlar' },
                    { label: 'Siparişler', active: true },
                ]}
                toolbar={
                    <>
                        <ToolbarBtn icon={<Plus size={13} />} label="Yeni" variant="primary" onClick={handleAdd} />
                        <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                        <ToolbarBtn icon={<Star size={13} />} />
                        <ToolbarBtn icon={<Menu size={13} />} />
                    </>
                }
                toolbarRight={
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 w-48"
                        />
                    </div>
                }
            >
                {/* Main Table */}
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="w-8 px-2 py-2 text-center border-r border-slate-200 text-[11px]">#</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Kod</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Sipariş Tarihi</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Müşteri</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Teslimat Tarihi</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Toplam</th>
                            <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap text-[11px] uppercase tracking-wide">Aşama</th>
                            <th className="px-3 py-2 text-[11px] uppercase tracking-wide">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                                    Kayıtlı sipariş bulunamadı.
                                </td>
                            </tr>
                        ) : filteredOrders.map((order, idx) => (
                            <tr
                                key={order.id}
                                className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                            >
                                <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-600 font-medium whitespace-nowrap">
                                    #{order.id.slice(0, 10).toUpperCase()}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100 whitespace-nowrap text-slate-600">
                                    {format(new Date(order.createdAt), 'dd-MM-yyyy', { locale: tr })}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-800 max-w-[180px] truncate">
                                    <span className="text-orange-400 mr-1">→</span>
                                    {order.customerName}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                                    {format(new Date(order.createdAt), 'dd-MM-yyyy', { locale: tr })}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100 font-semibold text-slate-700 whitespace-nowrap">
                                    {order.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.currency}
                                </td>
                                <td className="px-3 py-2 border-r border-slate-100">
                                    <StatusDot status={order.status} />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                        {(order.status === 'offer_sent' || order.status === 'revision_requested') && (
                                            <button onClick={() => handleOfferAccepted(order.id)} title="Teklif Onaylandı"
                                                className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors">
                                                <CheckCircle size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => generateQuotePDF(order)} title="PDF İndir"
                                            className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
                                            <FileDown size={14} />
                                        </button>
                                        <button onClick={() => { setEditingOrder(order); setIsViewOnly(true); setIsModalOpen(true); }} title="Görüntüle"
                                            className="p-1 rounded hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors">
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingOrder(order); setIsViewOnly(false); setIsModalOpen(true); }}
                                            disabled={isOrderLocked(order)}
                                            title={isOrderLocked(order) ? "Düzenlenemez" : "Düzenle"}
                                            className={`p-1 rounded transition-colors ${isOrderLocked(order) ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-indigo-100 text-slate-500 hover:text-indigo-600'}`}
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ERPPageLayout>

            {/* Order Detail Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                size={editingOrder && (isViewOnly || isOrderLocked(editingOrder)) ? "xl" : "full"}
                theme={editingOrder && (isViewOnly || isOrderLocked(editingOrder)) ? "minimal" : "glass"}
                title={editingOrder ? ((isViewOnly || isOrderLocked(editingOrder)) ? "Sipariş Görüntüle" : "Sipariş Düzenle") : "Yeni Sipariş Oluştur"}>
                <OrderForm
                    key={editingOrder?.id || 'new'}
                    initialData={editingOrder}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                    readOnly={editingOrder ? (isViewOnly || isOrderLocked(editingOrder)) : false}
                    defaultVatRate={!editingOrder && selectedTypePrefix === 'IHR' ? 0 : 20}
                />
            </Modal>

            {/* Order Type Modal */}
            <Modal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Sipariş Tipi Seçimi">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Lütfen oluşturacağınız siparişin tipini seçin.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {([['IHR', 'İhracat', 'Sipariş numarası IHR ile başlayacaktır.'],
                            ['ICP', 'İç Piyasa', 'Sipariş numarası ICP ile başlayacaktır.'],
                            ['IKA', 'İhraç Kayıtlı', 'Sipariş numarası IKA ile başlayacaktır.']] as const).map(([prefix, label, desc]) => (
                            <button key={prefix} type="button"
                                onClick={() => { setSelectedTypePrefix(prefix); setIsTypeModalOpen(false); setIsModalOpen(true); }}
                                className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-indigo-50 border-slate-200 transition-colors">
                                <div>
                                    <div className="font-semibold text-slate-800">{label}</div>
                                    <div className="text-xs text-slate-500">{desc}</div>
                                </div>
                                <span className="text-xs font-mono text-slate-400">{prefix}xxx</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
}
