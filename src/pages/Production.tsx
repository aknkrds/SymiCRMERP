import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, MoreVertical, Calendar, 
    Clock, CheckCircle2, AlertCircle, X, 
    Users, Settings, Play, Square, Timer,
    Trash2, Factory
} from 'lucide-react';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import type { Order, Personnel, Machine, Shift, PersonnelFormData, MachineFormData, ShiftFormData } from '../types';

const API_URL = '/api';

const PRODUCTION_STATUSES = [
    { value: 'production_planning', label: 'Üretim Planlaması Yapılıyor' },
    { value: 'production_started', label: 'Üretim Başladı' },
    { value: 'production_completed', label: 'Üretim Tamamlandı' },
    { value: 'invoice_pending', label: 'Fatura ve İrsaliye Bekleniyor' }
];

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
    
    // Start/Resume Shift States
    const [showStartPrompt, setShowStartPrompt] = useState(false);
    const [startProductionQty, setStartProductionQty] = useState<string>('');

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

            if (ordersRes.ok) setOrders(await ordersRes.json());
            if (personnelRes.ok) setPersonnel(await personnelRes.json());
            if (machinesRes.ok) setMachines(await machinesRes.json());
            if (shiftsRes.ok) setShifts(await shiftsRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
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

            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const addPersonnel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/personnel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPersonnel,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString()
                })
            });
            setIsPersonnelModalOpen(false);
            setNewPersonnel({ firstName: '', lastName: '', role: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding personnel:', error);
        }
    };

    const addMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/machines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newMachine,
                    id: crypto.randomUUID(),
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
            await fetch(`${API_URL}/shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newShift,
                    id: crypto.randomUUID(),
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
    const ShiftCard = ({ shift }: { shift: Shift }) => {
        const order = orders.find(o => o.id === shift.orderId);
        const machine = machines.find(m => m.id === shift.machineId);
        const supervisor = personnel.find(p => p.id === shift.supervisorId);
        
        const isStarted = shift.status === 'active';
        const isCompleted = shift.status === 'completed';

        // Calculate time remaining or duration
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const now = new Date();
        
        let timeDisplay = '';
        if (isStarted) {
            const minutesLeft = differenceInMinutes(end, now);
            const hours = Math.floor(minutesLeft / 60);
            const mins = minutesLeft % 60;
            timeDisplay = minutesLeft > 0 ? `${hours}sa ${mins}dk kaldı` : 'Süre doldu';
        } else {
            timeDisplay = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        }

        return (
            <div 
                onClick={() => {
                    setSelectedShift(shift);
                    setIsShiftDetailModalOpen(true);
                }}
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
                        {format(new Date(shift.startTime), 'dd MMM', { locale: tr })}
                    </span>
                </div>
                
                <h4 className="font-medium text-slate-800 mb-1 truncate" title={order?.customerName}>
                    {order?.customerName}
                </h4>
                <p className="text-sm text-slate-600 mb-3 truncate">
                    {machine?.machineNumber} - {machine?.features}
                </p>

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

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Üretim Yönetimi</h1>
            </div>

            {/* Top Section: Incoming Orders */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Üretim Bekleyen Siparişler</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tedarik Tarihi</th>
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
                <div className="overflow-x-auto">
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
                                                    onClick={() => handleProductionStatusChange(order.id, 'production_completed')}
                                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                >
                                                    Tamamlandı
                                                </button>
                                                <button 
                                                    onClick={() => handleProductionStatusChange(order.id, 'production_cancelled')}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
                <div className="overflow-x-auto">
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
                                                onClick={() => handleContinueProduction(order)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ml-auto ${
                                                    isTargetReached 
                                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                }`}
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
                        onClick={() => setIsShiftModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Vardiya Oluştur
                    </button>
                    <button
                        onClick={() => setIsPersonnelListModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
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
                    {shifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} />
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
                    <div className="overflow-x-auto">
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
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                                                {order.status === 'created' ? 'Oluşturuldu' :
                                                 order.status === 'offer_sent' ? 'Teklif Gönderildi' :
                                                 order.status === 'offer_accepted' ? 'Teklif Onaylandı' :
                                                 order.status === 'design_pending' ? 'Tasarım Bekliyor' :
                                                 order.status === 'design_approved' ? 'Tasarım Onaylandı' :
                                                 order.status}
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
                                {personnel.map(p => (
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

            {/* Machine List Modal */}
            <Modal
                isOpen={isMachineListModalOpen}
                onClose={() => setIsMachineListModalOpen(false)}
                title="Makine Listesi"
            >
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
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
                                {machines.map(m => (
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
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Son Bakım</label>
                            <input
                                type="date"
                                value={newMachine.lastMaintenance}
                                onChange={e => setNewMachine({...newMachine, lastMaintenance: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
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
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Fire/Hurda Adet</label>
                                        <input
                                            type="number"
                                            value={selectedShift.scrapQuantity || ''}
                                            onChange={e => updateShift(selectedShift.id, { scrapQuantity: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="0"
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
        </div>
    );
}