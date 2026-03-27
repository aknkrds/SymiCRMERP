import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../context/AuthContext';
import { Package, TrendingUp, AlertCircle, CheckCircle2, Activity, Calendar, Menu, Star, LayoutGrid, Users } from 'lucide-react';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';
import { useMemo } from 'react';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];

export default function Dashboard() {
    const { orders } = useOrders();
    const { user } = useAuth();

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 7) return 'İyi Geceler';
        if (hour < 12) return 'Günaydın';
        if (hour < 18) return 'Tünaydın';
        return 'İyi Akşamlar';
    }, []);

    const today = format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr });

    const stats = useMemo(() => {
        const totalOrders = orders.length;
        const activeProduction = orders.filter(o => ['production_started', 'production_completed'].includes(o.status)).length;
        const pendingOffers = orders.filter(o => o.status === 'offer_sent').length;
        const completed = orders.filter(o => o.status === 'shipping_completed').length;

        return [
            {
                label: 'Toplam Sipariş',
                value: totalOrders,
                icon: Package,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100'
            },
            {
                label: 'Aktif Üretim',
                value: activeProduction,
                icon: Activity,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100'
            },
            {
                label: 'Bekleyen Teklif',
                value: pendingOffers,
                icon: AlertCircle,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100'
            },
            {
                label: 'Teslim Edilen',
                value: completed,
                icon: CheckCircle2,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100'
            },
        ];
    }, [orders]);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(order => {
            const statusLabel = ORDER_STATUS_MAP[order.status]?.label || order.status;
            counts[statusLabel] = (counts[statusLabel] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [orders]);

    const customerData = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(order => {
            counts[order.customerName] = (counts[order.customerName] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); 
    }, [orders]);

    const recentOrders = orders.slice(0, 5);

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Genel Bakış' }, { label: 'Panel', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<LayoutGrid size={13} />} label="Hızlı Bakış" variant="primary" />
                    <ToolbarBtn icon={<Star size={13} />} />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
            toolbarRight={
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600">
                    <Calendar size={13} className="text-blue-500" />
                    {today}
                </div>
            }
        >
            <div className="p-4 space-y-6">
                {/* Greeting */}
                <div className="animate-fade-in">
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                        {greeting}, <span className="text-blue-600">{user?.fullName?.split(' ')[0] || 'Kullanıcı'}</span> 👋
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">İşte bugünün özeti ve bekleyen işleriniz.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => (
                        <div key={idx} className={`bg-white p-4 rounded-lg border ${stat.border} shadow-sm hover:shadow-md transition-all group overflow-hidden relative`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} border ${stat.border.replace('100', '200')}`}>
                                    <stat.icon size={20} />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-[10px]">
                                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${stat.color.replace('text-', 'bg-')} bg-opacity-60`} style={{ width: '65%' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status Distribution */}
                    <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Sipariş Durumları</span>
                        </div>
                        <div className="p-4 flex flex-col md:flex-row items-center gap-6">
                            <div className="h-48 w-full md:w-1/2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip labelStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2">
                                {statusData.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-slate-600 font-medium">{entry.name}</span>
                                        </div>
                                        <span className="text-slate-800 font-bold">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Customers */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Users size={14} className="text-purple-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">En İyi Müşteriler</span>
                        </div>
                        <div className="p-4 flex-1">
                            {customerData.map((customer, idx) => (
                                <div key={idx} className="mb-4 last:mb-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[11px] font-medium text-slate-700 truncate mr-2">{customer.name}</span>
                                        <span className="text-[11px] font-bold text-slate-900">{customer.value}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 bg-opacity-60" 
                                            style={{ width: `${(customer.value / Math.max(...customerData.map(c => c.value))) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Orders Section */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Son Siparişler</span>
                        </div>
                        <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">Tümünü Gör</button>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                                <th className="w-8 px-2 py-2 text-center border-r border-slate-100 text-[11px]">#</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-[11px] uppercase">Sipariş No</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-[11px] uppercase">Müşteri</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-[11px] uppercase text-right">Tutar</th>
                                <th className="px-3 py-2 text-[11px] uppercase">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Henüz sipariş bulunmuyor.</td></tr>
                            ) : recentOrders.map((order, idx) => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-medium text-slate-700">{order.customerName}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-900">
                                        {order.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.currency}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-800 border-slate-200'} bg-opacity-10 border-opacity-20`}>
                                            {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ERPPageLayout>
    );
}
