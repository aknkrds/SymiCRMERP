import { useOrders } from '../hooks/useOrders';
import { Package, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ORDER_STATUS_MAP } from '../constants/orderStatus';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Dashboard() {
    const { orders } = useOrders();

    const stats = [
        {
            label: 'Toplam Sipariş',
            value: orders.length,
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            label: 'Aktif Üretim',
            value: orders.filter(o => o.status === 'in_production').length,
            icon: TrendingUp,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
        },
        {
            label: 'Bekleyen Teklif',
            value: orders.filter(o => o.status === 'offer_sent').length,
            icon: AlertCircle,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
        {
            label: 'Teslim Edilen',
            value: orders.filter(o => o.status === 'shipped').length,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
        },
    ];

    const recentOrders = orders.slice(0, 5); // Show last 5 orders

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 text-sm">{format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
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

            {/* Orders List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Son Siparişler</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
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
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{order.customerName}</td>
                                        <td className="px-6 py-4">
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">
                                            {order.grandTotal.toFixed(2)} {order.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-slate-100 text-slate-800'}`}>
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
