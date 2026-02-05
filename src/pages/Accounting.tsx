import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useStock } from '../hooks/useStock';
import { FileText, CheckCircle2, Upload, Eye, X, ArrowRight, Truck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import type { Order } from '../types';

export default function Accounting() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { stockItems, updateStockQuantity } = useStock();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [uploading, setUploading] = useState<{id: string, type: 'invoice' | 'waybill'} | null>(null);
    
    // Shipment Modal State
    const [shipmentModal, setShipmentModal] = useState<{
        isOpen: boolean;
        order: Order | null;
        quantities: Record<string, number>; // productId -> invoiceQuantity
    }>({
        isOpen: false,
        order: null,
        quantities: {}
    });

    // Filter orders
    const pendingOrders = orders.filter(o => o.status === 'production_completed' || o.status === 'invoice_waiting');
    const completedOrders = orders.filter(o => o.status === 'invoice_added' || o.status === 'shipping_completed');

    const handleFileUpload = async (orderId: string, e: React.ChangeEvent<HTMLInputElement>, type: 'invoice' | 'waybill') => {
        if (!e.target.files || !e.target.files[0]) return;
        
        setUploading({ id: orderId, type });
        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload?folder=doc', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            
            await updateOrder(orderId, {
                [type === 'invoice' ? 'invoiceUrl' : 'waybillUrl']: data.url
            });
            
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
        
        // Initialize quantities with order quantities
        const initialQuantities: Record<string, number> = {};
        if (order.items) {
            order.items.forEach(item => {
                initialQuantities[item.productId] = item.quantity;
            });
        }

        setShipmentModal({
            isOpen: true,
            order: order,
            quantities: initialQuantities
        });
    };

    const handleShipmentConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        const { order, quantities } = shipmentModal;
        if (!order) return;

        try {
            // 1. Deduct from General Stock
            const stockItem = stockItems.find(i => i.stockNumber === order.id);
            const totalDeduct = Object.values(quantities).reduce((a, b) => a + b, 0);
            
            if (stockItem) {
                if (totalDeduct > stockItem.quantity) {
                    alert(`Girilen toplam miktar (${totalDeduct}) mevcut stoktan (${stockItem.quantity}) fazla olamaz!`);
                    return;
                }

                await updateStockQuantity(stockItem.id, { deduct: totalDeduct });
            } else {
                const proceed = confirm('Bu sipariş için üretim stoğu bulunamadı. Stok düşümü yapılmadan sevkiyat onaylansın mı?');
                if (!proceed) return;
            }

            // 2. Update Order Status
            await updateStatus(order.id, 'invoice_added');

            setShipmentModal({ isOpen: false, order: null, quantities: {} });
        } catch (error) {
            console.error('Shipment error:', error);
            alert('İşlem sırasında bir hata oluştu.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Muhasebe</h1>
                    <p className="text-slate-500">Üretimi tamamlanan ve fatura/irsaliye bekleyen siparişler</p>
                </div>
            </div>

            {/* Pending Orders Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Fatura Bekleyen Siparişler</h2>
                </div>
                
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {pendingOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Fatura bekleyen sipariş bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {pendingOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                            Üretim Tamamlandı
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <div>{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</div>
                                        <div className="font-medium text-slate-900">
                                            {order.grandTotal?.toLocaleString('tr-TR')} {order.currency}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 space-y-3">
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {/* Invoice Upload Button */}
                                            <label className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${order.invoiceUrl ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(order.id, e, 'invoice')}
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    disabled={uploading?.id === order.id}
                                                />
                                                {uploading?.id === order.id && uploading?.type === 'invoice' ? (
                                                    <span className="animate-pulse">Yükleniyor...</span>
                                                ) : order.invoiceUrl ? (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        Fatura Yüklendi
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={14} />
                                                        Fatura Ekle
                                                    </>
                                                )}
                                            </label>

                                            {/* Waybill Upload Button */}
                                            <label className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${order.waybillUrl ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'}`}>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(order.id, e, 'waybill')}
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    disabled={uploading?.id === order.id}
                                                />
                                                {uploading?.id === order.id && uploading?.type === 'waybill' ? (
                                                    <span className="animate-pulse">Yükleniyor...</span>
                                                ) : order.waybillUrl ? (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        İrsaliye Yüklendi
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={14} />
                                                        İrsaliye Ekle
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleCompleteClick(order)}
                                            disabled={!order.invoiceUrl}
                                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${order.invoiceUrl ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                        >
                                            <Truck size={16} />
                                            Sevkiyata Gönder
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
                            {pendingOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Fatura bekleyen sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                pendingOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {order.grandTotal?.toLocaleString('tr-TR')} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                Üretim Tamamlandı
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex gap-2">
                                                    {/* Invoice Upload Button */}
                                                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${order.invoiceUrl ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}>
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            onChange={(e) => handleFileUpload(order.id, e, 'invoice')}
                                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            disabled={uploading?.id === order.id}
                                                        />
                                                        {uploading?.id === order.id && uploading?.type === 'invoice' ? (
                                                            <span className="animate-pulse">Yükleniyor...</span>
                                                        ) : order.invoiceUrl ? (
                                                            <>
                                                                <CheckCircle2 size={14} />
                                                                Fatura Yüklendi
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload size={14} />
                                                                Fatura Ekle
                                                            </>
                                                        )}
                                                    </label>

                                                    {/* Waybill Upload Button */}
                                                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${order.waybillUrl ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'}`}>
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            onChange={(e) => handleFileUpload(order.id, e, 'waybill')}
                                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            disabled={uploading?.id === order.id}
                                                        />
                                                        {uploading?.id === order.id && uploading?.type === 'waybill' ? (
                                                            <span className="animate-pulse">Yükleniyor...</span>
                                                        ) : order.waybillUrl ? (
                                                            <>
                                                                <CheckCircle2 size={14} />
                                                                İrsaliye Yüklendi
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload size={14} />
                                                                İrsaliye Ekle
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleCompleteClick(order)}
                                                    disabled={!order.invoiceUrl}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${order.invoiceUrl ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                >
                                                    <Truck size={14} />
                                                    Sevkiyata Gönder
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

            {/* Shipment Confirmation Modal */}
            <Modal
                isOpen={shipmentModal.isOpen}
                onClose={() => setShipmentModal({ isOpen: false, order: null, quantities: {} })}
                title="Sevkiyat Onayı ve Stok Düşümü"
            >
                <form onSubmit={handleShipmentConfirm} className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-3 items-start">
                        <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                        <p>
                            Bu işlem siparişi sevkiyat aşamasına gönderecek ve girilen adetleri genel stoktan düşecektir.
                            Kalan miktar stokta tutulmaya devam edecektir.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {shipmentModal.order?.items.map((item) => {
                            const stockItem = stockItems.find(i => i.stockNumber === shipmentModal.order?.id);
                            const currentStock = stockItem?.quantity || 0;
                            
                            return (
                                <div key={item.productId} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="mb-3">
                                        <div className="font-semibold text-slate-800">{item.productName}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">Stok No: {shipmentModal.order?.id}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-2 rounded border border-slate-200">
                                            <div className="text-xs text-slate-500">Sipariş Edilen</div>
                                            <div className="font-medium text-slate-800">{item.quantity} {item.unit || 'Adet'}</div>
                                        </div>
                                        <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                                            <div className="text-xs text-emerald-600">Mevcut Üretim Stoğu</div>
                                            <div className="font-bold text-emerald-700">{currentStock} {item.unit || 'Adet'}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Fatura Edilen / Sevk Edilen Miktar
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                required
                                                min="0.01"
                                                step="0.01"
                                                max={currentStock > 0 ? currentStock : undefined}
                                                value={shipmentModal.quantities[item.productId] || ''}
                                                onChange={(e) => setShipmentModal({
                                                    ...shipmentModal,
                                                    quantities: {
                                                        ...shipmentModal.quantities,
                                                        [item.productId]: parseFloat(e.target.value)
                                                    }
                                                })}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-500">{item.unit || 'Adet'}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            * Bu miktar stoktan düşülecektir.
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShipmentModal({ isOpen: false, order: null, quantities: {} })}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <Truck size={16} />
                            Onayla ve Gönder
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Completed/History Orders Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Geçmiş İşlemler (Faturalandırılanlar)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Tutar</th>
                                <th className="px-6 py-4">Belgeler</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {completedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Geçmiş işlem bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                completedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {order.grandTotal?.toLocaleString('tr-TR')} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {order.invoiceUrl && (
                                                    <a 
                                                        href={order.invoiceUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                                                        title="Faturayı Görüntüle"
                                                    >
                                                        <FileText size={12} /> Fatura
                                                    </a>
                                                )}
                                                {order.waybillUrl && (
                                                    <a 
                                                        href={order.waybillUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-1 rounded"
                                                        title="İrsaliyeyi Görüntüle"
                                                    >
                                                        <FileText size={12} /> İrsaliye
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="flex items-center gap-2 ml-auto px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-xs font-medium"
                                            >
                                                <Eye size={16} />
                                                Görüntüle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={`Sipariş Detayı - #${selectedOrder?.id.slice(0, 8)}`}
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        {/* Order Info */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Müşteri</span>
                                <span className="text-sm font-medium text-slate-900">{selectedOrder.customerName}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Tarih</span>
                                <span className="text-sm font-medium text-slate-900">
                                    {format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Durum</span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {selectedOrder.status === 'invoice_added' ? 'Muhasebe İşlemi Tamamlandı' : 'İşlem Bekliyor'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Toplam Tutar</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {selectedOrder.grandTotal?.toLocaleString('tr-TR')} {selectedOrder.currency}
                                </span>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-900">Belgeler</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="border rounded-lg p-3 flex items-center justify-between bg-white">
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-blue-600" size={18} />
                                        <span className="text-sm text-slate-700">Fatura</span>
                                    </div>
                                    {selectedOrder.invoiceUrl ? (
                                        <a 
                                            href={selectedOrder.invoiceUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <Eye size={14} /> Aç
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">Yok</span>
                                    )}
                                </div>
                                <div className="border rounded-lg p-3 flex items-center justify-between bg-white">
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-amber-600" size={18} />
                                        <span className="text-sm text-slate-700">İrsaliye</span>
                                    </div>
                                    {selectedOrder.waybillUrl ? (
                                        <a 
                                            href={selectedOrder.waybillUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                        >
                                            <Eye size={14} /> Aç
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">Yok</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-900">Sipariş Kalemleri</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-700 font-medium">
                                        <tr>
                                            <th className="px-4 py-2">Ürün</th>
                                            <th className="px-4 py-2 text-right">Miktar</th>
                                            <th className="px-4 py-2 text-right">Birim Fiyat</th>
                                            <th className="px-4 py-2 text-right">Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-slate-600">{item.productName}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">{item.quantity}</td>
                                                <td className="px-4 py-2 text-right text-slate-600">
                                                    {item.unitPrice.toLocaleString('tr-TR')} {selectedOrder.currency}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-900">
                                                    {(item.quantity * item.unitPrice).toLocaleString('tr-TR')} {selectedOrder.currency}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-medium text-slate-900">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-2 text-right">Genel Toplam</td>
                                            <td className="px-4 py-2 text-right">
                                                {selectedOrder.grandTotal?.toLocaleString('tr-TR')} {selectedOrder.currency}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
