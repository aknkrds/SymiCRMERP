import { useState, useMemo } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useUsers } from '../hooks/useUsers';
import { useProducts } from '../hooks/useProducts';
import { CheckCircle2, FileText, XCircle, Eye, AlertTriangle, Truck, Package, DollarSign, ChevronDown } from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Order, Product } from '../types';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { Modal } from '../components/ui/Modal';
import { ProductDetail } from '../components/products/ProductDetail';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const ROLE_COLOR_MAP: Record<string, string> = {
    'Satış': 'bg-sky-100 border-sky-200',
    'Tasarımcı': 'bg-fuchsia-100 border-fuchsia-200',
    'Matbaa': 'bg-amber-100 border-amber-200',
    'Fabrika Müdürü': 'bg-emerald-100 border-emerald-200',
    'Muhasebe': 'bg-rose-100 border-rose-200',
    'Sevkiyat': 'bg-indigo-100 border-indigo-200',
    'Tedarik': 'bg-teal-100 border-teal-200',
};

const DEPARTMENTS: { title: string; roles: string[] }[] = [
    { title: 'Satış', roles: ['Satış'] },
    { title: 'Tasarım', roles: ['Tasarımcı'] },
    { title: 'Tedarik', roles: ['Tedarik', 'Matbaa'] },
    { title: 'Üretim', roles: ['Fabrika Müdürü'] },
    { title: 'Muhasebe', roles: ['Muhasebe'] },
    { title: 'Sevkiyat', roles: ['Sevkiyat'] },
];

