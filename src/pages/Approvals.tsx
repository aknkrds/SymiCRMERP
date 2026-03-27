import { useEffect, useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useUsers } from '../hooks/useUsers';
import { TrendingUp, Users, Filter, Settings, Menu } from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Order, ProcurementDispatchChangeRequest } from '../types';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ROLE_COLOR_MAP: Record<string, string> = {
    'Satış': 'bg-sky-50 text-sky-600 border-sky-100',
    'Tasarımcı': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
    'Matbaa': 'bg-amber-50 text-amber-600 border-amber-100',
    'Fabrika Müdürü': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Muhasebe': 'bg-rose-50 text-rose-600 border-rose-100',
    'Sevkiyat': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'Tedarik': 'bg-teal-50 text-teal-600 border-teal-100',
};

export default function Approvals() {
    const { orders, updateStatus } = useOrders() as any;
    const { users } = useUsers();
    const [dispatchChangeRequests, setDispatchChangeRequests] = useState<ProcurementDispatchChangeRequest[]>([]);

    const fetchDispatchData = async () => {
        try {
            const [r] = await Promise.all([fetch('/api/procurement-dispatch-change-requests')]);
            if (r.ok) setDispatchChangeRequests(await r.json());
        } catch (e) {}
    };

    useEffect(() => { fetchDispatchData(); }, []);

    const gmPending = orders.filter((o: Order) => o.status === 'waiting_manager_approval');
    const dispatchReqs = dispatchChangeRequests.filter((r: ProcurementDispatchChangeRequest) => r.status === 'pending');

    const revenueData = useMemo(() => {
        const data: Record<string, { name: string, total: number }> = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(today, i); const key = format(d, 'yyyy-MM');
            data[key] = { name: format(d, 'MMM', { locale: tr }), total: 0 };
        }
        orders.forEach((o: Order) => {
            const date = parseISO(o.createdAt); const key = format(date, 'yyyy-MM');
            if (data[key]) {
                let amnt = o.grandTotal;
                if (o.currency === 'USD') amnt *= 30; else if (o.currency === 'EUR') amnt *= 33;
                data[key].total += amnt;
            }
        });
        return Object.values(data);
    }, [orders]);

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Yönetim' }, { label: 'Onaylar & Finansal Özet', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<TrendingUp size={13} />} label="Raporlar" />
                    <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Settings size={13} />} />
                </>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Revenue Area */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Tahmini Ciro Trendi (₺)</span>
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full"><TrendingUp size={10} /> +12.5%</div>
                        </div>
                        <div className="h-48 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '10px', fontWeight: 'bold' }} />
                                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pending Actions Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-700 uppercase tracking-widest">ONAY BEKLEYEN İŞLEMLER</div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100 tracking-tighter">
                                    <th className="px-4 py-2">TİP</th>
                                    <th className="px-4 py-2">SİPARİŞ / KAYIT</th>
                                    <th className="px-4 py-2">MÜŞTERİ / DETAY</th>
                                    <th className="px-4 py-2 text-right">AKSİYON</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gmPending.map((o: Order) => (
                                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                                        <td className="px-4 py-3"><span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">SİPARİŞ</span></td>
                                        <td className="px-4 py-3 font-mono text-slate-400 font-bold">#{o.id.slice(0,8)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 uppercase">{o.customerName}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1"><button onClick={() => updateStatus(o.id, 'manager_approved')} className="p-1 px-3 bg-emerald-600 text-white rounded text-[9px] font-bold uppercase hover:bg-emerald-700 shadow-sm shadow-emerald-100">ONAYLA</button><button onClick={() => updateStatus(o.id, 'revision_requested')} className="p-1 px-3 bg-red-50 text-red-600 rounded text-[9px] font-bold border border-red-100 hover:bg-red-100 transition-all">REVİZE</button></div>
                                        </td>
                                    </tr>
                                ))}
                                {dispatchReqs.map(r => (
                                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                                        <td className="px-4 py-3"><span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">SEVK DEĞİŞİKLİĞİ</span></td>
                                        <td className="px-4 py-3 font-mono text-slate-400 font-bold">{r.dispatchId}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 uppercase italic truncate max-w-[150px]">{r.reason}</td>
                                        <td className="px-4 py-3 text-right"><button className="p-1 px-4 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase hover:bg-slate-200">GÖRÜNTÜLE</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Atama / Users Sidebar */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-700 text-[10px] uppercase tracking-widest flex justify-between items-center">Uygulama Ekibi <Users size={12} className="text-slate-400" /></div>
                        <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {users.sort((a,b) => a.fullName.localeCompare(b.fullName, 'tr')).map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-all group border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">{u.fullName.split(' ').map(n=>n[0]).join('')}</div>
                                        <div><div className="text-[10px] font-bold text-slate-700 uppercase leading-none mb-0.5">{u.fullName}</div><div className={`text-[8px] font-bold uppercase italic ${ROLE_COLOR_MAP[u.roleName]?.split(' ')[1] || 'text-slate-400'}`}>{u.roleName}</div></div>
                                    </div>
                                    <button className="p-1 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Menu size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ERPPageLayout>
    );
}
