import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, Trash2, Settings, ArrowRight } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useMessages } from '../hooks/useMessages';
import { useAuth } from '../context/AuthContext';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';
import type { Shift, Message, Order } from '../types';

export default function Reports() {
    const { orders } = useOrders();
    const { fetchAllMessages, deleteMessage } = useMessages();
    const { user } = useAuth();
    
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'monthly' | 'monthly-price' | 'detailed' | 'production' | 'messages'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [dateRange, setDateRange] = useState({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') });

    useEffect(() => { fetch('/api/shifts').then(res => res.json()).then(data => { if (Array.isArray(data)) setShifts(data); }); }, []);
    useEffect(() => { if (activeTab === 'messages') fetchAllMessages().then(setMessages); }, [activeTab, fetchAllMessages]);

    const monthOrders = useMemo(() => {
        const [y, m] = selectedMonth.split('-');
        return orders.filter((o: Order) => { const d = new Date(o.createdAt); return d.getFullYear() === parseInt(y) && d.getMonth() === parseInt(m) - 1; });
    }, [orders, selectedMonth]);

    const stats = useMemo(() => ({
        totalOrders: monthOrders.length,
        totalSales: monthOrders.reduce((acc, o) => acc + o.grandTotal, 0),
        totalProduction: shifts.filter(s => { const d = new Date(s.startTime || s.createdAt); const [y, m] = selectedMonth.split('-'); return d.getFullYear() === parseInt(y) && d.getMonth() === parseInt(m) - 1; }).reduce((acc, s) => acc + (s.producedQuantity || 0), 0)
    }), [monthOrders, shifts, selectedMonth]);

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Analiz' }, { label: 'Raporlar & İstatistikler', active: true }]}
            toolbar={
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 overflow-x-auto no-scrollbar max-w-[500px]">
                    <button onClick={() => setActiveTab('monthly')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'monthly' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>AYLIK ÖZET</button>
                    <button onClick={() => setActiveTab('monthly-price')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'monthly-price' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>FİNANSAL</button>
                    <button onClick={() => setActiveTab('detailed')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'detailed' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>DETAYLI</button>
                    <button onClick={() => setActiveTab('production')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'production' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>ÜRETİM</button>
                    {user?.roleName === 'Admin' && <button onClick={() => setActiveTab('messages')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>MESAJLAR</button>}
                </div>
            }
            toolbarRight={
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1"><Calendar size={12} className="text-slate-400 mr-2" /><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-[10px] font-bold outline-none bg-transparent" title="Ay Seçimi" /></div>
                    <ToolbarBtn icon={<Settings size={13} />} />
                </div>
            }
        >
            {(activeTab === 'monthly' || activeTab === 'monthly-price') && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOPLAM SİPARİŞ</div><div className="text-3xl font-mono font-bold text-slate-800">{stats.totalOrders}</div><div className="mt-2 text-[10px] text-slate-400 font-bold uppercase italic tracking-tighter">BU AYIN VERİSİ</div></div>
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ÜRETİM KAPASİTESİ</div><div className="text-3xl font-mono font-bold text-slate-800">{stats.totalProduction.toLocaleString()}</div><div className="mt-2 text-[10px] text-blue-500 font-bold uppercase italic tracking-tighter">AKTİF ÇALIŞMA</div></div>
                        {activeTab === 'monthly-price' && <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100 shadow-sm"><div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">TOPLAM SATIŞ (₺)</div><div className="text-3xl font-mono font-bold text-emerald-700">{stats.totalSales.toLocaleString('tr-TR')}</div><div className="mt-2 text-[10px] text-emerald-500 font-bold uppercase italic tracking-tighter">NET GELİR</div></div>}
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><span className="font-bold text-slate-700 uppercase tracking-widest">AYLIK İŞLEM ÖZETİ</span></div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100 tracking-tighter"><th className="px-4 py-2">SİPARİŞ</th><th className="px-4 py-2">MÜŞTERİ</th><th className="px-4 py-2">TARİH</th><th className="px-4 py-2 text-center">DURUM</th>{activeTab === 'monthly-price' && <th className="px-4 py-2 text-right">TUTAR</th>}</tr>
                            </thead>
                            <tbody>
                                {monthOrders.map((o: Order) => (
                                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                                        <td className="px-4 py-3 font-mono text-slate-400 font-bold">#{o.id.slice(0,8)}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 uppercase tracking-tight">{o.customerName}</td>
                                        <td className="px-4 py-3 text-slate-500 font-bold">{format(new Date(o.createdAt), 'dd.MM.yyyy')}</td>
                                        <td className="px-4 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase">{o.status}</span></td>
                                        {activeTab === 'monthly-price' && <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{o.grandTotal.toLocaleString('tr-TR')} {o.currency}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'production' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="flex gap-2">
                             <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Başlangıç</label><input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border border-slate-200 rounded p-1 text-[10px] font-bold outline-none" /></div>
                             <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Bitiş</label><input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="border border-slate-200 rounded p-1 text-[10px] font-bold outline-none" /></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100 tracking-tighter">
                                <tr>
                                    <th className="p-4">MAKİNE / HAT</th>
                                    <th className="p-4 text-center">PLANLANAN</th>
                                    <th className="p-4 text-center">ÜRETİLEN</th>
                                    <th className="p-4 text-center">FİRE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map(s => (
                                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all font-bold">
                                        <td className="p-4 text-slate-700 uppercase">{s.machineId || 'GENEL'}</td>
                                        <td className="p-4 text-center text-slate-400 font-mono">{s.plannedQuantity || 0}</td>
                                        <td className="p-4 text-center text-blue-600 font-mono">{s.producedQuantity || 0}</td>
                                        <td className="p-4 text-center text-red-500 font-mono">{s.scrapQuantity || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-[11px]">
                    <div className="divide-y divide-slate-100">
                        {messages.length === 0 ? <div className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase">KAYITLI MESAJ BULUNAMADI</div> : messages.map(m => (
                            <div key={m.id} className="p-4 hover:bg-slate-50 transition-all flex justify-between items-start group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-blue-600 uppercase italic">{m.senderName}</span><ArrowRight size={10} className="text-slate-300" /><span className="text-[10px] font-bold text-slate-700 uppercase italic">{m.recipientName}</span></div>
                                    <div className="text-xs font-bold text-slate-800 uppercase">{m.subject || '(KONUSUZ)'}</div>
                                    <div className="text-[11px] text-slate-500 leading-relaxed">{m.content}</div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2 text-[9px] font-bold text-slate-400">
                                    <span className="whitespace-nowrap">{format(new Date(m.createdAt), 'dd MMM HH:mm', { locale: tr })}</span>
                                    <button onClick={() => deleteMessage(m.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </ERPPageLayout>
    );
}
