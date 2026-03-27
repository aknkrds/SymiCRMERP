import { useEffect, useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStock } from '../hooks/useStock';
import { Eye, Network, CheckCircle2, Plus, Trash2, Package, FileText, Pencil, AlertTriangle, Menu } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product, ProcurementDispatch, ProcurementDispatchChangeRequest, ProcurementDispatchLine, ProcurementDispatchPrintType, StockItemFormData } from '../types';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

// STOCK_UNITS removed as it was unused

export default function Procurement() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products } = useProducts();
    const { stockItems, addStockItem, deleteStockItem, updateStockQuantity } = useStock();
    
    const procurementOrders = orders.filter(o => {
        const s = o.status as any;
        return s === 'supply_design_process' || 
               s === 'design_approved' || 
               s === 'supply_waiting' ||
               s === 'offer_accepted' ||
               s === 'waiting_manager_approval' ||
               s === 'manager_approved' ||
               s === 'revision_requested';
    });

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productJobDetails, setProductJobDetails] = useState<any>(null);
    const [productDesignImages, setProductDesignImages] = useState<(string | { url: string; productId?: string })[] | undefined>(undefined);

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

    const [dispatches, setDispatches] = useState<ProcurementDispatch[]>([]);
    const [dispatchesLoading, setDispatchesLoading] = useState(false);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [dispatchMode, setDispatchMode] = useState<'create' | 'edit'>('create');
    const [dispatchViewModal, setDispatchViewModal] = useState<{ isOpen: boolean; dispatch: ProcurementDispatch | null }>({
        isOpen: false,
        dispatch: null
    });
    const [dispatchChangeRequests, setDispatchChangeRequests] = useState<ProcurementDispatchChangeRequest[]>([]);
    const [changeRequestModal, setChangeRequestModal] = useState<{ isOpen: boolean; dispatch: ProcurementDispatch | null; reason: string }>({
        isOpen: false,
        dispatch: null,
        reason: ''
    });

    const createEmptyDispatchLine = (): ProcurementDispatchLine => ({
        orderId: '',
        customerName: '',
        productId: '',
        productCode: '',
        productName: '',
        plateQuantity: 0,
        printType: 'Gövde',
        printQuantity: 0,
        total: 0,
        plateSize: ''
    });
    const [dispatchForm, setDispatchForm] = useState<{
        id: string;
        dispatchDate: string;
        vehiclePlate: string;
        driverNames: string;
        notes: string;
        lines: ProcurementDispatchLine[];
    }>({
        id: crypto.randomUUID(),
        dispatchDate: new Date().toISOString().slice(0, 10),
        vehiclePlate: '',
        driverNames: '',
        notes: '',
        lines: [createEmptyDispatchLine()]
    });

    const fetchDispatches = async () => {
        try {
            setDispatchesLoading(true);
            const res = await fetch('/api/procurement-dispatches');
            if (!res.ok) throw new Error('Sevk listesi alınamadı');
            const data = await res.json();
            setDispatches(Array.isArray(data) ? data : []);
        } catch (e) {
            setDispatches([]);
        } finally {
            setDispatchesLoading(false);
        }
    };

    const fetchDispatchChangeRequests = async () => {
        try {
            const res = await fetch('/api/procurement-dispatch-change-requests');
            if (!res.ok) throw new Error('Sevk değişiklik istekleri alınamadı');
            const data = await res.json();
            setDispatchChangeRequests(Array.isArray(data) ? data : []);
        } catch (e) {
            setDispatchChangeRequests([]);
        }
    };

    useEffect(() => {
        fetchDispatches();
        fetchDispatchChangeRequests();
    }, []);

    const dispatchOrderOptions = useMemo(() => procurementOrders, [procurementOrders]);

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
            if (!confirm('Sipariş üretime gönderilsin mi?')) {
                return;
            }
            await updateOrder(orderId, { procurementStatus: 'completed', status: 'production_pending' } as any);
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

    const handleOpenDispatchModal = () => {
        const open = async () => {
            try {
                const res = await fetch('/api/procurement-dispatches/reserve-id', { method: 'POST' });
                if (!res.ok) throw new Error('failed');
                const data = await res.json();
                const reservedId = data?.id;
                if (!reservedId) throw new Error('missing id');

                setDispatchMode('create');
                setDispatchForm({
                    id: reservedId,
                    dispatchDate: new Date().toISOString().slice(0, 10),
                    vehiclePlate: '',
                    driverNames: '',
                    notes: '',
                    lines: [createEmptyDispatchLine()]
                });
                setIsDispatchModalOpen(true);
            } catch (e) {
                alert('Fiş numarası oluşturulamadı.');
            }
        };
        open();
    };

    const handleOpenDispatchView = (dispatch: ProcurementDispatch) => {
        setDispatchViewModal({ isOpen: true, dispatch });
    };

    const handleOpenChangeRequestModal = (dispatch: ProcurementDispatch) => {
        setChangeRequestModal({ isOpen: true, dispatch, reason: '' });
    };

    const handleSubmitChangeRequest = async () => {
        const dispatch = changeRequestModal.dispatch;
        const reason = (changeRequestModal.reason || '').trim();
        if (!dispatch) return;
        if (!reason) {
            alert('Lütfen açıklama giriniz.');
            return;
        }

        try {
            const payload: ProcurementDispatchChangeRequest = {
                id: crypto.randomUUID(),
                dispatchId: dispatch.id,
                reason,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            const res = await fetch('/api/procurement-dispatch-change-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Kayıt başarısız');
            await fetchDispatchChangeRequests();
            setChangeRequestModal({ isOpen: false, dispatch: null, reason: '' });
        } catch (e) {
            alert('Değişiklik onayı istenirken bir hata oluştu.');
        }
    };

    const handleOpenEditDispatch = (dispatch: ProcurementDispatch) => {
        const normalizedLines = Array.isArray(dispatch.lines) ? dispatch.lines : [];
        setDispatchMode('edit');
        setDispatchForm({
            id: dispatch.id,
            dispatchDate: dispatch.dispatchDate,
            vehiclePlate: dispatch.vehiclePlate || '',
            driverNames: dispatch.driverNames || '',
            notes: dispatch.notes || '',
            lines: normalizedLines.length > 0
                ? normalizedLines.map((l) => ({
                    ...createEmptyDispatchLine(),
                    ...l,
                    total: (Number(l?.plateQuantity) || 0) * (Number(l?.printQuantity) || 0)
                }))
                : [createEmptyDispatchLine()]
        });
        setIsDispatchModalOpen(true);
    };

    const handleDispatchLineChange = (
        index: number,
        patch: Partial<ProcurementDispatchLine>
    ) => {
        setDispatchForm(prev => {
            const nextLines = prev.lines.map((l, i) => {
                if (i !== index) return l;
                const updated: ProcurementDispatchLine = { ...l, ...patch };
                const plateQuantity = Number(updated.plateQuantity) || 0;
                const printQuantity = Number(updated.printQuantity) || 0;
                updated.total = Math.max(0, plateQuantity) * Math.max(0, printQuantity);
                return updated;
            });
            return { ...prev, lines: nextLines };
        });
    };

    const handleAddDispatchLine = () => {
        setDispatchForm(prev => ({ ...prev, lines: [...prev.lines, createEmptyDispatchLine()] }));
    };

    const handleRemoveDispatchLine = (index: number) => {
        setDispatchForm(prev => {
            const nextLines = prev.lines.filter((_, i) => i !== index);
            return { ...prev, lines: nextLines.length > 0 ? nextLines : [createEmptyDispatchLine()] };
        });
    };

    const handleDispatchOrderSelect = (index: number, orderId: string) => {
        const order = dispatchOrderOptions.find(o => o.id === orderId);
        handleDispatchLineChange(index, {
            orderId,
            customerName: order?.customerName || '',
            productId: '',
            productCode: '',
            productName: '',
        });
    };

    const handleDispatchProductSelect = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        handleDispatchLineChange(index, {
            productId,
            productCode: product?.code || '',
            productName: product?.name || '',
        });
    };

    const handleSaveDispatch = async () => {
        const cleanLines = dispatchForm.lines
            .map(l => ({
                ...l,
                plateQuantity: Number(l.plateQuantity) || 0,
                printQuantity: Number(l.printQuantity) || 0,
                total: (Number(l.plateQuantity) || 0) * (Number(l.printQuantity) || 0),
            }))
            .filter(l => l.orderId && l.productId && l.plateQuantity > 0 && l.printQuantity > 0);

        if (cleanLines.length === 0) {
            alert('Lütfen en az 1 satır doldurunuz.');
            return;
        }

        const payload: ProcurementDispatch = {
            id: dispatchForm.id,
            dispatchDate: dispatchForm.dispatchDate,
            vehiclePlate: dispatchForm.vehiclePlate || undefined,
            driverNames: dispatchForm.driverNames || undefined,
            notes: dispatchForm.notes || undefined,
            lines: cleanLines,
            createdAt: new Date().toISOString()
        };

        try {
            const res = dispatchMode === 'create'
                ? await fetch('/api/procurement-dispatches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                : await fetch(`/api/procurement-dispatches/${payload.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dispatchDate: payload.dispatchDate,
                        vehiclePlate: payload.vehiclePlate,
                        driverNames: payload.driverNames,
                        notes: payload.notes,
                        lines: payload.lines
                    })
                });
            if (!res.ok) throw new Error('Sevk kaydedilemedi');
            await fetchDispatches();
            await fetchDispatchChangeRequests();
            setIsDispatchModalOpen(false);
        } catch (e) {
            alert('Sevk kaydedilirken bir hata oluştu.');
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
        <ERPPageLayout
            breadcrumbs={[{ label: 'Tedarik' }, { label: 'Tedarik & Stok Yönetimi', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<Plus size={13} />} label="Hızlı Stok Fişi" onClick={() => setIsAddStockModalOpen(true)} variant="primary" />
                    <ToolbarBtn icon={<Plus size={13} />} label="Yeni Sevkiyat" onClick={handleOpenDispatchModal} />
                    <ToolbarBtn icon={<Plus size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
        >
            <div className="mx-auto max-w-screen-xl px-3 md:px-4 space-y-5">
                {/* Procurement Orders List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Tedarik Bekleyen Siparişler</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{procurementOrders.length} KAYIT</span>
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
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wide">
                            <tr>
                                <th className="px-4 py-2">Sipariş No</th>
                                <th className="px-4 py-2">Müşteri</th>
                                <th className="px-4 py-2">Ürünler</th>
                                <th className="px-4 py-2">Tarih</th>
                                <th className="px-4 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {procurementOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                        Tedarik bekleyen sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                procurementOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-mono text-[11px]">#{order.id.slice(0, 8)}</td>
                                        <td className="px-4 py-2 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-4 py-2 text-slate-600">
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const dimensions = product?.dimensions 
                                                        ? `${product.dimensions.length}x${product.dimensions.width}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''} mm`
                                                        : '';
                                                    return (
                                                        <div key={idx} className="flex flex-col">
                                                            <span className="font-medium text-slate-800">{product?.name || item.productName}</span>
                                                            {dimensions && <span className="text-[10px] text-slate-500">{dimensions}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewOrder(order)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-[10px] font-semibold"
                                                    aria-label="Sipariş Detaylarını Görüntüle"
                                                >
                                                    <Eye size={14} />
                                                    Görüntüle
                                                </button>
                                                <button
                                                    onClick={() => handleOpenProcurement(order)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-[10px] font-semibold"
                                                    aria-label="Tedarik İşlemleri"
                                                >
                                                    <Network size={14} />
                                                    Tedarik
                                                </button>
                                                <button
                                                    onClick={() => handleViewRawMaterials(order)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors text-[10px] font-semibold ${
                                                        order.stockUsage && Object.keys(order.stockUsage).length > 0
                                                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                            : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                                                    }`}
                                                    aria-label="Kullanılan Hammaddeler"
                                                >
                                                    <Package size={14} />
                                                    Hammaddeler
                                                </button>
                                                <button
                                                    onClick={() => handleProcurementStatusChange(order.id, 'completed')}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-[10px] font-semibold"
                                                    aria-label="Tedarik İşlemini Tamamla"
                                                >
                                                    <CheckCircle2 size={14} />
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

            {/* Sevk Edilen Ürünler */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Sevk Edilen Ürünler</span>
                    <button
                        onClick={handleOpenDispatchModal}
                        className="flex items-center gap-2 px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-[10px] uppercase"
                        aria-label="Yeni Sevkiyat"
                        title="Yeni Sevkiyat"
                    >
                        <Plus size={12} />
                        Yeni
                    </button>
                </div>

                {dispatchesLoading ? (
                    <div className="p-5 text-slate-500 text-xs">Yükleniyor...</div>
                ) : dispatches.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">Henüz sevk kaydı bulunmuyor.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wide">
                                <tr>
                                    <th className="px-4 py-2">Fiş No</th>
                                    <th className="px-4 py-2">Ürünler</th>
                                    <th className="px-4 py-2">Sipariş Kodları</th>
                                    <th className="px-4 py-2">Sevk Tarihi</th>
                                    <th className="px-4 py-2">Toplam Levha</th>
                                    <th className="px-4 py-2">Toplam İş</th>
                                    <th className="px-4 py-2 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {dispatches.map(d => {
                                    const uniqProductNames = Array.from(new Set((d.lines || []).map(l => l.productName).filter(Boolean)));
                                    const uniqOrderCodes = Array.from(new Set((d.lines || []).map(l => l.orderId).filter(Boolean))).map(id => id.slice(0, 8));
                                    const totalPlate = (d.lines || []).reduce((acc, l) => acc + (Number(l.plateQuantity) || 0), 0);
                                    const totalPrintQty = (d.lines || []).reduce((acc, l) => acc + (Number(l.printQuantity) || 0), 0);
                                    const totalJob = totalPlate * totalPrintQty;
                                    const reqs = dispatchChangeRequests
                                        .filter(r => r.dispatchId === d.id)
                                        .slice()
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                    const hasPending = reqs.some(r => r.status === 'pending');
                                    const hasApproved = reqs.some(r => r.status === 'approved');
                                    const canEdit = hasApproved;

                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2 font-mono text-[11px]">{d.id}</td>
                                            <td className="px-4 py-2">
                                                <div className="max-w-[360px] truncate" title={uniqProductNames.join(', ')}>
                                                    {uniqProductNames.join(', ') || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="font-mono text-[11px] max-w-[240px] truncate" title={uniqOrderCodes.join(', ')}>
                                                    {uniqOrderCodes.join(', ') || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">{d.dispatchDate || '-'}</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800">{totalPlate}</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800">{totalJob}</td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDispatchView(d)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Görüntüle"
                                                        aria-label="Görüntüle"
                                                    >
                                                        <FileText size={16} />
                                                    </button>

                                                    {canEdit ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditDispatch(d)}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Düzenle"
                                                            aria-label="Düzenle"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    ) : hasPending ? (
                                                        <span className="px-2.5 py-1.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                                                            Onay Bekliyor
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenChangeRequestModal(d)}
                                                            className="px-2.5 py-1.5 text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                                                            title="Değişiklik Onayı İste"
                                                            aria-label="Değişiklik Onayı İste"
                                                        >
                                                            <AlertTriangle size={14} />
                                                            Değişiklik Onayı İste
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stock Management Section */}
            <div className="space-y-4">
                <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between rounded-t-xl">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Stok Listesi</span>
                    <button
                        onClick={() => setIsAddStockModalOpen(true)}
                        className="flex items-center gap-2 px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-semibold text-[10px] uppercase"
                        aria-label="Stok Ekle"
                    >
                        <Plus size={12} />
                        Ekle
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
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wide">
                                <tr>
                                    <th className="px-4 py-2">Stok No</th>
                                    <th className="px-4 py-2">Firma</th>
                                    <th className="px-4 py-2">Ürün</th>
                                    <th className="px-4 py-2">Miktar</th>
                                    <th className="px-4 py-2">Kayıt Tarihi</th>
                                    <th className="px-4 py-2 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {stockItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                            Henüz stok kaydı bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    stockItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2 font-mono text-[11px]">{item.stockNumber}</td>
                                            <td className="px-4 py-2 font-medium text-slate-800">{item.company}</td>
                                            <td className="px-4 py-2">{item.product}</td>
                                            <td className="px-4 py-2 font-semibold text-emerald-600">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500">
                                                {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleQuickAddClick(item)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Stok Ekle"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteStockItem(item.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={14} />
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
                theme="minimal"
                size="xl"
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
                theme="minimal"
                size="lg"
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
                theme="minimal"
                size="lg"
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
                theme="minimal"
                size="xl"
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
                theme="minimal"
                size="md"
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
                theme="minimal"
                size="sm"
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
                theme="minimal"
                size="sm"
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
            <Modal
                isOpen={isDispatchModalOpen}
                onClose={() => setIsDispatchModalOpen(false)}
                title={dispatchMode === 'edit' ? 'Sevkiyat Düzenle' : 'Yeni Sevkiyat'}
                size="xl"
                theme="minimal"
            >
                <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Fiş No</label>
                                <input
                                    type="text"
                                    value={dispatchForm.id}
                                    readOnly
                                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-main)] font-mono text-sm text-[var(--text-main)]"
                                    aria-label="Fiş Numarası"
                                    title="Fiş Numarası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Sevk Araç Plakası</label>
                                <input
                                    type="text"
                                    value={dispatchForm.vehiclePlate}
                                    onChange={e => setDispatchForm(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    placeholder="34 ABC 123"
                                    aria-label="Sevk Araç Plakası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Şöför İsimleri</label>
                                <input
                                    type="text"
                                    value={dispatchForm.driverNames}
                                    onChange={e => setDispatchForm(prev => ({ ...prev, driverNames: e.target.value }))}
                                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    placeholder="Ad Soyad"
                                    aria-label="Şöför İsimleri"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-56">
                            <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Sevk Tarihi</label>
                            <input
                                type="date"
                                value={dispatchForm.dispatchDate}
                                onChange={e => setDispatchForm(prev => ({ ...prev, dispatchDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                aria-label="Sevk Tarihi"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {dispatchForm.lines.map((line, idx) => {
                            const order = dispatchOrderOptions.find(o => o.id === line.orderId);
                            const orderItems = order?.items || [];
                            const productOptions = Array.from(new Set(orderItems.map(i => i.productId))).filter(Boolean);
                            return (
                                <div key={idx} className="border border-[var(--border-subtle)] rounded-2xl p-4 bg-[var(--bg-surface)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-semibold text-[var(--text-main)]">Satır {idx + 1}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-[var(--text-muted)] font-mono">Toplam: {line.total || 0}</div>
                                            {dispatchForm.lines.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDispatchLine(idx)}
                                                    className="px-2 py-1 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                                                    title="Satırı Sil"
                                                    aria-label="Satırı Sil"
                                                >
                                                    Sil
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Sipariş Numarası</label>
                                            <select
                                                value={line.orderId}
                                                onChange={e => handleDispatchOrderSelect(idx, e.target.value)}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Sipariş Numarası"
                                            >
                                                <option value="">Seçiniz</option>
                                                {dispatchOrderOptions.map(o => (
                                                    <option key={o.id} value={o.id}>
                                                        #{o.id.slice(0, 8)} - {o.customerName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Firma</label>
                                            <input
                                                type="text"
                                                value={line.customerName}
                                                readOnly
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)]"
                                                aria-label="Firma Adı"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Ürün Kodu</label>
                                            <select
                                                value={line.productId}
                                                onChange={e => handleDispatchProductSelect(idx, e.target.value)}
                                                disabled={!line.orderId}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-[var(--bg-main)] bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Ürün Kodu"
                                            >
                                                <option value="">Seçiniz</option>
                                                {productOptions.map(pid => {
                                                    const p = products.find(pr => pr.id === pid);
                                                    return (
                                                        <option key={pid} value={pid}>
                                                            {p?.code || '-'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Ürün Adı</label>
                                            <input
                                                type="text"
                                                value={line.productName}
                                                readOnly
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)]"
                                                aria-label="Ürün Adı"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Baskılı Levha Adeti</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={line.plateQuantity || ''}
                                                onChange={e => handleDispatchLineChange(idx, { plateQuantity: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Baskılı Levha Adeti"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Baskı Türü</label>
                                            <select
                                                value={line.printType}
                                                onChange={e => handleDispatchLineChange(idx, { printType: e.target.value as ProcurementDispatchPrintType })}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Baskı Türü"
                                            >
                                                <option value="Gövde">Gövde</option>
                                                <option value="Kapak">Kapak</option>
                                                <option value="Dip">Dip</option>
                                                <option value="Diğer">Diğer</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Baskı Adeti</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={line.printQuantity || ''}
                                                onChange={e => handleDispatchLineChange(idx, { printQuantity: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Baskı Adeti"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Toplam</label>
                                            <input
                                                type="number"
                                                value={line.total || 0}
                                                readOnly
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-main)] font-semibold text-[var(--text-main)]"
                                                aria-label="Toplam"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Levha Ölçüsü</label>
                                            <input
                                                type="text"
                                                value={line.plateSize}
                                                onChange={e => handleDispatchLineChange(idx, { plateSize: e.target.value })}
                                                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                                aria-label="Levha Ölçüsü"
                                                placeholder="Örn: 70x100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleAddDispatchLine}
                            className="w-full px-4 py-3 rounded-2xl border border-[var(--border-subtle)] bg-white/5 hover:bg-white/10 text-[var(--text-main)] text-sm font-semibold"
                            title="Satır Ekle"
                            aria-label="Satır Ekle"
                        >
                            + Satır Ekle
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Açıklamalar</label>
                        <textarea
                            value={dispatchForm.notes}
                            onChange={e => setDispatchForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-24 bg-[var(--bg-surface)] text-[var(--text-main)]"
                            placeholder="Notlar..."
                            aria-label="Açıklamalar"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                        <button
                            type="button"
                            onClick={() => setIsDispatchModalOpen(false)}
                            className="px-4 py-2 text-[var(--text-muted)] hover:bg-white/5 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDispatch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                        >
                            Gönder
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={dispatchViewModal.isOpen}
                onClose={() => setDispatchViewModal({ isOpen: false, dispatch: null })}
                title={`Sevk Fişi #${dispatchViewModal.dispatch?.id || ''}`}
                size="xl"
                theme="minimal"
            >
                {dispatchViewModal.dispatch && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="text-xs text-slate-500">Sevk Tarihi</div>
                                <div className="font-semibold text-slate-800">{dispatchViewModal.dispatch.dispatchDate}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="text-xs text-slate-500">Araç / Şöför</div>
                                <div className="font-semibold text-slate-800">
                                    {(dispatchViewModal.dispatch.vehiclePlate || '-')}{dispatchViewModal.dispatch.driverNames ? ` • ${dispatchViewModal.dispatch.driverNames}` : ''}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-semibold text-slate-800">Kalemler</div>
                            <div className="divide-y divide-slate-200">
                                {(dispatchViewModal.dispatch.lines || []).map((l, idx) => (
                                    <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <div className="text-xs text-slate-500">Sipariş</div>
                                            <div className="font-mono text-xs text-slate-800">{(l.orderId || '').slice(0, 8) || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Firma</div>
                                            <div className="font-medium text-slate-800">{l.customerName || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Ürün</div>
                                            <div className="font-medium text-slate-800">{l.productCode ? `${l.productCode} - ${l.productName}` : (l.productName || '-')}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Baskı</div>
                                            <div className="font-medium text-slate-800">{l.printType || '-'} • {l.plateQuantity} levha • {l.printQuantity} adet • Toplam {l.total}</div>
                                            {l.plateSize && <div className="text-xs text-slate-500 mt-0.5">Levha Ölçüsü: {l.plateSize}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <div className="text-xs text-slate-500 mb-1">Açıklamalar</div>
                            <div className="text-slate-800 whitespace-pre-wrap">{dispatchViewModal.dispatch.notes || '-'}</div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={changeRequestModal.isOpen}
                onClose={() => setChangeRequestModal({ isOpen: false, dispatch: null, reason: '' })}
                title={`Değişiklik Onayı İste #${changeRequestModal.dispatch?.id || ''}`}
                size="md"
                theme="minimal"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
                        Bu form değişikliği için Genel Müdür onayı gereklidir. Onay gelmeden düzenleme yapılamaz.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <textarea
                            value={changeRequestModal.reason}
                            onChange={(e) => setChangeRequestModal(prev => ({ ...prev, reason: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 min-h-28"
                            placeholder="Neden değiştirmek istiyorsunuz?"
                            aria-label="Değişiklik Açıklaması"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setChangeRequestModal({ isOpen: false, dispatch: null, reason: '' })}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitChangeRequest}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Gönder
                        </button>
                    </div>
                </div>
            </Modal>
            </div> {/* Closing space-y-6 */}
        </ERPPageLayout>
    );
}