export default function Approvals() {
    const { orders, updateStatus, updateOrder } = useOrders() as any;
    const { users } = useUsers();
    const { products } = useProducts();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [dragOrderId, setDragOrderId] = useState<string | null>(null);
    const [assignDropdownOpen, setAssignDropdownOpen] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productJobDetails, setProductJobDetails] = useState<{ jobSize?: string; boxSize?: string; efficiency?: string } | null>(null);
    const [productDesignImages, setProductDesignImages] = useState<string[] | undefined>(undefined);

    // Filter orders
    const gmPendingApprovals = orders.filter(o => o.status === 'waiting_manager_approval');
    const pendingApprovals = orders.filter(o => o.status === 'shipping_completed');
    const completedHistory = orders.filter(o => o.status === 'order_completed' || o.status === 'cancelled');

    const handleGMApprove = async (orderId: string) => {
        if (confirm('Siparişi onaylıyor musunuz? Satış personeli artık değişiklik yapamayacak.')) {
            await updateStatus(orderId, 'manager_approved');
        }
    };

    const handleGMRequestRevision = async (orderId: string) => {
        if (confirm('Sipariş için revize isteği gönderilsin mi? Satış personeli siparişi düzenleyebilecek.')) {
            await updateStatus(orderId, 'revision_requested');
        }
    };

    const revenueData = useMemo(() => {
        // Last 6 months
        const data: Record<string, { name: string, total: number }> = {};
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(today, i);
            const key = format(d, 'yyyy-MM');
            data[key] = {
                name: format(d, 'MMM', { locale: tr }),
                total: 0
            };
        }

        orders.forEach(order => {
            const date = parseISO(order.createdAt);
            const key = format(date, 'yyyy-MM');
            if (data[key]) {
                // Determine value based on currency (rough approximation)
                let amount = order.grandTotal;
                if (order.currency === 'USD') amount *= 30;
                if (order.currency === 'EUR') amount *= 33;
                if (order.currency === 'GBP') amount *= 38;
                
                data[key].total += amount;
            }
        });

        return Object.values(data);
    }, [orders]);

    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(orders.length / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const recentOrders = orders.slice(start, start + pageSize);

    const ROLE_STATUS_MAP: Record<string, Order['status']> = {
        'Satış': 'offer_sent',
        'Tasarımcı': 'design_waiting',
        'Tedarik': 'supply_waiting',
        'Matbaa': 'supply_waiting',
        'Fabrika Müdürü': 'production_planned',
        'Muhasebe': 'invoice_waiting',
        'Sevkiyat': 'shipping_waiting',
    };

    const handleAssignToUser = async (orderId: string, user: { id: string; fullName: string; roleName: string }) => {
        const newStatus = ROLE_STATUS_MAP[user.roleName] || undefined;
        await updateOrder(orderId, {
            status: newStatus || undefined,
            assignedUserId: user.id,
            assignedUserName: user.fullName,
            assignedRoleName: user.roleName,
        } as any);
    };

    const handleCompleteOrder = async (orderId: string) => {
        if (confirm('Bu sipariş tamamen tamamlandı olarak işaretlensin mi?')) {
            await updateStatus(orderId, 'order_completed');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (confirm('DİKKAT: Bu sipariş iptal edilecek! Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
            await updateStatus(orderId, 'order_cancelled' as any); // Using 'as any' just in case type def isn't updated in memory yet, though it looked fine
        }
    };

    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const handleViewProduct = (productId: string) => {
        if (!selectedOrder) return;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setSelectedProduct(product);
        setProductJobDetails({
            jobSize: selectedOrder.jobSize,
            boxSize: selectedOrder.boxSize,
            efficiency: selectedOrder.efficiency,
        });
        setProductDesignImages(selectedOrder.designImages || undefined);
        setIsProductModalOpen(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    const getStatusBadge = (status: string) => {
        const label = ORDER_STATUS_MAP[status]?.label || status;
        const color = ORDER_STATUS_MAP[status]?.color || 'bg-slate-100 text-slate-600';
        
        switch (status) {
            case 'order_completed':
                return <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${color}`}><CheckCircle2 size={12} /> {label}</span>;
            case 'cancelled':
            case 'order_cancelled':
                return <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${color}`}><XCircle size={12} /> {label}</span>;
            default:
                return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Onaylar ve Finans</h1>
                    <p className="text-slate-500 text-sm mt-1">Finansal veriler ve sipariş onay süreçleri</p>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Tahmini Ciro (Son 6 Ay)
                </h3>
                <div className="h-80" role="img" aria-label="Tahmini Ciro Grafiği">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`₺${value.toLocaleString()}`, 'Tutar']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorTotal)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Atama İçin Kişiler</h2>
                </div>
                <div className="p-4">
                    <div className="flex flex-wrap items-stretch gap-3">
                        {users
                            .slice()
                            .sort((a, b) => {
                                return a.fullName.localeCompare(b.fullName, 'tr');
                            })
                            .map(u => (
                                <div
                                    key={u.id}
                                    role="button"
                                    aria-label={`${u.fullName} kişisine ata`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const orderId = dragOrderId || e.dataTransfer.getData('text/plain');
                                        if (orderId) handleAssignToUser(orderId, { id: u.id, fullName: u.fullName, roleName: u.roleName });
                                        setDragOrderId(null);
                                    }}
                                    className={`p-3 border rounded-lg transition-colors cursor-pointer w-full sm:w-48 ${ROLE_COLOR_MAP[u.roleName] || 'bg-slate-50 border-slate-200'}`}
                                    title={u.roleName}
                                >
                                    <div className="font-medium text-slate-800 truncate">{u.fullName}</div>
                                    <div className="text-xs text-slate-600 truncate">{u.roleName}</div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Last 10 orders draggable list */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-800">Siparişler</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-200">
                        {recentOrders.map((order) => (
                            <div
                                key={order.id}
                                draggable
                                onDragStart={(e) => {
                                    setDragOrderId(order.id);
                                    e.dataTransfer.setData('text/plain', order.id);
                                }}
                                className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-grab relative gap-3 md:gap-0"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-slate-500">#{order.id.slice(0,8)}</span>
                                        <span className="md:hidden text-xs text-slate-400">•</span>
                                        <span className="md:hidden text-xs text-slate-500">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</span>
                                    </div>
                                    <span className="font-medium text-slate-800">{order.customerName}</span>
                                    <span className="hidden md:inline text-xs text-slate-500">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}</span>
                                </div>
                                <div className="relative w-full md:w-auto">
                                    <button
                                        onClick={() => setAssignDropdownOpen(assignDropdownOpen === order.id ? null : order.id)}
                                        className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 text-sm md:text-xs hover:bg-slate-200 px-3 py-2.5 md:px-2 md:py-1.5 rounded-lg md:rounded transition-colors bg-slate-100 md:bg-transparent"
                                        aria-label="Atama Durumu Değiştir"
                                        aria-haspopup="true"
                                        aria-expanded={assignDropdownOpen === order.id ? "true" : "false"}
                                    >
                                        <span className="font-medium">
                                            {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                        </span>
                                        <ChevronDown size={14} className="text-slate-400" />
                                    </button>
                                    
                                    {assignDropdownOpen === order.id && (
                                        <div className="absolute right-0 left-0 md:left-auto top-full mt-1 md:w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-80 overflow-y-auto">
                                            <div className="p-2 sticky top-0 bg-white border-b border-slate-100 font-semibold text-xs text-slate-500">
                                                Atama Yapılacak Kişi Seçin
                                            </div>
                                            {users
                                                .slice()
                                                .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr'))
                                                .map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            handleAssignToUser(order.id, { id: u.id, fullName: u.fullName, roleName: u.roleName });
                                                            setAssignDropdownOpen(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between group"
                                                        aria-label={`${u.fullName} Kişisine Ata`}
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-800">{u.fullName}</div>
                                                            <div className="text-xs text-slate-500">{u.roleName}</div>
                                                        </div>
                                                        <div className={`w-2 h-2 rounded-full ${ROLE_COLOR_MAP[u.roleName]?.split(' ')[0] || 'bg-slate-200'}`} />
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-200">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                            aria-label="Önceki Sayfa"
                        >
                            ← Önceki
                        </button>
                        <span className="text-xs text-slate-600">
                            Sayfa {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                            aria-label="Sonraki Sayfa"
                        >
                            Sonraki →
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Onaylar</h1>
                    <p className="text-slate-500">Sevkiyatı yapılan ve final onayı bekleyen siparişler</p>
                </div>
            </div>

            {/* GM Pending Approvals Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="text-orange-500" size={20} />
                    Genel Müdür Onayı Bekleyenler
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden">
                        {gmPendingApprovals.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Genel Müdür onayı bekleyen sipariş bulunmuyor.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {gmPendingApprovals.map((order) => (
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
                                        
                                        <div className="font-semibold text-slate-700">{order.grandTotal.toFixed(2)} {order.currency}</div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => handleViewDetails(order)}
                                                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <Eye size={16} />
                                                Detay
                                            </button>
                                            <button
                                                onClick={() => handleGMApprove(order.id)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <CheckCircle2 size={16} />
                                                Onayla
                                            </button>
                                            <button
                                                onClick={() => handleGMRequestRevision(order.id)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <XCircle size={16} />
                                                Revize İste
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
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {gmPendingApprovals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            Genel Müdür onayı bekleyen sipariş bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    gmPendingApprovals.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                            <td className="px-6 py-4">
                                                {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">
                                                {order.grandTotal.toFixed(2)} {order.currency}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(order)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Detay Görüntüle"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleGMApprove(order.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Onayla"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleGMRequestRevision(order.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Revize İste"
                                                    >
                                                        <XCircle size={18} />
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

            {/* Pending Approvals Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={20} />
                    Onay Bekleyen Siparişler
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden">
                        {pendingApprovals.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Onay bekleyen sipariş bulunmuyor.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {pendingApprovals.map((order) => (
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
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {order.invoiceUrl && (
                                                <a 
                                                    href={order.invoiceUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                                                    aria-label="Faturayı Görüntüle"
                                                >
                                                    <FileText size={14} /> Fatura
                                                </a>
                                            )}
                                            {order.waybillUrl && (
                                                <a 
                                                    href={order.waybillUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs hover:bg-amber-100 transition-colors"
                                                    aria-label="İrsaliyeyi Görüntüle"
                                                >
                                                    <Truck size={14} /> İrsaliye
                                                </a>
                                            )}
                                             {order.additionalDocUrl && (
                                                <a 
                                                    href={order.additionalDocUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                                                >
                                                    <FileText size={14} /> Ek Evrak
                                                </a>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => handleViewDetails(order)}
                                                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <Eye size={16} />
                                                Detay
                                            </button>
                                            <button
                                                onClick={() => handleCompleteOrder(order.id)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <CheckCircle2 size={16} />
                                                Onayla
                                            </button>
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <XCircle size={16} />
                                                İptal
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Sipariş No</th>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Evraklar</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {pendingApprovals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            Onay bekleyen sipariş bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingApprovals.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                            <td className="px-6 py-4">
                                                {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {order.invoiceUrl && (
                                                        <a 
                                                            href={order.invoiceUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                                                            title="Faturayı Görüntüle"
                                                        >
                                                            <FileText size={14} /> Fatura
                                                        </a>
                                                    )}
                                                    {order.waybillUrl && (
                                                        <a 
                                                            href={order.waybillUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs hover:bg-amber-100 transition-colors"
                                                            title="İrsaliyeyi Görüntüle"
                                                        >
                                                            <FileText size={14} /> İrsaliye
                                                        </a>
                                                    )}
                                                    {order.additionalDocUrl && (
                                                        <a 
                                                            href={order.additionalDocUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                                                            title="Ek Evrak Görüntüle"
                                                        >
                                                            <FileText size={14} /> Ek Evrak
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => handleViewDetails(order)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 transition-colors"
                                                    >
                                                        <Eye size={14} /> Detay
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-xs font-medium"
                                                    >
                                                        <XCircle size={16} />
                                                        İptal Et
                                                    </button>
                                                    <button
                                                        onClick={() => handleCompleteOrder(order.id)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-xs font-medium"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        Siparişi Bitir
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

            {/* Completed History Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                    Tamamlanan İşlemler
                </h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Mobile View (Cards) */}
                    <div className="md:hidden">
                        {completedHistory.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Geçmiş işlem bulunmuyor.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {completedHistory.map((order) => (
                                    <div key={order.id} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</div>
                                                <div className="font-medium text-slate-800">{order.customerName}</div>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                             <div>
                                                {getStatusBadge(order.status)}
                                             </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={() => handleViewDetails(order)}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                                                aria-label="Sipariş Detaylarını Görüntüle"
                                            >
                                                <Eye size={16} />
                                                Görüntüle
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Sipariş No</th>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {completedHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            Geçmiş işlem bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    completedHistory.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                            <td className="px-6 py-4">
                                                {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleViewDetails(order)}
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
            </div>

            {/* Order Detail Modal */}
            {showModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Sipariş Detayı</h3>
                                <p className="text-sm text-slate-500">#{selectedOrder.id}</p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600" title="Kapat" aria-label="Kapat">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Customer & Order Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                                    <h4 className="font-semibold text-slate-800 mb-3">Müşteri Bilgileri</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Müşteri Adı:</span>
                                        <span className="font-medium">{selectedOrder.customerName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Sipariş Tarihi:</span>
                                        <span className="font-medium">{format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Son Durum:</span>
                                        <span>{getStatusBadge(selectedOrder.status)}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-indigo-50 rounded-xl space-y-2">
                                    <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                                        <Truck size={18} /> Sevkiyat Bilgileri
                                    </h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-indigo-600">Paketleme:</span>
                                        <span className="font-medium text-indigo-900">{selectedOrder.packagingType} ({selectedOrder.packagingCount} Adet)</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-indigo-600">Paket No:</span>
                                        <span className="font-medium text-indigo-900">{selectedOrder.packageNumber}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-indigo-600">Araç Plaka:</span>
                                        <span className="font-medium text-indigo-900">{selectedOrder.vehiclePlate}</span>
                                    </div>
                                    {selectedOrder.trailerPlate && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-indigo-600">Dorse Plaka:</span>
                                            <span className="font-medium text-indigo-900">{selectedOrder.trailerPlate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText size={18} /> Evraklar
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {selectedOrder.invoiceUrl ? (
                                        <a href={selectedOrder.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
                                            <FileText size={16} /> Fatura Görüntüle
                                        </a>
                                    ) : <span className="text-sm text-slate-400 italic">Fatura yok</span>}

                                    {selectedOrder.waybillUrl ? (
                                        <a href={selectedOrder.waybillUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200">
                                            <FileText size={16} /> İrsaliye Görüntüle
                                        </a>
                                    ) : <span className="text-sm text-slate-400 italic">İrsaliye yok</span>}

                                    {selectedOrder.additionalDocUrl ? (
                                        <a href={selectedOrder.additionalDocUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200">
                                            <FileText size={16} /> Ek Evrak Görüntüle
                                        </a>
                                    ) : <span className="text-sm text-slate-400 italic">Ek evrak yok</span>}
                                </div>
                            </div>

                            {/* Order Items */}
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Package size={18} /> Ürünler
                                </h4>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-700 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Ürün</th>
                                                <th className="px-4 py-3 text-right">Miktar</th>
                                                <th className="px-4 py-3 text-right">Birim Fiyat</th>
                                                <th className="px-4 py-3 text-right">Toplam</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3">
                                                        {item.productId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewProduct(item.productId)}
                                                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                                            >
                                                                {item.productName}
                                                            </button>
                                                        ) : (
                                                            item.productName
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedOrder.currency}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {(item.quantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedOrder.currency}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 font-semibold text-slate-800">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-right">Genel Toplam:</td>
                                                <td className="px-4 py-3 text-right">
                                                    {selectedOrder.grandTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedOrder.currency}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                            <button 
                                onClick={closeModal}
                                className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title="Ürün Detayları"
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
        </div>
    );
}
