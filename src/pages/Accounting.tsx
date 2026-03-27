import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useStock } from '../hooks/useStock';
import { FileText, CheckCircle2, Upload, Eye, X, Truck, AlertTriangle, Menu, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import type { Order } from '../types';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Accounting() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { stockItems, updateStockQuantity } = useStock();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [uploading, setUploading] = useState<{id: string, type: 'invoice' | 'waybill'} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [shipmentModal, setShipmentModal] = useState<{
        isOpen: boolean;
        order: Order | null;
        quantities: Record<string, number>;
    }>({
        isOpen: false,
        order: null,
        quantities: {}
    });

    const pendingOrders = orders.filter(o => o.status === 'production_completed' || o.status === 'invoice_waiting')
        .filter(o => o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm));
    
    const completedOrders = orders.filter(o => o.status === 'invoice_added' || o.status === 'shipping_completed')
        .filter(o => o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm));

    const handleFileUpload = async (orderId: string, e: React.ChangeEvent<HTMLInputElement>, type: 'invoice' | 'waybill') => {
        if (!e.target.files || !e.target.files[0]) return;
        setUploading({ id: orderId, type });
        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch('/api/upload?folder=doc', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            await updateOrder(orderId, { [type === 'invoice' ? 'invoiceUrl' : 'waybillUrl']: data.url });
        } catch (error) {
            alert('Dosya yüklenirken hata oluştu');
            console.error(error);
        } finally {
            setUploading(null);
        }
    };

    const handleCompleteClick = (order: Order) => {
        if (!order.invoiceUrl) {
            alert('Lütfen önce faturayı yükleyiniz.');
            return;
        }
        const initialQuantities: Record<string, number> = {};
        if (order.items) {
            order.items.forEach(item => { initialQuantities[item.productId] = item.quantity; });
        }
        setShipmentModal({ isOpen: true, order: order, quantities: initialQuantities });
    };

    const handleShipmentConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        const { order, quantities } = shipmentModal;
        if (!order) return;
        try {
            const stockItem = stockItems.find(i => i.stockNumber === order.id);
            const totalDeduct = Object.values(quantities).reduce((a, b) => a + b, 0);
            if (stockItem) {
                if (totalDeduct > stockItem.quantity) {
                    alert(`Girilen toplam miktar (${totalDeduct}) mevcut stoktan (${stockItem.quantity}) fazla olamaz!`);
                    return;
                }
                await updateStockQuantity(stockItem.id, { deduct: totalDeduct });
            } else {
                if (!confirm('Bu sipariş için üretim stoğu bulunamadı. Stok düşümü yapılmadan sevkiyat onaylansın mı?')) return;
            }
            await updateStatus(order.id, 'invoice_added');
            setShipmentModal({ isOpen: false, order: null, quantities: {} });
        } catch (error) {
            console.error('Shipment error:', error);
            alert('İşlem sırasında bir hata oluştu.');
        }
    };

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Finans' }, { label: 'Muhasebe', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
            toolbarRight={
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                        type="text" 
                        placeholder="Müşteri veya Sipariş No ara..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400 w-64" 
                    />
                </div>
            }
        >
            <div className="space-y-6">
                {/* Pending Section */}
                <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Fatura Bekleyen Siparişler</span>
                        <span className="text-[10px] text-slate-400">{pendingOrders.length} kayıt bulundu</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                                <th className="w-8 px-2 py-2 text-center border-r border-slate-100">#</th>
                                <th className="px-3 py-2 border-r border-slate-100">Sipariş No</th>
                                <th className="px-3 py-2 border-r border-slate-100">Müşteri</th>
                                <th className="px-3 py-2 border-r border-slate-100">Tarih</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-right">Tutar</th>
                                <th className="px-3 py-2 border-r border-slate-100">Durum</th>
                                <th className="px-3 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingOrders.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Fatura bekleyen sipariş bulunmuyor.</td></tr>
                            ) : pendingOrders.map((order, idx) => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                                    <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700">{order.customerName}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-500">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-900">{order.grandTotal?.toLocaleString('tr-TR')} {order.currency}</td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Üretim Tamamlandı</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex justify-end gap-1.5 items-center">
                                            <label className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-[10px] font-bold transition-all ${order.invoiceUrl ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(order.id, e, 'invoice')} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={uploading?.id === order.id} />
                                                {uploading?.id === order.id && uploading?.type === 'invoice' ? <span className="animate-pulse">...</span> : order.invoiceUrl ? <><CheckCircle2 size={12} /> FATURA</> : <><Upload size={12} /> FATURA</>}
                                            </label>
                                            <button onClick={() => handleCompleteClick(order)} disabled={!order.invoiceUrl} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${order.invoiceUrl ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'}`}>
                                                <Truck size={12} /> SEVK ET
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* History Section */}
                <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Geçmiş İşlemler</span>
                        <span className="text-[10px] text-slate-400">{completedOrders.length} kayıt bulundu</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                                <th className="w-8 px-2 py-2 text-center border-r border-slate-100">#</th>
                                <th className="px-3 py-2 border-r border-slate-100">Sipariş No</th>
                                <th className="px-3 py-2 border-r border-slate-100">Müşteri</th>
                                <th className="px-3 py-2 border-r border-slate-100">Tarih</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-right">Tutar</th>
                                <th className="px-3 py-2 border-r border-slate-100">Belgeler</th>
                                <th className="px-3 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedOrders.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Üretim tamamlanan kayıt bulunmuyor.</td></tr>
                            ) : completedOrders.map((order, idx) => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors opacity-80 hover:opacity-100">
                                    <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700">{order.customerName}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-slate-500">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-right font-medium text-slate-800">{order.grandTotal?.toLocaleString('tr-TR')} {order.currency}</td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                        <div className="flex gap-1">
                                            {order.invoiceUrl && <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-blue-600 border border-blue-100 bg-blue-50/50 hover:bg-blue-50" title="Fatura"><FileText size={12} /></a>}
                                            {order.waybillUrl && <a href={order.waybillUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-amber-600 border border-amber-100 bg-amber-50/50 hover:bg-amber-50" title="İrsaliye"><FileText size={12} /></a>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button onClick={() => setSelectedOrder(order)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Shipment Confirmation Modal */}
            <Modal isOpen={shipmentModal.isOpen} onClose={() => setShipmentModal({ isOpen: false, order: null, quantities: {} })} title="Sevkiyat Onayı">
                <form onSubmit={handleShipmentConfirm} className="space-y-4 p-1">
                    <div className="bg-amber-50 p-3 rounded text-[11px] text-amber-800 border border-amber-200 flex gap-2">
                        <AlertTriangle className="shrink-0" size={14} />
                        Bu işlem siparişi sevkiyat aşamasına taşıyacak ve adetleri stoktan düşecektir.
                    </div>
                    {shipmentModal.order?.items.map((item) => {
                        const stockItem = stockItems.find(i => i.stockNumber === shipmentModal.order?.id);
                        const currentStock = stockItem?.quantity || 0;
                        return (
                            <div key={item.productId} className="bg-slate-50 p-3 rounded border border-slate-200">
                                <div className="text-[11px] font-bold text-slate-700 mb-2">{item.productName}</div>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-white p-2 rounded border border-slate-100">
                                        <div className="text-[10px] text-slate-400 uppercase">Sipariş</div>
                                        <div className="text-xs font-bold font-mono">{item.quantity} {item.unit}</div>
                                    </div>
                                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                                        <div className="text-[10px] text-emerald-600 uppercase">Stok</div>
                                        <div className="text-xs font-bold font-mono text-emerald-700">{currentStock} {item.unit}</div>
                                    </div>
                                </div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sevk Edilen Miktar</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" required min="0.01" step="0.01" value={shipmentModal.quantities[item.productId] || ''} onChange={(e) => setShipmentModal({ ...shipmentModal, quantities: { ...shipmentModal.quantities, [item.productId]: parseFloat(e.target.value) }})}
                                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                                    <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setShipmentModal({ isOpen: false, order: null, quantities: {} })} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded text-xs font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"><Truck size={14} /> Onayla</button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Detay - #${selectedOrder?.id.slice(0, 8)}`}>
                {selectedOrder && (
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded">
                            <div><span className="text-slate-500 block">Müşteri</span><span className="font-bold">{selectedOrder.customerName}</span></div>
                            <div><span className="text-slate-500 block">Toplam Tutar</span><span className="font-bold text-blue-600">{selectedOrder.grandTotal?.toLocaleString('tr-TR')} {selectedOrder.currency}</span></div>
                        </div>
                        <div className="space-y-2">
                            <span className="font-bold text-slate-700">Kalemler</span>
                            <div className="border rounded">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                                        <tr><th className="px-3 py-1">Ürün</th><th className="px-3 py-1 text-right">Adet</th><th className="px-3 py-1 text-right">Genel</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedOrder.items.map((item, i) => (
                                            <tr key={i}><td className="px-3 py-2">{item.productName}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right font-bold">{(item.quantity * item.unitPrice).toLocaleString('tr-TR')}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2"><button onClick={() => setSelectedOrder(null)} className="px-4 py-2 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-widest">Kapat</button></div>
                    </div>
                )}
            </Modal>
        </ERPPageLayout>
    );
}
