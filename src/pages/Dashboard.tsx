import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../context/AuthContext';
import { Package, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Users, Activity, Clock, Calendar } from 'lucide-react';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

    // --- Statistics Calculations ---

    const stats = useMemo(() => {
        const totalOrders = orders.length;
        const activeProduction = orders.filter(o => ['production_started', 'production_completed'].includes(o.status)).length;
        const pendingOffers = orders.filter(o => o.status === 'offer_sent').length;
        const completed = orders.filter(o => o.status === 'shipping_completed').length;
        
        // Calculate total revenue (rough approximation summing all currencies for now, or just picking one)
        // ideally we should convert, but for now let's sum based on major currency or just display count
        // Let's stick to counts for the cards as they are safer without conversion rates
        
        return [
            {
                label: 'Toplam Sipariş',
                value: totalOrders,
                icon: Package,
                color: 'text-blue-600',
                bg: 'bg-blue-100',
            },
            {
                label: 'Aktif Üretim',
                value: activeProduction,
                icon: Activity,
                color: 'text-amber-600',
                bg: 'bg-amber-100',
            },
            {
                label: 'Bekleyen Teklif',
                value: pendingOffers,
                icon: AlertCircle,
                color: 'text-purple-600',
                bg: 'bg-purple-100',
            },
            {
                label: 'Teslim Edilen',
                value: completed,
                icon: CheckCircle2,
                color: 'text-emerald-600',
                bg: 'bg-emerald-100',
            },
        ];
    }, [orders]);

    // --- Chart Data Preparation ---

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
            .slice(0, 5); // Top 5
    }, [orders]);

    const recentOrders = orders.slice(0, 5);

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {greeting}, <span className="text-[var(--accent)]">{user?.fullName?.split(' ')[0] || 'Kullanıcı'}</span> 👋
                    </h1>
                    <p className="text-slate-500 mt-1">İşte bugünün özeti ve bekleyen işleriniz.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/60 backdrop-blur-sm">
                    <Calendar className="text-[var(--accent)]" size={18} />
                    <span className="text-sm font-medium text-slate-600">{today}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 animate-fade-in-up group"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1 group-hover:text-[var(--accent)] transition-colors">{stat.label}</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                            <stat.icon size={28} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up delay-200">
                
                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[var(--accent)]" />
                        Sipariş Durumları
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Custom Legend */}
                    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3">
                        {statusData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-slate-600 font-medium">{entry.name}</span>
                                <span className="text-slate-400 text-xs">({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        En Çok Sipariş Veren Müşteriler (Top 5)
                    </h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={customerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={150}
                                    tick={{fill: '#475569', fontSize: 13, fontWeight: 500}}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden animate-fade-in-up delay-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">Son İşlemler</h2>
                    <button className="text-sm text-[var(--accent)] hover:text-[var(--accent-strong)] font-medium transition-colors">Tümünü Gör</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-800 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Tutar</th>
                                <th className="px-6 py-4">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Henüz sipariş bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                recentOrders.map((order) => (
                                    <tr 
                                        key={order.id} 
                                        className={`transition-colors border-b last:border-0 ${
                                            order.status === 'created' 
                                                ? 'bg-white hover:bg-slate-50' 
                                                : (ORDER_STATUS_MAP[order.status]?.color ? `bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-50 hover:bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-100` : 'bg-white hover:bg-slate-50')
                                        }`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            {order.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-800 border-slate-200'} bg-opacity-10 border-opacity-20`}>
                                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
