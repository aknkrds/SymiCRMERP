import { useMemo, useState, useEffect } from 'react';
import { Plus, Factory, Truck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { useStock } from '../hooks/useStock';
import { useProducts } from '../hooks/useProducts';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';
import type { Order, Personnel, Machine, Shift, ProcurementDispatch, ProductionJob, WarehouseLocation } from '../types';

const API_URL = '/api';

export default function Production() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [dispatches, setDispatches] = useState<ProcurementDispatch[]>([]);
    const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
    const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
    const [activeTab, setActiveTab] = useState<'line' | 'incoming' | 'assets'>('line');
    const { stockItems } = useStock();

    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
    const [prodForm, setProdForm] = useState({ machineId: '', target: 0 });

    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logForm, setLogForm] = useState({
        reportedAtLocal: '',
        bodyQty: 0,
        lidQty: 0,
        scrapBody: 0,
        scrapLid: 0,
        scrapBottom: 0,
        locationCode: 'GENEL',
        note: ''
    });

    const fetchData = async () => {
        try {
            const [o, p, m, s, d, j, wl] = await Promise.all([
                fetch(`${API_URL}/orders`),
                fetch(`${API_URL}/personnel`),
                fetch(`${API_URL}/machines`),
                fetch(`${API_URL}/shifts`),
                fetch(`/api/procurement-dispatches`),
                fetch(`/api/production-jobs`),
                fetch(`/api/warehouse-locations`)
            ]);
            if (o.ok) setOrders(await o.json());
            if (p.ok) setPersonnel(await p.json());
            if (m.ok) setMachines(await m.json());
            if (s.ok) setShifts(await s.json());
            if (d.ok) setDispatches(await d.json());
            if (j.ok) setProductionJobs(await j.json());
            if (wl.ok) setWarehouseLocations(await wl.json());
        } catch (e) {}
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, []);

    const incomingDispatches = dispatches.filter(d => !d.productionApprovedAt);
    const activeJobs = productionJobs.filter(j => j.status === 'active' || j.status === 'queued');

    const handleStartProduction = async () => {
        if (!selectedJob) return;
        try {
            await fetch(`${API_URL}/production-jobs/${selectedJob.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machineId: prodForm.machineId,
                    plannedQuantity: prodForm.target,
                    status: 'active',
                    startedAt: new Date().toISOString()
                })
            });
            await fetch(`${API_URL}/orders/${selectedJob.orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'production_started', productionStatus: 'production_started' }) });
            setIsStartModalOpen(false); fetchData();
        } catch(e) { alert('Hata.'); }
    };

    const handleReceiveDispatch = async (dispatchId: string) => {
        try {
            const res = await fetch(`${API_URL}/production-jobs/from-dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dispatchId })
            });
            if (!res.ok) throw new Error('not ok');
            await fetchData();
            setActiveTab('line');
        } catch (e) {
            alert('Sevk teslim alınamadı.');
        }
    };

    const openLogModal = (job: ProductionJob) => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setSelectedJob(job);
        setLogForm({
            reportedAtLocal: local,
            bodyQty: 0,
            lidQty: 0,
            scrapBody: 0,
            scrapLid: 0,
            scrapBottom: 0,
            locationCode: 'GENEL',
            note: ''
        });
        setIsLogModalOpen(true);
    };

    const handleSaveLog = async () => {
        if (!selectedJob) return;
        const bodyQty = Number(logForm.bodyQty) || 0;
        const lidQty = Number(logForm.lidQty) || 0;
        const bottomQty = bodyQty;
        const reportedAt = new Date(logForm.reportedAtLocal).toISOString();
        try {
            const res = await fetch(`${API_URL}/production-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    jobId: selectedJob.id,
                    reportedAt,
                    bodyQty,
                    lidQty,
                    bottomQty,
                    scrapBody: Number(logForm.scrapBody) || 0,
                    scrapLid: Number(logForm.scrapLid) || 0,
                    scrapBottom: Number(logForm.scrapBottom) || 0,
                    locationCode: logForm.locationCode || 'GENEL',
                    note: logForm.note || null,
                    createdAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error('not ok');
            setIsLogModalOpen(false);
            await fetchData();
        } catch (e) {
            alert('Üretim kaydı kaydedilemedi.');
        }
    };

    const jobOrder = useMemo(() => {
        if (!selectedJob) return null;
        return orders.find(o => o.id === selectedJob.orderId) || null;
    }, [orders, selectedJob]);

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Üretim' }, { label: 'Üretim Hattı & Yönetimi', active: true }]}
            toolbar={
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                    <button onClick={() => setActiveTab('line')} className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTab === 'line' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>HATTIN DURUMU</button>
                    <button onClick={() => setActiveTab('incoming')} className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'incoming' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>GELEN İŞLER {incomingDispatches.length > 0 && <span className="bg-amber-500 text-white w-3 h-3 flex items-center justify-center rounded-full text-[8px]">{incomingDispatches.length}</span>}</button>
                    <button onClick={() => setActiveTab('assets')} className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-all ${activeTab === 'assets' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>VARLIKLAR</button>
                </div>
            }
            toolbarRight={
                <div className="flex items-center gap-1.5">
                    <ToolbarBtn icon={<Plus size={13} />} label="Personel Ekle" />
                    <ToolbarBtn icon={<Factory size={13} />} label="Makine Ekle" />
                </div>
            }
        >
            {activeTab === 'line' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center whitespace-nowrap">
                                <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Aktif Üretim Hattı</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 text-[9px]">{activeJobs.length} İŞLEM</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3">Sipariş</th>
                                            <th className="px-5 py-3">Ürün</th>
                                            <th className="px-5 py-3">Makine</th>
                                            <th className="px-5 py-3 w-48 text-center">İlerleme</th>
                                            <th className="px-5 py-3 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activeJobs.length === 0 ? (
                                            <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Şu anda aktif üretim bulunmuyor.</td></tr>
                                        ) : activeJobs.map(j => {
                                            const m = machines.find(m => m.id === j.machineId);
                                            const progress = j.plannedQuantity ? Math.round(((j.producedBody || 0) / j.plannedQuantity) * 100) : 0;
                                            return (
                                                <tr key={j.id} className="hover:bg-blue-50/30 transition-all group">
                                                    <td className="px-5 py-4 font-mono text-blue-600 font-bold">#{j.orderId.slice(0, 8)}</td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-slate-700 uppercase tracking-tight">{j.productName || 'ÜRÜN'}</div>
                                                        <div className="text-[9px] text-slate-400 font-medium">DURUM: {(j.status || '').toUpperCase()}</div>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-slate-100 rounded text-slate-500"><Factory size={12} /></div>
                                                            <span className="text-slate-600 font-bold uppercase">{m?.machineNumber || 'PLANLANDI'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                                                                <span className="text-blue-600">%{progress}</span>
                                                                <span>{j.producedBody || 0} / {j.plannedQuantity || 0}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                                                                <div className="bg-blue-500 h-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            {j.status === 'queued' && (
                                                                <button
                                                                    onClick={() => { setSelectedJob(j); setProdForm({ machineId: '', target: j.plannedQuantity || 0 }); setIsStartModalOpen(true); }}
                                                                    className="p-1.5 px-4 bg-white text-blue-600 rounded-lg text-[9px] font-bold border border-blue-100 hover:bg-blue-50 hover:shadow-sm transition-all uppercase tracking-tighter"
                                                                >
                                                                    BAŞLAT
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openLogModal(j)}
                                                                className="p-1.5 px-4 bg-white text-slate-700 rounded-lg text-[9px] font-bold border border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all uppercase tracking-tighter"
                                                            >
                                                                KAYIT GİR
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 -mr-4 -mt-4 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-5 tracking-[0.2em] relative">Sistem Panoraması</h3>
                            <div className="grid grid-cols-2 gap-4 relative">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/80 group hover:border-blue-200 transition-all">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex justify-between">MAKİNE <Factory size={10} className="text-slate-300 group-hover:text-blue-400 transition-colors" /></div>
                                    <div className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">{machines.length}</div>
                                </div>
                                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 group hover:border-indigo-200 transition-all">
                                    <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-1 flex justify-between">PERSONEL <Users size={10} className="text-indigo-300 group-hover:text-indigo-400 transition-colors" /></div>
                                    <div className="text-2xl font-bold text-slate-800 font-mono tracking-tighter">{personnel.length}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-[0.2em]">Özet İstatistikler</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[11px] font-medium text-slate-600">Aktif Shift Sayısı</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-800 font-mono">{activeJobs.filter(j => j.status === 'active').length}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        <span className="text-[11px] font-medium text-slate-600">Gelen İş Bekliyor</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-800 font-mono">{incomingDispatches.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'incoming' && (
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Onay Bekleyen Sevkiyat & Üretim Girişleri</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3">Fiş No</th>
                                    <th className="px-5 py-3">Araç / Sürücü</th>
                                    <th className="px-5 py-3">İçerik Detayı</th>
                                    <th className="px-5 py-3 text-right">Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {incomingDispatches.length === 0 ? (
                                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">Bekleyen sevkiyat girişi bulunmuyor.</td></tr>
                                ) : incomingDispatches.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="px-5 py-4 font-mono text-slate-400 font-bold">#{d.id.split('-')[0].toUpperCase()}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Truck size={14} /></div>
                                                <div>
                                                    <div className="font-bold text-slate-700 uppercase tracking-tight">{d.vehiclePlate || 'TANIMSIZ'}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{d.driverNames || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg">
                                                <span className="text-[10px] font-bold">{d.lines.reduce((acc, l) => acc + (l.total || 0), 0).toLocaleString()} ADET</span>
                                                <span className="w-1 h-1 rounded-full bg-amber-300"></span>
                                                <span className="text-[9px] font-medium uppercase tracking-widest">Toplam Baskı</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => handleReceiveDispatch(d.id)} 
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-100 transition-all active:scale-95"
                                            >
                                                <Plus size={11} /> TESLİM AL
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'assets' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-700 uppercase tracking-widest flex justify-between items-center">
                            <span>Makine Parkı</span>
                            <Factory size={13} className="text-slate-300" />
                        </div>
                        <div className="divide-y divide-slate-50">
                            {machines.map(m => (
                                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <Factory size={16} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">{m.machineNumber}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{m.features}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">ÇALIŞIR DURUMDA</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-700 uppercase tracking-widest flex justify-between items-center">
                            <span>Ekip Üyeleri</span>
                            <Users size={13} className="text-slate-300" />
                        </div>
                        <div className="divide-y divide-slate-50">
                            {personnel.map(p => (
                                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all font-bold text-xs uppercase shadow-sm">
                                            {p.firstName[0]}{p.lastName[0]}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.firstName} {p.lastName}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.role}</div>
                                        </div>
                                    </div>
                                    <button className="text-[9px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">DÜZENLE</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} title="Üretime Başla" size="md">
                <div className="space-y-6">
                    <div className="relative p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-lg overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 -mr-6 -mt-6 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-2 block">Aktif İş Emri Ataması</span>
                            <div className="text-sm font-bold uppercase tracking-tight">{jobOrder?.customerName || 'Müşteri'}</div>
                            <div className="text-[11px] font-medium text-white/80 mt-1 uppercase tracking-wide">{selectedJob?.productName || 'Ürün'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Üretim Hattı / Makine</label>
                            <select 
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 font-bold transition-all" 
                                value={prodForm.machineId} 
                                onChange={e => setProdForm({...prodForm, machineId: e.target.value})}
                                title="Üretim Hattı / Makine"
                                aria-label="Üretim Hattı / Makine"
                            >
                                <option value="">Makine Seçiniz</option>
                                {machines.map(m => (
                                    <option key={m.id} value={m.id}>{m.machineNumber} ( {m.features} )</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Hedef Üretim Miktarı</label>
                            <input 
                                type="number" 
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 font-mono font-bold transition-all" 
                                value={prodForm.target} 
                                onChange={e => setProdForm({...prodForm, target: Number(e.target.value)})} 
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            onClick={() => setIsStartModalOpen(false)} 
                            className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                            İPTAL
                        </button>
                        <button 
                            onClick={handleStartProduction} 
                            disabled={!prodForm.machineId || !prodForm.target}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            ÜRETİMİ BAŞLAT
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Üretim Kaydı" size="lg" theme="minimal">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Tarih & Saat</div>
                            <input
                                type="datetime-local"
                                value={logForm.reportedAtLocal}
                                onChange={(e) => setLogForm(prev => ({ ...prev, reportedAtLocal: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                aria-label="Tarih ve saat"
                            />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Depo Alanı</div>
                            <select
                                value={logForm.locationCode}
                                onChange={(e) => setLogForm(prev => ({ ...prev, locationCode: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                aria-label="Depo Alanı"
                            >
                                <option value="GENEL">GENEL</option>
                                {warehouseLocations.map(l => (
                                    <option key={l.code} value={l.code}>{l.code} {l.label ? `- ${l.label}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-[var(--text-main)] truncate">{selectedJob?.productName || 'Ürün'}</div>
                                <div className="text-[11px] text-[var(--text-muted)] font-mono">#{selectedJob?.orderId?.slice(0, 8)}</div>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">
                                {selectedJob?.producedBody || 0} / {selectedJob?.plannedQuantity || 0}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Gövde</div>
                                <input
                                    type="number"
                                    min="0"
                                    value={logForm.bodyQty || 0}
                                    onChange={(e) => setLogForm(prev => ({ ...prev, bodyQty: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                    aria-label="Gövde adedi"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Kapak</div>
                                <input
                                    type="number"
                                    min="0"
                                    value={logForm.lidQty || 0}
                                    onChange={(e) => setLogForm(prev => ({ ...prev, lidQty: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                    aria-label="Kapak adedi"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Dip</div>
                                <input
                                    type="number"
                                    value={Number(logForm.bodyQty) || 0}
                                    readOnly
                                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm outline-none"
                                    aria-label="Dip adedi"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Fire Gövde</div>
                            <input
                                type="number"
                                min="0"
                                value={logForm.scrapBody || 0}
                                onChange={(e) => setLogForm(prev => ({ ...prev, scrapBody: Number(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                aria-label="Fire Gövde"
                            />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Fire Kapak</div>
                            <input
                                type="number"
                                min="0"
                                value={logForm.scrapLid || 0}
                                onChange={(e) => setLogForm(prev => ({ ...prev, scrapLid: Number(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                aria-label="Fire Kapak"
                            />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Fire Dip</div>
                            <input
                                type="number"
                                min="0"
                                value={logForm.scrapBottom || 0}
                                onChange={(e) => setLogForm(prev => ({ ...prev, scrapBottom: Number(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                                aria-label="Fire Dip"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Not</div>
                        <textarea
                            value={logForm.note}
                            onChange={(e) => setLogForm(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full min-h-20 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none resize-none"
                            placeholder="Opsiyonel not..."
                            aria-label="Not"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsLogModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-slate-50 text-sm"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveLog}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                            Kaydet
                        </button>
                    </div>
                </div>
            </Modal>
        </ERPPageLayout>
    );
}
