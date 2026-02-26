import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStock } from '../hooks/useStock';
import { Eye, Network, CheckCircle2, Plus, Trash2, Package } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product, StockItemFormData } from '../types';

const STOCK_UNITS = [
    'Adet', 'Gram', 'Koli', 'Kg', 'Metre', 'Ton', 'Litre'
];

export default function Procurement() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products } = useProducts();
    const { stockItems, addStockItem, deleteStockItem, updateStockQuantity } = useStock();
    
    const procurementOrders = orders.filter(o => 
        o.status === 'supply_design_process' || 
        o.status === 'design_approved' || 
        o.status === 'supply_waiting' ||
        o.status === 'offer_accepted' ||
        o.status === 'waiting_manager_approval' ||
        o.status === 'manager_approved' ||
        o.status === 'revision_requested'
    );

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productJobDetails, setProductJobDetails] = useState<any>(null);
    const [productDesignImages, setProductDesignImages] = useState<string[] | undefined>(undefined);

    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [newStockItem, setNewStockItem] = useState<StockItemFormData>({
        stockNumber: '',
        company: '',
        product: '',
        quantity: 0,
        unit: 'Adet'
    });

    const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
    const [selectedStockItems, setSelectedStockItems] = useState<Record<string, number>>({});
    const [processingOrder, setProcessingOrder] = useState<Order | null>(null);
    
    // Raw Materials Modal State
    const [isRawMaterialsModalOpen, setIsRawMaterialsModalOpen] = useState(false);
    const [selectedOrderForMaterials, setSelectedOrderForMaterials] = useState<Order | null>(null);
    
    // Sheet Details Modal State
    const [isSheetDetailsModalOpen, setIsSheetDetailsModalOpen] = useState(false);
    const [sheetDetails, setSheetDetails] = useState<Record<string, { plate: number; body: number; lid: number; bottom: number }>>({});
    const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);

    const [quantityModal, setQuantityModal] = useState<{
        isOpen: boolean;
        item: any | null;
        quantity: number;
    }>({
        isOpen: false,
        item: null,
        quantity: 0
    });

    const [quickAddModal, setQuickAddModal] = useState<{
        isOpen: boolean;
        item: any | null;
        quantity: number;
    }>({
        isOpen: false,
        item: null,
        quantity: 0
    });

    const handleQuickAddClick = (item: any) => {
        setQuickAddModal({
            isOpen: true,
            item,
            quantity: 0
        });
    };

    const handleQuickAddSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quickAddModal.item && quickAddModal.quantity > 0) {
            try {
                // Add quantity (using negative deduct to add)
                await updateStockQuantity(quickAddModal.item.id, { 
                    deduct: -quickAddModal.quantity 
                });
                setQuickAddModal({ isOpen: false, item: null, quantity: 0 });
            } catch (error) {
                console.error('Error adding stock:', error);
                alert('Stok eklenirken bir hata oluştu.');
            }
        }
    };

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsOrderModalOpen(true);
    };

    const handleViewProduct = (productId: string, order?: Order) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProduct(product);
            if (order) {
                setProductJobDetails({
                    jobSize: order.jobSize,
                    boxSize: order.boxSize,
                    efficiency: order.efficiency
                });
                setProductDesignImages(order.designImages || undefined);
            } else {
                setProductJobDetails(null);
                setProductDesignImages(undefined);
            }
            setIsProductModalOpen(true);
        }
    };

    const handleViewRawMaterials = (order: Order) => {
        setSelectedOrderForMaterials(order);
        setIsRawMaterialsModalOpen(true);
    };

    const handleDeleteMaterial = async (stockId: string, amount: number) => {
        if (!selectedOrderForMaterials) return;
        
        if (!confirm('Bu hammadde kullanımını silmek ve stok miktarını iade etmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            // 1. Restore stock (pass negative deduct to add back)
            await updateStockQuantity(stockId, { deduct: -amount });
            
            // 2. Update order stock usage
            const newStockUsage = { ...selectedOrderForMaterials.stockUsage };
            delete newStockUsage[stockId];
            
            // 3. Save order
            await updateOrder(selectedOrderForMaterials.id, { 
                stockUsage: newStockUsage 
            } as any);

            // 4. Update local state
            setSelectedOrderForMaterials({
                ...selectedOrderForMaterials,
                stockUsage: newStockUsage
            });

            // Also update selectedOrder if it's open
            if (selectedOrder && selectedOrder.id === selectedOrderForMaterials.id) {
                setSelectedOrder({
                    ...selectedOrder,
                    stockUsage: newStockUsage
                });
            }

        } catch (error) {
            console.error('Error deleting material:', error);
            alert('Hammadde silinirken bir hata oluştu.');
        }
    };

    const handleProcurementStatusChange = async (orderId: string, status: string) => {
        const order = orders.find(o => o.id === orderId);
        
        if (status === 'completed') {
            setOrderToComplete(order || null);
            // Initialize sheetDetails for all products in the order
            if (order) {
                const initialDetails: Record<string, { plate: number; body: number; lid: number; bottom: number }> = {};
                order.items.forEach(item => {
                    if (item.productId) {
                        initialDetails[item.productId] = { plate: 0, body: 0, lid: 0, bottom: 0 };
                    }
                });
                setSheetDetails(initialDetails);
            }
            setIsSheetDetailsModalOpen(true);
            return;
        }

        // For other statuses (legacy support or if re-enabled later)
        if ((status === 'shipped_to_production') && order && order.designStatus !== 'completed') {
            alert('Tasarım departmanı işi tamamlamadan üretime sevk edemezsiniz.');
            return;
        }

        await updateOrder(orderId, { procurementStatus: status } as any);

        if (status === 'shipped_to_production') {
            await updateStatus(orderId, 'production_planned');
        }
    };

    const handleSaveSheetDetails = async () => {
        if (!orderToComplete) return;

        // Validation: Ensure all fields are filled for all products
        const isValid = Object.values(sheetDetails).every(details => 
            details.plate >= 0 && details.body >= 0 && details.lid >= 0 && details.bottom >= 0
        );

        if (!isValid) {
            alert('Lütfen tüm ürünler için adetleri giriniz.');
            return;
        }
        
        if (!confirm('Sevkiyat yapılacak, onaylıyor musunuz? Onaylanması durumunda sipariş üretime aktarılacaktır.')) {
            return;
        }

        try {
            await updateOrder(orderToComplete.id, {
                procurementStatus: 'completed',
                status: 'production_pending', // Special status for Production Incoming table
                procurementDetails: sheetDetails
            } as any);

            setIsSheetDetailsModalOpen(false);
            setOrderToComplete(null);
            alert('Sipariş başarıyla üretime aktarıldı.');
        } catch (error) {
            console.error('Error completing procurement:', error);
            alert('İşlem sırasında bir hata oluştu.');
        }
    };

    const handleOpenProcurement = (order: Order) => {
        setProcessingOrder(order);
        setSelectedStockItems({});
        setIsProcurementModalOpen(true);
    };

    const handleSaveProcurement = async () => {
        if (!processingOrder) return;

        // Deduct stock quantities for NEW items
        for (const [itemId, amount] of Object.entries(selectedStockItems)) {
            await updateStockQuantity(itemId, { deduct: amount });
        }

        // Merge with existing usage
        const previousUsage = processingOrder.stockUsage || {};
        const newUsage = { ...previousUsage };

        for (const [itemId, amount] of Object.entries(selectedStockItems)) {
            if (newUsage[itemId]) {
                newUsage[itemId] += amount;
            } else {
                newUsage[itemId] = amount;
            }
        }

        // Update order status and save merged stock usage
        await updateOrder(processingOrder.id, { 
            procurementStatus: 'printing_started',
            stockUsage: newUsage 
        } as any);
        
        setIsProcurementModalOpen(false);
        setProcessingOrder(null);
        setSelectedStockItems({});
    };

    const handleStockItemClick = (item: any) => {
        if (selectedStockItems[item.id]) {
            const newSelected = { ...selectedStockItems };
            delete newSelected[item.id];
            setSelectedStockItems(newSelected);
        } else {
            setQuantityModal({
                isOpen: true,
                item: item,
                quantity: 0
            });
        }
    };

    const handleQuantityConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (quantityModal.item && quantityModal.quantity > 0) {
            setSelectedStockItems(prev => ({
                ...prev,
                [quantityModal.item.id]: quantityModal.quantity
            }));
            setQuantityModal({ isOpen: false, item: null, quantity: 0 });
        }
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if stock number exists
        const existingItem = stockItems.find(item => item.stockNumber === newStockItem.stockNumber);
        
        if (existingItem) {
            if (confirm(`"${newStockItem.stockNumber}" numaralı stok zaten mevcut (${existingItem.product}). \n\nGirilen ${newStockItem.quantity} ${newStockItem.unit} miktarını mevcut stoğa eklemek istiyor musunuz?`)) {
                try {
                    await updateStockQuantity(existingItem.id, { 
                        deduct: -newStockItem.quantity 
                    });
                    setIsAddStockModalOpen(false);
                    setNewStockItem({
                        stockNumber: '',
                        company: '',
                        product: '',
                        quantity: 0,
                        unit: 'Adet'
                    });
                } catch (error) {
                    console.error('Error updating existing stock:', error);
                    alert('Stok güncellenirken bir hata oluştu.');
                }
            }
            return;
        }

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

    const handleStockNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewStockItem(prev => ({ ...prev, stockNumber: val }));
        
        // Auto-fill if exists
        const existing = stockItems.find(item => item.stockNumber === val);
        if (existing) {
            setNewStockItem(prev => ({
                ...prev,
                stockNumber: val,
                company: existing.company,
                product: existing.product,
                unit: existing.unit
            }));
        }
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
                
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {procurementOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Tedarik bekleyen sipariş bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {procurementOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm text-slate-600 space-y-2">
                                        <span className="font-medium block mb-1">Ürünler:</span>
                                        {order.items.map((item, idx) => {
                                            const product = products.find(p => p.id === item.productId);
                                            const dimensions = product?.dimensions 
                                                ? `${product.dimensions.length}x${product.dimensions.width}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''} mm`
                                                : '';
                                            return (
                                                <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100">
                                                    <div className="font-medium text-slate-800">{product?.name || item.productName}</div>
                                                    {dimensions && <div className="text-xs text-slate-500 mt-0.5">{dimensions}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleViewOrder(order)}
                                            className="flex flex-col items-center justify-center gap-1 p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Sipariş Detaylarını Görüntüle"
                                        >
                                            <Eye size={18} />
                                            Görüntüle
                                        </button>
                                        <button
                                            onClick={() => handleOpenProcurement(order)}
                                            className="flex flex-col items-center justify-center gap-1 p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Tedarik İşlemleri"
                                        >
                                            <Network size={18} />
                                            Tedarik
                                        </button>
                                        <button
                                            onClick={() => handleViewRawMaterials(order)}
                                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors text-xs font-medium ${
                                                order.stockUsage && Object.keys(order.stockUsage).length > 0
                                                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                    : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                                            }`}
                                            aria-label="Kullanılan Hammaddeler"
                                        >
                                            <Package size={18} />
                                            Hammaddeler
                                        </button>
                                        <button
                                            onClick={() => handleProcurementStatusChange(order.id, 'completed')}
                                            className="flex flex-col items-center justify-center gap-1 p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-xs font-medium"
                                            aria-label="Tedarik İşlemini Tamamla"
                                        >
                                            <CheckCircle2 size={18} />
                                            Tamamla
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
                                <th className="px-6 py-4">Ürünler</th>
                                <th className="px-6 py-4">Tarih</th>
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
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const dimensions = product?.dimensions 
                                                        ? `${product.dimensions.length}x${product.dimensions.width}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''} mm`
                                                        : '';
                                                    return (
                                                        <div key={idx} className="flex flex-col">
                                                            <span className="font-medium text-slate-800">{product?.name || item.productName}</span>
                                                            {dimensions && <span className="text-xs text-slate-500">{dimensions}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewOrder(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
                                                    aria-label="Sipariş Detaylarını Görüntüle"
                                                >
                                                    <Eye size={16} />
                                                    Görüntüle
                                                </button>
                                                <button
                                                    onClick={() => handleOpenProcurement(order)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-xs font-medium"
                                                    aria-label="Tedarik İşlemleri"
                                                >
                                                    <Network size={16} />
                                                    Tedarik
                                                </button>
                                                <button
                                                    onClick={() => handleViewRawMaterials(order)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                                                        order.stockUsage && Object.keys(order.stockUsage).length > 0
                                                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                            : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                                                    }`}
                                                    aria-label="Kullanılan Hammaddeler"
                                                >
                                                    <Package size={16} />
                                                    Hammaddeler
                                                </button>
                                                <button
                                                    onClick={() => handleProcurementStatusChange(order.id, 'completed')}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-xs font-medium"
                                                    aria-label="Tedarik İşlemini Tamamla"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    Tamamlandı
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
                        aria-label="Stok Ekle"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Stok Ekle</span>
                        <span className="md:hidden">Ekle</span>
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden">
                        {stockItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Henüz stok kaydı bulunmuyor.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {stockItems.map((item) => (
                                    <div key={item.id} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-mono text-xs text-slate-500">{item.stockNumber}</div>
                                                <div className="font-medium text-slate-800">{item.product}</div>
                                                <div className="text-xs text-slate-500">{item.company}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-emerald-600">
                                                    {item.quantity} {item.unit}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {format(new Date(item.createdAt), 'dd MMM', { locale: tr })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => handleQuickAddClick(item)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-xs font-medium"
                                                aria-label="Hızlı Stok Ekle"
                                            >
                                                <Plus size={16} />
                                                Ekle
                                            </button>
                                            <button
                                                onClick={() => deleteStockItem(item.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-xs font-medium"
                                                aria-label="Stok Sil"
                                            >
                                                <Trash2 size={16} />
                                                Sil
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
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleQuickAddClick(item)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Stok Ekle"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteStockItem(item.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={18} />
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

                        {/* Stock Usage Info */}
                        {selectedOrder.stockUsage && Object.keys(selectedOrder.stockUsage).length > 0 && (
                            <div>
                                <h3 className="font-medium text-slate-800 mb-3 border-b border-slate-200 pb-2">Kullanılan Hammaddeler</h3>
                                <div className="space-y-3">
                                    {Object.entries(selectedOrder.stockUsage).map(([itemId, quantity]) => {
                                        const stockItem = stockItems.find(s => s.id === itemId);
                                        return (
                                            <div key={itemId} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                <div>
                                                    <p className="font-medium text-slate-800">{stockItem ? stockItem.product : 'Silinmiş Stok'}</p>
                                                    <p className="text-xs text-slate-500">{stockItem?.company} {stockItem?.stockNumber ? `• ${stockItem.stockNumber}` : ''}</p>
                                                </div>
                                                <div className="font-bold text-amber-700">
                                                    {quantity} {stockItem?.unit}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-medium text-slate-800 mb-3 border-b border-slate-200 pb-2">Ürünler</h3>
                            <div className="space-y-3">
                                {selectedOrder.items.map((item, idx) => {
                                    const product = products.find(p => p.id === item.productId);
                                    const dimensions = product?.dimensions 
                                        ? `${product.dimensions.length}x${product.dimensions.width}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''} mm`
                                        : '';

                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <div className="font-mono text-xs text-indigo-600 font-medium mb-0.5">
                                                    {product?.code || '-'}
                                                </div>
                                                <p className="font-medium text-slate-800">{product?.name || item.productName}</p>
                                                {dimensions && (
                                                    <p className="text-xs text-slate-600 mt-0.5">
                                                        {dimensions}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-1">Miktar: {item.quantity} {item.unit}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {selectedOrder.stockUsage && Object.keys(selectedOrder.stockUsage).length > 0 && (
                                                    <button
                                                        onClick={() => handleViewRawMaterials(selectedOrder)}
                                                        className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 bg-white rounded border border-emerald-100 shadow-sm"
                                                        title="Kullanılan Hammaddeleri Görüntüle"
                                                    >
                                                        <Package size={14} />
                                                        Hammaddeler
                                                    </button>
                                                )}
                                                {item.productId && (
                                                    <button
                                                        onClick={() => handleViewProduct(item.productId!, selectedOrder)}
                                                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 bg-white rounded border border-indigo-100 shadow-sm"
                                                    >
                                                        <Eye size={14} />
                                                        Ürünü Görüntüle
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
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
                {selectedProduct && (
                    <ProductDetail
                        product={selectedProduct}
                        jobDetails={productJobDetails || undefined}
                        designImages={productDesignImages}
                        onClose={() => setIsProductModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Raw Materials Modal */}
            <Modal
                isOpen={isRawMaterialsModalOpen}
                onClose={() => setIsRawMaterialsModalOpen(false)}
                title="Kullanılan Hammaddeler"
            >
                {selectedOrderForMaterials && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h3 className="font-semibold text-slate-800 text-lg">Sipariş #{selectedOrderForMaterials.id.slice(0, 8)}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                                Müşteri: <span className="font-medium text-slate-800">{selectedOrderForMaterials.customerName}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium text-slate-800 border-b border-slate-100 pb-2">Kullanılan Stok Malzemeleri</h4>
                            
                            {(!selectedOrderForMaterials.stockUsage || Object.keys(selectedOrderForMaterials.stockUsage).length === 0) ? (
                                <p className="text-sm text-slate-500 text-center py-4">Bu sipariş için henüz hammadde kullanımı girilmemiş.</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(selectedOrderForMaterials.stockUsage).map(([itemId, quantity]) => {
                                        const stockItem = stockItems.find(s => s.id === itemId);
                                        return (
                                            <div key={itemId} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                                        <Package size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">
                                                            {stockItem ? stockItem.product : 'Silinmiş Stok Öğesi'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {stockItem?.company} {stockItem?.stockNumber ? `• ${stockItem.stockNumber}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-amber-700">
                                                            {quantity} {stockItem?.unit || ''}
                                                        </p>
                                                        <p className="text-xs text-slate-400">Kullanılan</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteMaterial(itemId, quantity as number)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hammadde Kullanımını Sil ve Stoğa İade Et"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setIsRawMaterialsModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                )}
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
                        <p>Bu sipariş için kullanılacak stok malzemelerini aşağıdan seçiniz.</p>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {stockItems.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Stok kaydı bulunmuyor.</p>
                        ) : (
                            stockItems.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => handleStockItemClick(item)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedStockItems[item.id]
                                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-sm text-slate-900">{item.product}</p>
                                            <p className="text-xs text-slate-500">{item.company} • {item.stockNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            {selectedStockItems[item.id] ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-sm text-indigo-600">
                                                        -{selectedStockItems[item.id]} {item.unit}
                                                    </span>
                                                    <span className="text-xs text-slate-400 line-through">
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="font-medium text-sm text-emerald-600">{item.quantity} {item.unit}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsProcurementModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveProcurement}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Stok No</label>
                        <input
                            required
                            type="text"
                            list="stock-numbers"
                            value={newStockItem.stockNumber}
                            onChange={handleStockNumberChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Örn: STK-2024-001"
                            aria-label="Stok Numarası"
                        />
                        <datalist id="stock-numbers">
                            {stockItems.map(item => (
                                <option key={item.id} value={item.stockNumber}>
                                    {item.product} - {item.company}
                                </option>
                            ))}
                        </datalist>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Firma</label>
                        <input
                            required
                            type="text"
                            value={newStockItem.company}
                            onChange={e => setNewStockItem({...newStockItem, company: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Tedarikçi firma adı"
                            aria-label="Firma Adı"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Ürün</label>
                        <input
                            required
                            type="text"
                            value={newStockItem.product}
                            onChange={e => setNewStockItem({...newStockItem, product: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Malzeme adı"
                            aria-label="Ürün Adı"
                        />
                    </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Miktar
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={newStockItem.quantity}
                    onChange={e => setNewStockItem({...newStockItem, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Miktar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Birim
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newStockItem.unit}
                    onChange={e => setNewStockItem({...newStockItem, unit: e.target.value})}
                    aria-label="Birim"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Ton">Ton</option>
                    <option value="Metre">Metre</option>
                    <option value="Top">Top</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Minimum Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStockItem.minStock}
                    onChange={e => setNewStockItem({...newStockItem, minStock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Minimum Stok"
                  />
                </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsAddStockModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Quantity Selection Modal */}
            <Modal
                isOpen={quantityModal.isOpen}
                onClose={() => setQuantityModal({ ...quantityModal, isOpen: false })}
                title="Kullanılacak Miktar"
            >
                <form onSubmit={handleQuantityConfirm} className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4">
                        <p className="font-medium text-slate-800">{quantityModal.item?.product}</p>
                        <p>Mevcut Stok: {quantityModal.item?.quantity} {quantityModal.item?.unit}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Kullanılacak Miktar ({quantityModal.item?.unit})
                        </label>
                        <input
                            required
                            autoFocus
                            type="number"
                            min="0.1"
                            step="0.01"
                            max={quantityModal.item?.quantity}
                            value={quantityModal.quantity || ''}
                            onChange={e => setQuantityModal({ ...quantityModal, quantity: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold text-center"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setQuantityModal({ ...quantityModal, isOpen: false })}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            Onayla
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Quick Add Stock Modal */}
            <Modal
                isOpen={quickAddModal.isOpen}
                onClose={() => setQuickAddModal({ ...quickAddModal, isOpen: false })}
                title="Hızlı Stok Ekle"
            >
                <form onSubmit={handleQuickAddSave} className="space-y-4">
                    <div className="bg-emerald-50 p-3 rounded-lg text-sm text-emerald-800 mb-4 border border-emerald-100">
                        <p className="font-bold">{quickAddModal.item?.product}</p>
                        <p className="text-xs mt-1">{quickAddModal.item?.company} • {quickAddModal.item?.stockNumber}</p>
                        <p className="mt-2 font-medium">Mevcut Stok: {quickAddModal.item?.quantity} {quickAddModal.item?.unit}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Eklenecek Miktar ({quickAddModal.item?.unit})
                        </label>
                        <input
                            required
                            autoFocus
                            type="number"
                            min="0.1"
                            step="0.01"
                            value={quickAddModal.quantity || ''}
                            onChange={e => setQuickAddModal({ ...quickAddModal, quantity: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-center text-emerald-600"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setQuickAddModal({ ...quickAddModal, isOpen: false })}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                            Stok Ekle
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Sheet Details Modal */}
            <Modal
                isOpen={isSheetDetailsModalOpen}
                onClose={() => setIsSheetDetailsModalOpen(false)}
                title="Üretim Sevkiyat Bilgileri Girişi"
            >
                <div className="space-y-6">
                    <p className="text-sm text-slate-500 mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <strong className="text-amber-800">Dikkat:</strong> Lütfen her ürün için üretilen/tedarik edilen levha adetlerini giriniz. 
                        Bu bilgiler eksiksiz doldurulmadan sevkiyat işlemi yapılamaz.
                    </p>
                    
                    {orderToComplete && orderToComplete.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product || !item.productId) return null;
                        
                        const details = sheetDetails[item.productId] || { plate: 0, body: 0, lid: 0, bottom: 0 };
                        
                        return (
                            <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
                                    {product.name} ({product.code})
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Levha Adeti
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={details.plate}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSheetDetails(prev => ({
                                                    ...prev,
                                                    [item.productId!]: { ...prev[item.productId!], plate: val }
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label={`${product.name} Levha Adeti`}
                                            title="Levha Adeti"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Gövde Adeti
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={details.body}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSheetDetails(prev => ({
                                                    ...prev,
                                                    [item.productId!]: { ...prev[item.productId!], body: val }
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label={`${product.name} Gövde Adeti`}
                                            title="Gövde Adeti"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Kapak Adeti
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={details.lid}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSheetDetails(prev => ({
                                                    ...prev,
                                                    [item.productId!]: { ...prev[item.productId!], lid: val }
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label={`${product.name} Kapak Adeti`}
                                            title="Kapak Adeti"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Dip Adeti
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={details.bottom}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setSheetDetails(prev => ({
                                                    ...prev,
                                                    [item.productId!]: { ...prev[item.productId!], bottom: val }
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label={`${product.name} Dip Adeti`}
                                            title="Dip Adeti"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsSheetDetailsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSaveSheetDetails}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Sevkiyatı Onayla ve Gönder
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
