import { useOrders } from '../hooks/useOrders';
import { Package, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Users, Activity } from 'lucide-react';
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
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
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
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Son İşlemler</h2>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Tümünü Gör</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Sipariş No</th>
                                <th className="px-6 py-4">Müşteri</th>
                                <th className="px-6 py-4">Tarih</th>
                                <th className="px-6 py-4">Tutar</th>
                                <th className="px-6 py-4">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                                        className={`transition-colors border-b last:border-0 dark:bg-slate-900 dark:hover:bg-slate-800 ${
                                            order.status === 'created' 
                                                ? 'bg-white hover:bg-slate-50' 
                                                : (ORDER_STATUS_MAP[order.status]?.color ? `bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-50 hover:bg-${ORDER_STATUS_MAP[order.status].color.match(/bg-([a-z]+)-/)?.[1] || 'slate'}-100` : 'bg-white hover:bg-slate-50')
                                        }`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                                            {order.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-800 border-slate-200'} bg-opacity-10 border-opacity-20 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600`}>
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
