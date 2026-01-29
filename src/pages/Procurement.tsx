import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStock } from '../hooks/useStock';
import { Eye, Network, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product, StockItemFormData } from '../types';

const PROCUREMENT_STATUSES = {
    planned: 'Tedarik Hammadde Planı Yapıldı',
    ordered: 'Hammadde Siparişi Verildi',
    supplied: 'Hammadde Tedarik Edildi',
    printing_started: 'Matbaa Baskısı Yapılıyor',
    printing_completed: 'Matbaa Baskısı Yapıldı',
    shipped_to_production: 'Üretim Sevkiyatı Yapıldı'
};

const STOCK_UNITS = [
    'Adet', 'Gram', 'Koli', 'Kg', 'Metre', 'Ton', 'Litre'
];

export default function Procurement() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products } = useProducts();
    const { stockItems, addStockItem, deleteStockItem } = useStock();
    
    // Filter orders that are design approved (waiting for procurement)
    const procurementOrders = orders.filter(o => o.status === 'design_approved' || o.status === 'supply_waiting');

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [newStockItem, setNewStockItem] = useState<StockItemFormData>({
        stockNumber: '',
        company: '',
        product: '',
        quantity: 0,
        unit: 'Adet'
    });

    const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
    const [selectedStockItems, setSelectedStockItems] = useState<string[]>([]);
    const [processingOrder, setProcessingOrder] = useState<Order | null>(null);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsOrderModalOpen(true);
    };

    const handleViewProduct = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProduct(product);
            setIsProductModalOpen(true);
        }
    };

    const handleProcurementStatusChange = async (orderId: string, status: string) => {
        // Update procurement status
        await updateOrder(orderId, { procurementStatus: status } as any);

        // If status is "shipped_to_production", update main status to "production_planned"
        if (status === 'shipped_to_production') {
            await updateStatus(orderId, 'production_planned');
        }
    };

    const handleOpenProcurement = (order: Order) => {
        setProcessingOrder(order);
        setSelectedStockItems([]);
        setIsProcurementModalOpen(true);
    };

    const handleSaveProcurement = async () => {
        if (!processingOrder) return;

        // Update order status to 'printing_started'
        // In a real app, we would also save the selected stock items
        await handleProcurementStatusChange(processingOrder.id, 'printing_started');
        
        setIsProcurementModalOpen(false);
        setProcessingOrder(null);
        setSelectedStockItems([]);
    };

    const toggleStockItemSelection = (itemId: string) => {
        setSelectedStockItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        await addStockItem(newStockItem);
        setIsAddStockModalOpen(false);
        setNewStockItem({
            stockNumber: '',
            company: '',
            product: '',
            quantity: 0,
            unit: 'Adet'
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tedarik</h1>
                    <p className="text-slate-500">Tedarik süreci bekleyen tasarım onaylı siparişler</p>
                </div>
            </div>

            {/* Procurement Orders List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Tedarik Bekleyen Siparişler</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Ürünler</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Tedarik Durumu</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {procurementOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Tedarik bekleyen sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                procurementOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {order.items.map(i => i.productName).join(', ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={order.procurementStatus || ''}
                                                onChange={(e) => handleProcurementStatusChange(order.id, e.target.value)}
                                                className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            >
                                                <option value="">Durum Seçin</option>
                                                {Object.entries(PROCUREMENT_STATUSES).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewOrder(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <Eye size={16} />
                                                    Görüntüle
                                                </button>
                                                <button
                                                    onClick={() => handleOpenProcurement(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-xs font-medium"
                                                >
                                                    <Network size={16} />
                                                    Tedarik
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

            {/* Stock Management Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Stok Listesi</h2>
                    <button
                        onClick={() => setIsAddStockModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={20} />
                        Stok Ekle
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Stok No</th>
                                    <th className="px-6 py-4">Firma</th>
                                    <th className="px-6 py-4">Ürün</th>
                                    <th className="px-6 py-4">Miktar</th>
                                    <th className="px-6 py-4">Kayıt Tarihi</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {stockItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            Henüz stok kaydı bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    stockItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs">{item.stockNumber}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{item.company}</td>
                                            <td className="px-6 py-4">{item.product}</td>
                                            <td className="px-6 py-4 font-semibold text-emerald-600">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => deleteStockItem(item.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* View Order Modal */}
            <Modal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                title={`Sipariş Detayı #${selectedOrder?.id.slice(0, 8)}`}
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Müşteri</label>
                                <p className="font-medium text-slate-800">{selectedOrder.customerName}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Tarih</label>
                                <p className="font-medium text-slate-800">
                                    {format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-slate-800 mb-3 border-b border-slate-200 pb-2">Ürünler</h3>
                            <div className="space-y-3">
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="font-medium text-slate-800">{item.productName}</p>
                                            <p className="text-xs text-slate-500">Miktar: {item.quantity} {item.unit}</p>
                                        </div>
                                        {item.productId && (
                                            <button
                                                onClick={() => handleViewProduct(item.productId!)}
                                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 bg-white rounded border border-indigo-100 shadow-sm"
                                            >
                                                <Eye size={14} />
                                                Ürünü Görüntüle
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Product Detail Modal (Nested) */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title="Ürün Detayı"
            >
                {selectedProduct && <ProductDetail product={selectedProduct} />}
            </Modal>

            {/* Procurement Stock Selection Modal */}
            <Modal
                isOpen={isProcurementModalOpen}
                onClose={() => setIsProcurementModalOpen(false)}
                title="Tedarik Malzeme Seçimi"
            >
                <div className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800">
                        <p className="font-medium mb-1">Malzeme Seçimi</p>
                        <p>Lütfen bu sipariş için kullanılacak stok malzemelerini seçiniz. Kaydet butonuna bastığınızda sipariş durumu "Matbaa Baskısı Yapılıyor" olarak güncellenecektir.</p>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300"
                                            checked={stockItems.length > 0 && selectedStockItems.length === stockItems.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStockItems(stockItems.map(i => i.id));
                                                } else {
                                                    setSelectedStockItems([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-4 py-2">Stok No</th>
                                    <th className="px-4 py-2">Ürün</th>
                                    <th className="px-4 py-2">Miktar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {stockItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                            Stok kaydı bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    stockItems.map((item) => (
                                        <tr 
                                            key={item.id} 
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedStockItems.includes(item.id) ? 'bg-indigo-50' : ''}`}
                                            onClick={() => toggleStockItemSelection(item.id)}
                                        >
                                            <td className="px-4 py-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedStockItems.includes(item.id)}
                                                    onChange={() => {}} // Handled by tr click
                                                    className="rounded border-slate-300"
                                                />
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">{item.stockNumber}</td>
                                            <td className="px-4 py-2">{item.product}</td>
                                            <td className="px-4 py-2 text-emerald-600">
                                                {item.quantity} {item.unit}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsProcurementModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveProcurement}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                        >
                            <CheckCircle2 size={18} />
                            Kaydet ve Başlat
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Stock Modal */}
            <Modal
                isOpen={isAddStockModalOpen}
                onClose={() => setIsAddStockModalOpen(false)}
                title="Yeni Stok Ekle"
            >
                <form onSubmit={handleAddStock} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Stok Numarası</label>
                        <input
                            type="text"
                            required
                            value={newStockItem.stockNumber}
                            onChange={e => setNewStockItem({...newStockItem, stockNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="örn: STK-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Firma</label>
                        <input
                            type="text"
                            required
                            value={newStockItem.company}
                            onChange={e => setNewStockItem({...newStockItem, company: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Tedarikçi firma adı"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ürün</label>
                        <input
                            type="text"
                            required
                            value={newStockItem.product}
                            onChange={e => setNewStockItem({...newStockItem, product: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Ürün adı"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Miktar</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={newStockItem.quantity}
                                onChange={e => setNewStockItem({...newStockItem, quantity: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Birim</label>
                            <select
                                value={newStockItem.unit}
                                onChange={e => setNewStockItem({...newStockItem, unit: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                {STOCK_UNITS.map(unit => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsAddStockModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
