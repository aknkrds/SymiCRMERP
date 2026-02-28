import React, { useState, useEffect } from 'react';
import { 
    Plus, Clock, X, 
    Users, Play, Square, Timer,
    Factory, Truck, Eye, CheckCircle
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { useStock } from '../hooks/useStock';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { useProducts } from '../hooks/useProducts';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Personnel, Machine, Shift, PersonnelFormData, MachineFormData, ShiftFormData, Product } from '../types';

const API_URL = '/api';

const PRODUCTION_STATUSES = [
    { value: 'production_planned', label: 'Üretim Planlaması Yapılıyor' },
    { value: 'production_started', label: 'Üretim Başladı' },
    { value: 'production_completed', label: 'Üretim Tamamlandı' },
    { value: 'invoice_pending', label: 'Fatura ve İrsaliye Bekleniyor' }
];

interface ShiftCardProps {
    shift: Shift;
    orders: Order[];
    machines: Machine[];
    personnel: Personnel[];
    onSelect: (shift: Shift) => void;
}

const ShiftCard = ({ shift, orders, machines, personnel, onSelect }: ShiftCardProps) => {
    const order = orders.find(o => o.id === shift.orderId);
    const machine = machines.find(m => m.id === shift.machineId);
    const supervisor = personnel.find(p => p.id === shift.supervisorId);
    
    const isStarted = shift.status === 'active';
    const isCompleted = shift.status === 'completed';

    // Calculate time remaining or duration
    const start = new Date(shift.startTime);
    const end = shift.endTime ? new Date(shift.endTime) : new Date(); // Handle null endTime
    const now = new Date();
    
    // Safety check for invalid dates
    if (isNaN(start.getTime())) {
        console.error('Invalid start time for shift:', shift);
        return null;
    }

    let timeDisplay = '';
    if (isStarted) {
        // Safe check for end date validity if needed, but end is handled above
        const targetEnd = shift.endTime ? new Date(shift.endTime) : null;
        if (targetEnd && !isNaN(targetEnd.getTime())) {
             const minutesLeft = differenceInMinutes(targetEnd, now);
             const hours = Math.floor(minutesLeft / 60);
             const mins = minutesLeft % 60;
             timeDisplay = minutesLeft > 0 ? `${hours}sa ${mins}dk kaldı` : 'Süre doldu';
        } else {
             timeDisplay = 'Süre belirsiz';
        }
    } else {
        const endTimeStr = shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : '?';
        timeDisplay = `${format(start, 'HH:mm')} - ${endTimeStr}`;
    }

    return (
        <div 
            onClick={() => onSelect(shift)}
            className={`
                p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
                ${isStarted ? 'bg-green-50 border-green-200' : 
                  isCompleted ? 'bg-slate-50 border-slate-200 opacity-75' : 
                  'bg-white border-slate-200'}
            `}
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isStarted ? 'bg-green-100 text-green-700' : 
                    isCompleted ? 'bg-slate-200 text-slate-600' : 
                    'bg-amber-100 text-amber-700'
                }`}>
                    {isStarted ? 'Üretimde' : isCompleted ? 'Tamamlandı' : 'Planlandı'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                    {format(start, 'dd MMM', { locale: tr })}
                </span>
            </div>
            
            <h4 className="font-medium text-slate-800 mb-1 truncate" title={order?.customerName}>
                {order?.customerName || 'Bilinmeyen Müşteri'}
            </h4>
            <p className="text-sm text-slate-600 mb-3 truncate">
                {machine?.machineNumber ? `${machine.machineNumber} - ${machine.features}` : 'Makine Seçilmedi'}
            </p>
            <div className="text-xs text-slate-500 mb-2 truncate">
                {supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : 'Atanmamış'}
            </div>

            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={14} />
                    <span>{timeDisplay}</span>
                </div>
                {isStarted && (
                    <div className="flex items-center gap-1.5 text-green-600 font-medium">
                        <Timer size={14} />
                        <span className="animate-pulse">Aktif</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function Production() {
    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);

    // Modal States
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isShiftDetailModalOpen, setIsShiftDetailModalOpen] = useState(false);
    const [isPersonnelListModalOpen, setIsPersonnelListModalOpen] = useState(false);
    const [isMachineListModalOpen, setIsMachineListModalOpen] = useState(false);
    
    // Incoming Orders Modal State
    const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
    const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
    const [stockEntryDetails, setStockEntryDetails] = useState<Record<string, { plate: number; body: number; lid: number; bottom: number }>>({});
    const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
    const { products } = useProducts();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    
    // Start/Resume Shift States
    const [showStartPrompt, setShowStartPrompt] = useState(false);
    const [startProductionQty, setStartProductionQty] = useState<string>('');

    // Start Production Modal State (New)
    const [isStartProductionModalOpen, setIsStartProductionModalOpen] = useState(false);
    const [selectedProductionItem, setSelectedProductionItem] = useState<{order: Order, item: any} | null>(null);
    const [productionFormData, setProductionFormData] = useState({
        machineId: '',
        targetQuantity: 0,
        predictedScrap: 0
    });

    const handleOpenStartProduction = (order: Order, item: any) => {
        setSelectedProductionItem({ order, item });
        setProductionFormData({
            machineId: '',
            targetQuantity: item.quantity, // Default to order quantity
            predictedScrap: 0
        });
        setIsStartProductionModalOpen(true);
    };

    const handleStartProductionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductionItem) return;

        // Logic to start production (e.g., create a planned shift or update status)
        // For now, we'll just alert as it's a template, or create a shift if that's the intent.
        // User said: "üretime başla butonu... basıldığında üretim hattı seçilecek... hedef adet... öngörülen fire..."
        // This maps well to creating a 'Shift' in 'planned' state or 'active' state.
        // Let's create a Shift.
        
        try {
            await fetch(`${API_URL}/shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    orderId: selectedProductionItem.order.id,
                    machineId: productionFormData.machineId,
                    // supervisorId: currentUser?.id, // We might need this later
                    personnelIds: [], // Can be added later
                    startTime: new Date().toISOString(),
                    endTime: null, // Open ended
                    plannedQuantity: productionFormData.targetQuantity,
                    producedQuantity: 0,
                    scrapQuantity: 0,
                    status: 'active', // Immediately active? Or planned? User said "Start Production", implies active.
                    createdAt: new Date().toISOString()
                })
            });

            // Update order status if needed
            if (selectedProductionItem.order.status === 'production_planned') {
                await handleProductionStatusChange(selectedProductionItem.order.id, 'production_started');
            }

            setIsStartProductionModalOpen(false);
            alert('Üretim başlatıldı.');
            fetchData();
        } catch (error) {
            console.error('Error starting production:', error);
            alert('Üretim başlatılamadı.');
        }
    };


    // Form States
    const [newPersonnel, setNewPersonnel] = useState<PersonnelFormData>({
        firstName: '', lastName: '', role: ''
    });
    const [newMachine, setNewMachine] = useState<MachineFormData>({
        machineNumber: '', features: '', maintenanceInterval: '', lastMaintenance: ''
    });
    const [newShift, setNewShift] = useState<Partial<ShiftFormData>>({
        orderId: '', machineId: '', supervisorId: '', personnelIds: [],
        startTime: '', endTime: '', plannedQuantity: 0
    });

    // Selection States
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    // Stock Management
    const { stockItems, addStockItem, updateStockQuantity } = useStock();

    // Fetch Data
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, personnelRes, machinesRes, shiftsRes] = await Promise.all([
                fetch(`${API_URL}/orders`),
                fetch(`${API_URL}/personnel`),
                fetch(`${API_URL}/machines`),
                fetch(`${API_URL}/shifts`)
            ]);

            if (ordersRes.ok) {
                const data = await ordersRes.json();
                setOrders(Array.isArray(data) ? data : []);
            }
            if (personnelRes.ok) {
                const data = await personnelRes.json();
                setPersonnel(Array.isArray(data) ? data : []);
            }
            if (machinesRes.ok) {
                const data = await machinesRes.json();
                setMachines(Array.isArray(data) ? data : []);
            }
            if (shiftsRes.ok) {
                const data = await shiftsRes.json();
                setShifts(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    // Incoming Orders Logic
    const incomingOrders = orders.filter(o => o.status === 'production_pending' || o.status === 'supply_completed');

    const handleViewIncomingOrder = (order: Order) => {
        setSelectedOrderDetail(order);
        setIsOrderDetailModalOpen(true);
    };

    const handleViewProduct = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        setSelectedProduct(product);
        setIsProductModalOpen(true);
    };
    const handleApproveIncomingOrder = (order: Order) => {
        setIncomingOrder(order);
        // Initialize with existing procurement details or empty structure for each product
        const initialDetails: Record<string, { plate: number; body: number; lid: number; bottom: number }> = {};
        
        if (order.procurementDetails) {
            // If we have procurement details (new format), use them
            // Check if it's the new format (Record) or old format (flat object - legacy support if needed)
            if (order.procurementDetails.body !== undefined && typeof order.procurementDetails.body === 'number') {
                 // Legacy format (flat) - map to first product or handle gracefully?
                 // For now, let's assume new format or migrate old data on the fly if needed.
                 // Actually, let's just use the new format. The old format won't work well here.
                 // We can try to map it to the first product if it exists.
                 if (order.items && order.items.length > 0 && order.items[0].productId) {
                     initialDetails[order.items[0].productId] = {
                         plate: (order.procurementDetails as any).plate || 0,
                         body: (order.procurementDetails as any).body || 0,
                         lid: (order.procurementDetails as any).lid || 0,
                         bottom: (order.procurementDetails as any).bottom || 0
                     };
                 }
            } else {
                // New format (Record<string, ...>)
                Object.assign(initialDetails, order.procurementDetails);
            }
        } else {
            // Initialize empty for all products
            order.items.forEach(item => {
                if (item.productId) {
                    initialDetails[item.productId] = { plate: 0, body: 0, lid: 0, bottom: 0 };
                }
            });
        }
        
        setStockEntryDetails(initialDetails);
        setIsStockEntryModalOpen(true);
    };

    const handleSaveStockEntry = async () => {
        if (!incomingOrder) return;

        try {
            const productionApprovedDetails: Record<string, { plate: number; body: number; lid: number; bottom: number }> = {};
            const productionDiffs: Record<string, { plate: number; body: number; lid: number; bottom: number }> = {};
            // Create Stock Items for each product
            for (const [productId, details] of Object.entries(stockEntryDetails)) {
                const product = incomingOrder.items.find(item => item.productId === productId);
                const productName = product?.productName || 'Bilinmeyen Ürün';
                const original = (incomingOrder.procurementDetails && incomingOrder.procurementDetails[productId]) || { plate: 0, body: 0, lid: 0, bottom: 0 };
                productionApprovedDetails[productId] = { ...details };
                productionDiffs[productId] = {
                    plate: (details.plate || 0) - (original.plate || 0),
                    body: (details.body || 0) - (original.body || 0),
                    lid: (details.lid || 0) - (original.lid || 0),
                    bottom: (details.bottom || 0) - (original.bottom || 0),
                };
                
                const items = [
                    { type: 'Levha', quantity: details.plate },
                    { type: 'Gövde', quantity: details.body },
                    { type: 'Kapak', quantity: details.lid },
                    { type: 'Dip', quantity: details.bottom }
                ];

                for (const item of items) {
                    if (item.quantity > 0) {
                        await addStockItem({
                            stockNumber: `${incomingOrder.id}-${productId}-${item.type}`, // Unique stock number per product component
                            company: incomingOrder.customerName,
                            product: `${productName} - ${item.type}`,
                            quantity: item.quantity,
                            unit: 'Adet',
                            category: 'Yarı Mamul', // Changed to 'Yarı Mamul' as it's more appropriate for intermediate goods
                            productId: productId,
                            notes: `Sipariş: ${incomingOrder.id} - Tedarikten Gelen ${item.type}`
                        } as any);
                    }
                }
            }

            // Update Order Status
            await fetch(`${API_URL}/orders/${incomingOrder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'production_planned',
                    productionStatus: 'production_planned',
                    productionApprovedDetails,
                    productionDiffs
                })
            });

            setIsStockEntryModalOpen(false);
            setIncomingOrder(null);
            fetchData(); // Refresh list
            alert('Stok girişi yapıldı ve sipariş üretim planlamasına alındı.');
        } catch (error) {
            console.error('Error saving stock entry:', error);
            alert('Stok girişi yapılırken bir hata oluştu.');
        }
    };

    // Actions
    const handleProductionStatusChange = async (orderId: string, status: string) => {
        try {
            // Update specific production status
            await fetch(`${API_URL}/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productionStatus: status })
            });

            // Update main status based on selection
            let mainStatus = '';
            if (status === 'production_started') mainStatus = 'production_started';
            if (status === 'production_completed') mainStatus = 'production_completed';
            if (status === 'invoice_pending') mainStatus = 'invoice_added'; // Assuming mapping
            
            if (mainStatus) {
                await fetch(`${API_URL}/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: mainStatus })
                });
            }

            // Handle Stock Updates when Production is Completed
            if (status === 'production_completed') {
                const order = orders.find(o => o.id === orderId);
                const totals = getOrderTotals(orderId);

                if (order && totals.produced > 0) {
                    // Add Finished Product to Stock
                    const productName = order.items?.map(i => i.productName).join(', ') || order.customerName + ' Ürünü';
                    
                    // Check if this specific order product already exists in stock (to avoid duplicates if clicked multiple times)
                    // We use orderId as stockNumber for uniqueness as requested
                    const existingProductStock = stockItems.find(i => i.stockNumber === orderId);

                    if (existingProductStock) {
                        // If exists, maybe update quantity? Or do nothing?
                        // User said: "girişi yapılsın". If already entered, we shouldn't duplicate.
                        // But if they are correcting status, maybe we should be careful.
                        // For now, if it exists, we assume it's already processed or we add difference?
                        // Safest is to check if we should add.
                        // But simplistic approach: Check if exists. If not, add. If yes, maybe alert?
                        // Given "production_completed" can be toggled, this is risky.
                        // However, user asked to add it.
                        // Let's check if the quantity matches.
                        // Better: Just add if it doesn't exist. If it exists, assume it's done.
                        // Or better: Use updateStockQuantity with deduct: -totals.produced if it exists? 
                        // No, if it exists, it means we already created it.
                        // Let's create it if it doesn't exist.
                        if (existingProductStock.quantity !== totals.produced) {
                             // Maybe update quantity to match produced total?
                             // await updateStockQuantity(existingProductStock.id, { quantity: totals.produced });
                        }
                    } else {
                        await addStockItem({
                            product: productName,
                            company: order.customerName,
                            stockNumber: orderId, // Reference Order ID
                            category: 'finished',
                            quantity: totals.produced,
                            unit: 'Adet'
                        });
                    }
                }

                if (totals.scrap > 0) {
                    // Add Scrap to General Scrap Stock
                    // Find generic 'Hurda' item
                    const scrapItem = stockItems.find(i => i.product === 'Genel Hurda' || (i.category === 'scrap' && i.stockNumber === 'HURDA-GENEL'));
                    
                    if (scrapItem) {
                        // Add to existing scrap stock
                        await updateStockQuantity(scrapItem.id, { deduct: -totals.scrap });
                    } else {
                        // Create new scrap stock
                        await addStockItem({
                            stockNumber: 'HURDA-GENEL',
                            company: 'İşletme İçi',
                            product: 'Genel Hurda',
                            category: 'scrap',
                            quantity: totals.scrap,
                            unit: 'Adet'
                        });
                    }
                }
            }

            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const addPersonnel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : Date.now().toString(36) + Math.random().toString(36).substring(2);
                
            const res = await fetch(`${API_URL}/personnel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPersonnel,
                    id: newId,
                    createdAt: new Date().toISOString()
                })
            });

            if (!res.ok) {
                throw new Error('Personel eklenemedi');
            }

            setIsPersonnelModalOpen(false);
            setNewPersonnel({ firstName: '', lastName: '', role: '' });
            await fetchData();
            alert('Personel başarıyla eklendi.');
        } catch (error) {
            console.error('Error adding personnel:', error);
            alert('Personel eklenirken bir hata oluştu.');
        }
    };

    const addMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Date.now().toString(36) + Math.random().toString(36).substring(2);
                
            await fetch(`${API_URL}/machines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newMachine,
                    id: newId,
                    createdAt: new Date().toISOString()
                })
            });
            setIsMachineModalOpen(false);
            setNewMachine({ machineNumber: '', features: '', maintenanceInterval: '', lastMaintenance: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding machine:', error);
        }
    };

    const createShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShift.orderId || !newShift.machineId || !newShift.supervisorId) return;

        try {
            const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Date.now().toString(36) + Math.random().toString(36).substring(2);

            await fetch(`${API_URL}/shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newShift,
                    id: newId,
                    status: 'planned',
                    producedQuantity: 0,
                    scrapQuantity: 0,
                    createdAt: new Date().toISOString()
                })
            });
            setIsShiftModalOpen(false);
            setNewShift({
                orderId: '', machineId: '', supervisorId: '', personnelIds: [],
                startTime: '', endTime: '', plannedQuantity: 0
            });
            fetchData();
        } catch (error) {
            console.error('Error creating shift:', error);
        }
    };

    const updateShift = async (id: string, updates: Partial<Shift>) => {
        try {
            await fetch(`${API_URL}/shifts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (selectedShift && selectedShift.id === id) {
                setSelectedShift(prev => prev ? { ...prev, ...updates } : null);
            }
            fetchData();
        } catch (error) {
            console.error('Error updating shift:', error);
        }
    };

    // Filtered Lists
    const productionOrders = orders.filter(o => 
        ['production_planned', 'production_started'].includes(o.status) ||
        o.status === 'supply_completed' ||
        o.procurementStatus === 'shipped_to_production'
    );

    const completedProductionOrders = orders.filter(o => o.status === 'production_completed');

    const otherOrders = orders.filter(o => 
        !productionOrders.find(po => po.id === o.id) && 
        !completedProductionOrders.find(cpo => cpo.id === o.id)
    );

    const activeProductionOrders = orders.filter(o => {
        const orderShifts = shifts.filter(s => s.orderId === o.id);
        const hasActiveShifts = orderShifts.some(s => s.status === 'active');
        return hasActiveShifts || o.productionStatus === 'production_started';
    });

    const getOrderTotals = (orderId: string) => {
        const orderShifts = shifts.filter(s => s.orderId === orderId && s.status === 'completed');
        return orderShifts.reduce((acc, s) => ({
            produced: acc.produced + (s.producedQuantity || 0),
            scrap: acc.scrap + (s.scrapQuantity || 0)
        }), { produced: 0, scrap: 0 });
    };

    // Flatten orders to items for "Production Stocks" list (New)
    const productionStockItems = productionOrders.flatMap(order => 
        order.items.map(item => {
             const totals = getOrderTotals(order.id);
             return {
                 order,
                 item,
                 approvedDetails: order.productionApprovedDetails?.[item.productId],
                 produced: totals.produced, // Currently per order
                 scrap: totals.scrap // Currently per order
             };
        })
    );

    const handleContinueProduction = async (order: Order) => {
        const totals = getOrderTotals(order.id);
        const targetQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);

        if (totals.produced >= targetQuantity) {
            if (!confirm('Siparişteki toplam üretim adeti tamamlandı. Gene de üretime devam etmek istiyor musunuz?')) {
                return;
            }
        }

        // Set status back to production_started to allow new shifts
        await handleProductionStatusChange(order.id, 'production_started');
    };

    const handleStartShift = () => {
        if (!selectedShift) return;
        
        const qty = parseFloat(startProductionQty);
        if (isNaN(qty) || qty < 0) {
            alert('Lütfen geçerli bir üretim adeti giriniz.');
            return;
        }

        updateShift(selectedShift.id, { 
            status: 'active',
            producedQuantity: qty
        });
        
        setShowStartPrompt(false);
        setStartProductionQty('');
    };

    // Render Helpers


    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Üretim Yönetimi</h1>
            </div>

            {/* Incoming Orders Section (From Procurement) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                    <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                        <Truck size={20} />
                        Tedarikten Gelen Siparişler (Onay Bekleyen)
                    </h2>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                        {incomingOrders.length}
                    </span>
                </div>
                
                {/* Mobile View */}
                <div className="md:hidden">
                    {incomingOrders.length === 0 ? (
                         <div className="p-8 text-center text-slate-500">
                            Onay bekleyen sipariş bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {incomingOrders.map(order => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</span>
                                        <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Bekliyor</span>
                                    </div>
                                    <h3 className="font-medium text-slate-800">{order.customerName}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <button type="button" onClick={() => handleViewIncomingOrder(order)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Gözat</button>
                                        <button type="button" onClick={() => handleApproveIncomingOrder(order)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Onayla & Stok Girişi</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Ürün Detayı</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {incomingOrders.map(order => (
                                <tr key={order.id} className="hover:bg-amber-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            {order.items.map((item, index) => {
                                                const product = products.find(p => p.id === item.productId);
                                                // User requested to hide product code and only show name and dimensions
                                                const rawName = product?.name || item.productName;
                                                // Try to strip code if it follows pattern "CODE - NAME"
                                                const nameParts = rawName.split(' - ');
                                                const displayName = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : rawName;
                                                
                                                const dims = product?.dimensions 
                                                    ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.depth} mm`
                                                    : '-';
                                                    
                                                return (
                                                    <div key={index} className="flex flex-col">
                                                        <span className="font-medium text-slate-900">{displayName}</span>
                                                        <span className="text-xs text-slate-500">
                                                            {dims}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => handleViewIncomingOrder(order)}
                                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Detayları Gör"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleApproveIncomingOrder(order)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-xs"
                                            >
                                                <CheckCircle size={14} />
                                                Onayla
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {incomingOrders.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Onay bekleyen tedarik siparişi bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Production Stocks Section (New) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Üretim İçin Bekleyen Stoklar</h2>
                </div>
                
                {/* Desktop View (Table) */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Ürün Adı</th>
                                <th className="px-6 py-4">Ölçüler</th>
                                <th className="px-6 py-4">Adet</th>
                                <th className="px-6 py-4">Sipariş Kodu</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Üretilen</th>
                                <th className="px-6 py-4">Kalan</th>
                                <th className="px-6 py-4">Fire</th>
                                <th className="px-6 py-4">Gövde</th>
                                <th className="px-6 py-4">Kapak</th>
                                <th className="px-6 py-4">Dip</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {productionStockItems.map((entry, index) => {
                                const product = products.find(p => p.id === entry.item.productId);
                                // User requested to hide product code and only show name
                                const rawName = product?.name || entry.item.productName;
                                const nameParts = rawName.split(' - ');
                                const displayName = nameParts.length > 1 ? nameParts.slice(1).join(' - ') : rawName;
                                
                                const dims = product?.dimensions 
                                    ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.depth} mm`
                                    : '-';

                                return (
                                <tr key={`${entry.order.id}-${entry.item.productId || index}`} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono">{index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{displayName}</td>
                                    <td className="px-6 py-4 text-xs">{dims}</td>
                                    <td className="px-6 py-4">{entry.item.quantity}</td>
                                    <td className="px-6 py-4 font-mono text-xs">#{entry.order.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4">{entry.order.customerName}</td>
                                    <td className="px-6 py-4 text-green-600 font-medium">{entry.produced || 0}</td>
                                    <td className="px-6 py-4 text-amber-600 font-medium">
                                        {Math.max(0, entry.item.quantity - (entry.produced || 0))}
                                    </td>
                                    <td className="px-6 py-4 text-red-600">{entry.scrap || 0}</td>
                                    <td className="px-6 py-4">{entry.approvedDetails?.body || '-'}</td>
                                    <td className="px-6 py-4">{entry.approvedDetails?.lid || '-'}</td>
                                    <td className="px-6 py-4">{entry.approvedDetails?.bottom || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => entry.item.productId && handleViewProduct(entry.item.productId)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Ürünü Görüntüle"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleOpenStartProduction(entry.order, entry.item)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                                                title="Üretime Başla"
                                            >
                                                <Play size={14} />
                                                Başla
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {productionStockItems.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="px-6 py-8 text-center text-slate-500">
                                        Üretim için bekleyen stok bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Production Orders Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Üretim Bekleyen Siparişler</h2>
                </div>
                
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {productionOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Üretim bekleyen sipariş bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {productionOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            {order.status === 'production_planned' ? 'Planlamada' :
                                             order.status === 'production_started' ? 'Üretimde' :
                                             order.status === 'production_completed' ? 'Tamamlandı' : order.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <div>Tedarik: {order.procurementDate ? format(new Date(order.procurementDate), 'dd MMM yyyy', { locale: tr }) : '-'}</div>
                                    </div>

                                    {/* Approved Details for Mobile */}
                                    {order.productionApprovedDetails && (
                                        <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-2">
                                            <div className="font-medium text-slate-700 border-b border-slate-200 pb-1">Onaylanan Detaylar</div>
                                            {Object.entries(order.productionApprovedDetails).map(([productId, details]) => {
                                                const product = order.items.find(i => i.productId === productId);
                                                return (
                                                    <div key={productId} className="pl-2 border-l-2 border-indigo-300">
                                                        <div className="font-medium text-indigo-900 mb-0.5">{product?.productName || 'Ürün'}</div>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-600">
                                                            <span>Levha: {details.plate}</span>
                                                            <span>Gövde: {details.body}</span>
                                                            <span>Kapak: {details.lid}</span>
                                                            <span>Dip: {details.bottom}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <select
                                            value={order.productionStatus || 'production_planning'}
                                            onChange={(e) => handleProductionStatusChange(order.id, e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                            aria-label="Üretim Durumu Seçimi"
                                        >
                                            {PRODUCTION_STATUSES.map(status => (
                                                <option key={status.value} value={status.value}>{status.label}</option>
                                            ))}
                                        </select>
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
                                <th className="px-6 py-4">Tedarik Tarihi</th>
                                <th className="px-6 py-4">Onaylanan Detaylar</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4">Üretim Durumu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {productionOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                    <td className="px-6 py-4">
                                        {order.procurementDate ? format(new Date(order.procurementDate), 'dd MMM yyyy', { locale: tr }) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2 max-w-xs">
                                            {order.productionApprovedDetails ? (
                                                Object.entries(order.productionApprovedDetails).map(([productId, details]) => {
                                                    const product = order.items.find(i => i.productId === productId);
                                                    return (
                                                        <div key={productId} className="text-xs border-l-2 border-indigo-200 pl-2">
                                                            <div className="font-semibold text-slate-700 mb-0.5">{product?.productName || 'Ürün'}</div>
                                                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-500">
                                                                <span>Levha: {details.plate}</span>
                                                                <span>Gövde: {details.body}</span>
                                                                <span>Kapak: {details.lid}</span>
                                                                <span>Dip: {details.bottom}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Detay bulunamadı</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            {order.status === 'production_planned' ? 'Planlamada' :
                                             order.status === 'production_started' ? 'Üretimde' :
                                             order.status === 'production_completed' ? 'Tamamlandı' : order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.productionStatus || 'production_planning'}
                                            onChange={(e) => handleProductionStatusChange(order.id, e.target.value)}
                                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                            aria-label="Üretim Durumu Seçimi"
                                        >
                                            {PRODUCTION_STATUSES.map(status => (
                                                <option key={status.value} value={status.value}>{status.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Middle Section: Active Production List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Aktif Üretim Listesi</h2>
                </div>
                
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {activeProductionOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Şu anda aktif üretim bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {activeProductionOrders.map((order) => {
                                const totals = getOrderTotals(order.id);
                                const activeShifts = shifts.filter(s => s.orderId === order.id && s.status === 'active').length;
                                return (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                                <div className="font-medium text-slate-800">{order.customerName}</div>
                                            </div>
                                            {activeShifts > 0 ? (
                                                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                    {activeShifts} Vardiya
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Aktif vardiya yok</span>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-xs text-slate-500">Üretilen</div>
                                                <div className="font-semibold text-emerald-600">{totals.produced}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-xs text-slate-500">Fire</div>
                                                <div className="font-semibold text-red-600">{totals.scrap}</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                            <button 
                                                type="button"
                                                onClick={() => handleProductionStatusChange(order.id, 'production_completed')}
                                                className="px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex-1"
                                                aria-label="Üretimi Tamamla"
                                            >
                                                Tamamlandı
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleProductionStatusChange(order.id, 'production_cancelled')}
                                                className="px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex-1"
                                                aria-label="Üretimi İptal Et"
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş</th>
                                <th className="px-6 py-4">Toplam Üretilen</th>
                                <th className="px-6 py-4">Toplam Fire</th>
                                <th className="px-6 py-4">Aktif Vardiyalar</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {activeProductionOrders.map((order) => {
                                const totals = getOrderTotals(order.id);
                                const activeShifts = shifts.filter(s => s.orderId === order.id && s.status === 'active').length;
                                return (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{order.customerName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{order.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-emerald-600">{totals.produced} Adet</td>
                                        <td className="px-6 py-4 text-red-600">{totals.scrap} Adet</td>
                                        <td className="px-6 py-4">
                                            {activeShifts > 0 ? (
                                                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                    </span>
                                                    {activeShifts} Vardiya Aktif
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Aktif vardiya yok</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleProductionStatusChange(order.id, 'production_completed')}
                                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                    aria-label="Üretimi Tamamla"
                                                >
                                                    Tamamlandı
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleProductionStatusChange(order.id, 'production_cancelled')}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    aria-label="Üretimi İptal Et"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {activeProductionOrders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Şu anda aktif üretim bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Completed Production List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Tamamlanan Üretimler</h2>
                </div>
                
                {/* Mobile View (Cards) */}
                <div className="md:hidden">
                    {completedProductionOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Henüz tamamlanan üretim bulunmuyor.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {completedProductionOrders.map((order) => {
                                const totals = getOrderTotals(order.id);
                                const targetQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
                                const isTargetReached = totals.produced >= targetQuantity;

                                return (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                                <div className="font-medium text-slate-800">{order.customerName}</div>
                                            </div>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                Tamamlandı
                                            </span>
                                        </div>
                                        
                                        <div className="text-sm text-slate-600">
                                            <span className="font-medium">Ürünler:</span> {order.items.map(i => i.productName).join(', ')}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-xs text-slate-500">Hedef</div>
                                                <div className="font-medium text-slate-800">{targetQuantity}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-xs text-slate-500">Üretilen</div>
                                                <div className="font-semibold text-emerald-600">{totals.produced}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-xs text-slate-500">Fire</div>
                                                <div className="font-semibold text-red-600">{totals.scrap}</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-slate-100">
                                            <button 
                                                type="button"
                                                onClick={() => handleContinueProduction(order)}
                                                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                                    isTargetReached 
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                }`}
                                                aria-label="Siparişi Devam Et"
                                            >
                                                <Play size={16} />
                                                Siparişi Devam Et
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş Kodu</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Ürün</th>
                                <th className="px-6 py-4">Üretim Durumu</th>
                                <th className="px-6 py-4">Termin Tarihi</th>
                                <th className="px-6 py-4">Hedeflenen</th>
                                <th className="px-6 py-4">Üretilen</th>
                                <th className="px-6 py-4">Toplam Fire</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {completedProductionOrders.map((order) => {
                                const totals = getOrderTotals(order.id);
                                const targetQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
                                const isTargetReached = totals.produced >= targetQuantity;

                                return (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {order.items.map(i => i.productName).join(', ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                Tamamlandı
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.deadline ? format(new Date(order.deadline), 'dd MMM yyyy', { locale: tr }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{targetQuantity}</td>
                                        <td className="px-6 py-4 font-semibold text-emerald-600">{totals.produced}</td>
                                        <td className="px-6 py-4 text-red-600">{totals.scrap}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                type="button"
                                                onClick={() => handleContinueProduction(order)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ml-auto ${
                                                    isTargetReached 
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                }`}
                                                aria-label="Siparişi Devam Et"
                                            >
                                                <Play size={14} />
                                                Siparişi Devam Et
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {completedProductionOrders.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                                        Henüz tamamlanan üretim bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Section: Shift Management */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsShiftModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                        aria-label="Vardiya Oluştur"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Vardiya Oluştur</span>
                        <span className="sm:hidden">Vardiya</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPersonnelListModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        aria-label="Personel Listesini Görüntüle"
                    >
                        <Users size={18} />
                        Personeller
                    </button>
                    <button
                        onClick={() => setIsMachineListModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        <Factory size={18} />
                        Makineler
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(Array.isArray(shifts) ? shifts : []).map(shift => (
                        <ShiftCard 
                            key={shift.id} 
                            shift={shift} 
                            orders={orders}
                            machines={machines}
                            personnel={personnel}
                            onSelect={(s) => {
                                setSelectedShift(s);
                                setIsShiftDetailModalOpen(true);
                            }}
                        />
                    ))}
                    {shifts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                            Henüz planlanmış vardiya bulunmuyor.
                        </div>
                    )}
                </div>
            </div>

            {/* Other Orders Section */}
            {otherOrders.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h2 className="font-semibold text-slate-700">Hazırlık Aşamasındaki Diğer Siparişler</h2>
                            <p className="text-xs text-slate-500">Bu siparişler henüz tedarik ve üretim onayı almamıştır. Üretim listesinde görünmesi için Tedarik sayfasından "Üretim Sevkiyatı Yapıldı" seçilmelidir.</p>
                        </div>
                    </div>
                    
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden">
                        <div className="divide-y divide-slate-200">
                            {otherOrders.map((order) => (
                                <div key={order.id} className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                            <div className="font-medium text-slate-700">{order.customerName}</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-200 text-slate-600'}`}>
                                            {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop View (Table) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Sipariş No</th>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4">Oluşturulma Tarihi</th>
                                    <th className="px-6 py-4">Mevcut Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {otherOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="px-6 py-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-200 text-slate-600'}`}>
                                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}

            {/* Personnel List Modal */}
            <Modal
                isOpen={isPersonnelListModalOpen}
                onClose={() => setIsPersonnelListModalOpen(false)}
                title="Personel Listesi"
            >
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsPersonnelModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"
                        >
                            <Plus size={16} /> Ekle
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-semibold">
                                <tr>
                                    <th className="px-4 py-2">Ad Soyad</th>
                                    <th className="px-4 py-2">Görev</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(Array.isArray(personnel) ? personnel : []).map(p => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2">{p.firstName} {p.lastName}</td>
                                        <td className="px-4 py-2 text-slate-500">{p.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>
            
            <div className="space-y-4 mt-8">
                <h2 className="text-lg font-bold text-slate-800">Üretim Onaylı Ürünler</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Ürün Kodu</th>
                                    <th className="px-6 py-4">Ürün Adı</th>
                                    <th className="px-6 py-4">Sipariş Kodu</th>
                                    <th className="px-6 py-4">Gövde</th>
                                    <th className="px-6 py-4">Kapak</th>
                                    <th className="px-6 py-4">Dip</th>
                                    <th className="px-6 py-4">Toplam Kutu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {orders.flatMap(order => {
                                    const pad = order.productionApprovedDetails;
                                    if (!pad) return [];
                                    return Object.entries(pad).map(([productId, d]) => {
                                        const product = products.find(p => p.id === productId);
                                        const totalBox = Math.min(d.body || 0, d.lid || 0, d.bottom || 0);
                                        return (
                                            <tr key={`${order.id}-${productId}`} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewProduct(productId)}
                                                        className="text-indigo-700 hover:text-indigo-900 underline decoration-dotted"
                                                        aria-label="Ürün detayını aç"
                                                    >
                                                        {product?.code || '-'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">{product?.name || '-'}</td>
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedOrderDetail(order);
                                                            setIsOrderDetailModalOpen(true);
                                                        }}
                                                        className="text-slate-700 hover:text-slate-900 underline decoration-dotted"
                                                        aria-label="Sipariş detayını aç"
                                                    >
                                                        {order.id.slice(0,8)}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">{d.body || 0}</td>
                                                <td className="px-6 py-4">{d.lid || 0}</td>
                                                <td className="px-6 py-4">{d.bottom || 0}</td>
                                                <td className="px-6 py-4 font-semibold text-slate-800">{totalBox}</td>
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title="Ürün Detayları"
            >
                {selectedProduct && (
                    <ProductDetail
                        product={selectedProduct}
                        jobDetails={selectedOrderDetail ? {
                            jobSize: selectedOrderDetail.jobSize,
                            boxSize: selectedOrderDetail.boxSize,
                            efficiency: selectedOrderDetail.efficiency
                        } : undefined}
                        designImages={selectedOrderDetail?.designImages}
                        onClose={() => setIsProductModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Machine List Modal */}
            <Modal
                isOpen={isMachineListModalOpen}
                onClose={() => setIsMachineListModalOpen(false)}
                title="Makine Listesi"
            >
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsMachineModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"
                        >
                            <Plus size={16} /> Ekle
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-semibold">
                                <tr>
                                    <th className="px-4 py-2">Makine No</th>
                                    <th className="px-4 py-2">Özellikler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(Array.isArray(machines) ? machines : []).map(m => (
                                    <tr key={m.id}>
                                        <td className="px-4 py-2 font-mono">{m.machineNumber}</td>
                                        <td className="px-4 py-2 text-slate-500">{m.features}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* Add Personnel Modal */}
            <Modal
                isOpen={isPersonnelModalOpen}
                onClose={() => setIsPersonnelModalOpen(false)}
                title="Yeni Personel Ekle"
            >
                <form onSubmit={addPersonnel} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ad</label>
                            <input
                                required
                                type="text"
                                value={newPersonnel.firstName}
                                onChange={e => setNewPersonnel({...newPersonnel, firstName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ad"
                                aria-label="Ad"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Soyad</label>
                            <input
                                required
                                type="text"
                                value={newPersonnel.lastName}
                                onChange={e => setNewPersonnel({...newPersonnel, lastName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Soyad"
                                aria-label="Soyad"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Görev</label>
                        <select
                            required
                            value={newPersonnel.role}
                            onChange={e => setNewPersonnel({...newPersonnel, role: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Görev Seçimi"
                        >
                            <option value="">Seçiniz</option>
                            <option value="Operatör">Operatör</option>
                            <option value="Vardiya Amiri">Vardiya Amiri</option>
                            <option value="Bakımcı">Bakımcı</option>
                            <option value="Paketleme">Paketleme</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Kaydet</button>
                </form>
            </Modal>

            {/* Add Machine Modal */}
            <Modal
                isOpen={isMachineModalOpen}
                onClose={() => setIsMachineModalOpen(false)}
                title="Yeni Makine Ekle"
            >
                <form onSubmit={addMachine} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Makine Numarası</label>
                        <input
                            required
                            type="text"
                            value={newMachine.machineNumber}
                            onChange={e => setNewMachine({...newMachine, machineNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Makine No"
                            aria-label="Makine Numarası"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Özellikler</label>
                        <input
                            required
                            type="text"
                            value={newMachine.features}
                            onChange={e => setNewMachine({...newMachine, features: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Özellikler"
                            aria-label="Özellikler"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bakım Aralığı</label>
                            <input
                                type="text"
                                placeholder="Örn: 30 gün"
                                value={newMachine.maintenanceInterval}
                                onChange={e => setNewMachine({...newMachine, maintenanceInterval: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Bakım Aralığı"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Son Bakım</label>
                            <input
                                type="date"
                                value={newMachine.lastMaintenance}
                                onChange={e => setNewMachine({...newMachine, lastMaintenance: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Son Bakım Tarihi"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Kaydet</button>
                </form>
            </Modal>

            {/* Create Shift Modal */}
            <Modal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                title="Vardiya Planla"
            >
                <form onSubmit={createShift} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sipariş Seçimi</label>
                        <select
                            required
                            value={newShift.orderId}
                            onChange={e => setNewShift({...newShift, orderId: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Sipariş Seçimi"
                        >
                            <option value="">Sipariş Seçiniz</option>
                            {productionOrders.map(o => (
                                <option key={o.id} value={o.id}>{o.customerName} - {o.id.slice(0, 8)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Makine Seçimi</label>
                        <select
                            required
                            value={newShift.machineId}
                            onChange={e => setNewShift({...newShift, machineId: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Makine Seçimi"
                        >
                            <option value="">Makine Seçiniz</option>
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>{m.machineNumber} - {m.features}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vardiya Amiri</label>
                        <select
                            required
                            value={newShift.supervisorId}
                            onChange={e => setNewShift({...newShift, supervisorId: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Vardiya Amiri Seçimi"
                        >
                            <option value="">Amir Seçiniz</option>
                            {personnel.filter(p => p.role === 'Vardiya Amiri').map(p => (
                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vardiya Personeli</label>
                        <div className="w-full px-3 py-2 border border-slate-300 rounded-lg max-h-40 overflow-y-auto space-y-2">
                            {personnel.filter(p => p.role !== 'Vardiya Amiri' || p.id !== newShift.supervisorId).map(p => (
                                <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={newShift.personnelIds?.includes(p.id)}
                                        onChange={(e) => {
                                            const ids = newShift.personnelIds || [];
                                            if (e.target.checked) {
                                                setNewShift({...newShift, personnelIds: [...ids, p.id]});
                                            } else {
                                                setNewShift({...newShift, personnelIds: ids.filter(id => id !== p.id)});
                                            }
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>{p.firstName} {p.lastName} <span className="text-slate-400 text-xs">({p.role})</span></span>
                                </label>
                            ))}
                            {personnel.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Kayıtlı personel bulunamadı</div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç</label>
                            <input
                                required
                                type="datetime-local"
                                value={newShift.startTime}
                                onChange={e => setNewShift({...newShift, startTime: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Başlangıç Tarihi ve Saati"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş</label>
                            <input
                                required
                                type="datetime-local"
                                value={newShift.endTime}
                                onChange={e => setNewShift({...newShift, endTime: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Bitiş Tarihi ve Saati"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Planlanan Üretim Adedi</label>
                        <input
                            required
                            type="number"
                            value={newShift.plannedQuantity}
                            onChange={e => setNewShift({...newShift, plannedQuantity: parseFloat(e.target.value)})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                            aria-label="Planlanan Üretim Adedi"
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Vardiya Oluştur</button>
                </form>
            </Modal>

            {/* Shift Detail / Action Modal */}
            {selectedShift && (
                <Modal
                    isOpen={isShiftDetailModalOpen}
                    onClose={() => {
                        setIsShiftDetailModalOpen(false);
                        setShowStartPrompt(false);
                        setStartProductionQty('');
                    }}
                    title="Vardiya Detayı ve İşlemler"
                >
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Durum:</span>
                                <span className={`font-medium ${
                                    selectedShift.status === 'active' ? 'text-green-600' : 
                                    selectedShift.status === 'completed' ? 'text-slate-600' : 'text-amber-600'
                                }`}>
                                    {selectedShift.status === 'active' ? 'Üretim Devam Ediyor' : 
                                     selectedShift.status === 'completed' ? 'Vardiya Tamamlandı' : 'Planlandı'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Planlanan Adet:</span>
                                <span className="font-medium text-slate-800">{selectedShift.plannedQuantity}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <div className="flex justify-between mb-1">
                                    <span className="text-slate-500">Vardiya Amiri:</span>
                                    <span className="font-medium text-slate-800">
                                        {(() => {
                                            const sup = personnel.find(p => p.id === selectedShift.supervisorId);
                                            return sup ? `${sup.firstName} ${sup.lastName}` : '-';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-slate-500">Vardiya Personeli:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedShift.personnelIds && selectedShift.personnelIds.length > 0 ? (
                                            selectedShift.personnelIds.map(pid => {
                                                const p = personnel.find(per => per.id === pid);
                                                return p ? (
                                                    <span key={pid} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-xs">
                                                        {p.firstName} {p.lastName}
                                                    </span>
                                                ) : null;
                                            })
                                        ) : (
                                            <span className="text-slate-400 italic">Personel atanmamış</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedShift.status === 'active' && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-slate-500">Kalan Süre:</span>
                                    <span className="font-mono font-medium text-indigo-600">
                                        {(() => {
                                            const end = new Date(selectedShift.endTime);
                                            const now = new Date();
                                            const diff = differenceInMinutes(end, now);
                                            if (diff <= 0) return "Süre doldu";
                                            const h = Math.floor(diff / 60);
                                            const m = diff % 60;
                                            return `${h}sa ${m}dk`;
                                        })()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {showStartPrompt ? (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                                <label className="block text-sm font-medium text-indigo-900 mb-2">
                                    Başlangıç / Mevcut Üretim Adeti
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        autoFocus
                                        value={startProductionQty}
                                        onChange={e => setStartProductionQty(e.target.value)}
                                        placeholder="0"
                                        className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        aria-label="Başlangıç Üretim Adeti"
                                    />
                                    <button
                                        onClick={handleStartShift}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium whitespace-nowrap"
                                    >
                                        Devam Et
                                    </button>
                                </div>
                                <p className="text-xs text-indigo-600 mt-2">
                                    * Varsa mevcut üretim adetini girerek devam edebilirsiniz.
                                </p>
                            </div>
                        ) : (
                            selectedShift.status !== 'completed' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Üretilen Adet</label>
                                        <input
                                            type="number"
                                            value={selectedShift.producedQuantity || ''}
                                            onChange={e => updateShift(selectedShift.id, { producedQuantity: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-3 md:py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label="Üretilen Adet"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fire/Hurda Adet</label>
                                        <input
                                            type="number"
                                            value={selectedShift.scrapQuantity || ''}
                                            onChange={e => updateShift(selectedShift.id, { scrapQuantity: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-3 md:py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                            aria-label="Fire/Hurda Adet"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        {selectedShift.status === 'planned' && (
                                            <button
                                                onClick={() => {
                                                    setStartProductionQty(selectedShift.producedQuantity?.toString() || '0');
                                                    setShowStartPrompt(true);
                                                }}
                                                className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                                            >
                                                <Play size={18} />
                                                Üretime Başla
                                            </button>
                                        )}
                                        {selectedShift.status === 'active' && (
                                            <button
                                                onClick={() => updateShift(selectedShift.id, { status: 'completed' })}
                                                className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                            >
                                                <Square size={18} />
                                                Vardiyayı Bitir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                        
                        {/* Resume Completed Shift Option */}
                        {!showStartPrompt && selectedShift.status === 'completed' && (
                             <div className="pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => {
                                        setStartProductionQty(selectedShift.producedQuantity?.toString() || '0');
                                        setShowStartPrompt(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm"
                                >
                                    <Play size={16} />
                                    Üretime Devam Et (Vardiyayı Tekrar Aç)
                                </button>
                             </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Incoming Order Detail Modal */}
            <Modal
                isOpen={isOrderDetailModalOpen}
                onClose={() => setIsOrderDetailModalOpen(false)}
                title="Sipariş Detayları"
            >
                {selectedOrderDetail && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block">Müşteri</span>
                                <span className="font-medium text-slate-800">{selectedOrderDetail.customerName}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Sipariş No</span>
                                <span className="font-mono text-slate-800">{selectedOrderDetail.id.slice(0, 8)}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-500 block">Notlar</span>
                                <p className="text-slate-800 bg-slate-50 p-2 rounded">{'-'}</p>
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-slate-800 mb-2">Tedarik Bilgileri</h4>
                            <div className="space-y-3">
                                {selectedOrderDetail.items.map((item, idx) => {
                                    const details = selectedOrderDetail.procurementDetails?.[item.productId!] || { plate: 0, body: 0, lid: 0, bottom: 0 };
                                    // Handle legacy flat structure if needed, but assuming migration or new data
                                    // If details is empty but flat properties exist on procurementDetails, map them?
                                    // For display purposes, let's just show what we have.
                                    
                                    return (
                                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => item.productId && handleViewProduct(item.productId)}
                                                    className="font-medium text-indigo-700 hover:text-indigo-900 underline decoration-dotted"
                                                    aria-label={`${item.productName} ürün detayını aç`}
                                                >
                                                    {(products.find(p => p.id === item.productId)?.name) || item.productName}
                                                </button>
                                                <span className="text-xs text-slate-600 font-mono">
                                                    {(() => {
                                                        const product = products.find(p => p.id === item.productId);
                                                        return product?.dimensions 
                                                            ? `${product.dimensions.length || 0}x${product.dimensions.width || 0}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''}`
                                                            : '-';
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div className="bg-white p-1 rounded border border-slate-200">
                                                    <span className="text-slate-500 block">Levha</span>
                                                    <span className="font-bold text-slate-800">{details.plate || 0}</span>
                                                </div>
                                                <div className="bg-white p-1 rounded border border-slate-200">
                                                    <span className="text-slate-500 block">Gövde</span>
                                                    <span className="font-bold text-slate-800">{details.body || 0}</span>
                                                </div>
                                                <div className="bg-white p-1 rounded border border-slate-200">
                                                    <span className="text-slate-500 block">Kapak</span>
                                                    <span className="font-bold text-slate-800">{details.lid || 0}</span>
                                                </div>
                                                <div className="bg-white p-1 rounded border border-slate-200">
                                                    <span className="text-slate-500 block">Dip</span>
                                                    <span className="font-bold text-slate-800">{details.bottom || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Stock Entry Confirmation Modal */}
            <Modal
                isOpen={isStockEntryModalOpen}
                onClose={() => setIsStockEntryModalOpen(false)}
                title="Stok Giriş Onayı"
            >
                <div className="space-y-6">
                    <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800 border border-amber-100">
                        <p>Tedarikten gelen ürün adetlerini kontrol edip onaylayınız. Bu işlem sonrası ürünler stoğa eklenecek ve sipariş üretim planlamasına düşecektir.</p>
                    </div>
                    
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {incomingOrder && incomingOrder.items.map((item, idx) => {
                             const details = stockEntryDetails[item.productId!] || { plate: 0, body: 0, lid: 0, bottom: 0 };
                             const original = (incomingOrder.procurementDetails && incomingOrder.procurementDetails[item.productId!]) || { plate: 0, body: 0, lid: 0, bottom: 0 };
                             
                             return (
                                <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
                                        {item.productName}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
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
                                                    setStockEntryDetails(prev => ({
                                                        ...prev,
                                                        [item.productId!]: { ...prev[item.productId!], plate: val }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="0"
                                                aria-label={`${item.productName} Levha Adeti`}
                                            />
                                            <div className={`mt-1 text-xs ${details.plate - (original.plate || 0) > 0 ? 'text-emerald-600' : details.plate - (original.plate || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const diff = (details.plate || 0) - (original.plate || 0);
                                                    return diff > 0 ? `+${diff}` : `${diff}`;
                                                })()}
                                            </div>
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
                                                    setStockEntryDetails(prev => ({
                                                        ...prev,
                                                        [item.productId!]: { ...prev[item.productId!], body: val }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="0"
                                                aria-label={`${item.productName} Gövde Adeti`}
                                            />
                                            <div className={`mt-1 text-xs ${details.body - (original.body || 0) > 0 ? 'text-emerald-600' : details.body - (original.body || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const diff = (details.body || 0) - (original.body || 0);
                                                    return diff > 0 ? `+${diff}` : `${diff}`;
                                                })()}
                                            </div>
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
                                                    setStockEntryDetails(prev => ({
                                                        ...prev,
                                                        [item.productId!]: { ...prev[item.productId!], lid: val }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="0"
                                                aria-label={`${item.productName} Kapak Adeti`}
                                            />
                                            <div className={`mt-1 text-xs ${details.lid - (original.lid || 0) > 0 ? 'text-emerald-600' : details.lid - (original.lid || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const diff = (details.lid || 0) - (original.lid || 0);
                                                    return diff > 0 ? `+${diff}` : `${diff}`;
                                                })()}
                                            </div>
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
                                                    setStockEntryDetails(prev => ({
                                                        ...prev,
                                                        [item.productId!]: { ...prev[item.productId!], bottom: val }
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="0"
                                                aria-label={`${item.productName} Dip Adeti`}
                                            />
                                            <div className={`mt-1 text-xs ${details.bottom - (original.bottom || 0) > 0 ? 'text-emerald-600' : details.bottom - (original.bottom || 0) < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const diff = (details.bottom || 0) - (original.bottom || 0);
                                                    return diff > 0 ? `+${diff}` : `${diff}`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button 
                            onClick={() => setIsStockEntryModalOpen(false)}
                            className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleSaveStockEntry}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                            Onayla ve Stoğa İşle
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Start Production Modal */}
            <Modal
                isOpen={isStartProductionModalOpen}
                onClose={() => setIsStartProductionModalOpen(false)}
                title="Üretime Başla"
            >
                <form onSubmit={handleStartProductionSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Ürün
                        </label>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium">
                            {selectedProductionItem?.item.productName}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Üretim Hattı (Makine)
                        </label>
                        <select
                            required
                            aria-label="Üretim Hattı Seçimi"
                            title="Üretim Hattı Seçimi"
                            value={productionFormData.machineId}
                            onChange={e => setProductionFormData({...productionFormData, machineId: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Makine Seçiniz</option>
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.machineNumber} - {m.features}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Hedeflenen Adet
                            </label>
                            <input
                                required
                                type="number"
                                min="1"
                                aria-label="Hedeflenen Adet"
                                title="Hedeflenen Adet"
                                value={productionFormData.targetQuantity}
                                onChange={e => setProductionFormData({...productionFormData, targetQuantity: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Öngörülen Fire
                            </label>
                            <input
                                type="number"
                                min="0"
                                aria-label="Öngörülen Fire"
                                title="Öngörülen Fire"
                                value={productionFormData.predictedScrap}
                                onChange={e => setProductionFormData({...productionFormData, predictedScrap: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                    >
                        <Play size={18} />
                        Üretimi Başlat
                    </button>
                </form>
            </Modal>

            {/* Product Detail Modal */}
            {isProductModalOpen && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                        <button 
                            onClick={() => setIsProductModalOpen(false)}
                            aria-label="Kapat"
                            title="Kapat"
                            className="absolute right-4 top-4 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 z-10"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                        <ProductDetail product={selectedProduct} onClose={() => setIsProductModalOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
