import { useEffect, useMemo, useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useStock } from '../hooks/useStock';
import { Eye, Network, CheckCircle2, Plus, Trash2, Package, FileText, Pencil, AlertTriangle, Search, Menu, Filter, Info, Upload, Download, ArrowRight } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product, ProcurementDispatch, ProcurementDispatchChangeRequest, ProcurementDispatchLine, StockItemFormData } from '../types';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

const STOCK_UNITS = ['Adet', 'Gram', 'Koli', 'Kg', 'Metre', 'Ton', 'Litre'];

export default function Procurement() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products } = useProducts();
    const { stockItems, addStockItem, deleteStockItem, updateStockQuantity } = useStock();
    
    const procurementOrders = orders.filter(o => ['supply_design_process', 'design_approved', 'supply_waiting', 'offer_accepted', 'waiting_manager_approval', 'manager_approved', 'revision_requested'].includes(o.status || ''));

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productJobDetails, setProductJobDetails] = useState<any>(null);
    const [productDesignImages, setProductDesignImages] = useState<string[] | undefined>(undefined);
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [newStockItem, setNewStockItem] = useState<StockItemFormData>({ stockNumber: '', company: '', product: '', quantity: 0, unit: 'Adet' });
    const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
    const [selectedStockItems, setSelectedStockItems] = useState<Record<string, number>>({});
    const [processingOrder, setProcessingOrder] = useState<Order | null>(null);
    const [isRawMaterialsModalOpen, setIsRawMaterialsModalOpen] = useState(false);
    const [selectedOrderForMaterials, setSelectedOrderForMaterials] = useState<Order | null>(null);
    const [dispatches, setDispatches] = useState<ProcurementDispatch[]>([]);
    const [dispatchesLoading, setDispatchesLoading] = useState(false);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [dispatchMode, setDispatchMode] = useState<'create' | 'edit'>('create');
    const [dispatchViewModal, setDispatchViewModal] = useState<{ isOpen: boolean; dispatch: ProcurementDispatch | null }>({ isOpen: false, dispatch: null });
    const [dispatchChangeRequests, setDispatchChangeRequests] = useState<ProcurementDispatchChangeRequest[]>([]);
    const [changeRequestModal, setChangeRequestModal] = useState<{ isOpen: boolean; dispatch: ProcurementDispatch | null; reason: string }>({ isOpen: false, dispatch: null, reason: '' });

    const createEmptyDispatchLine = (): ProcurementDispatchLine => ({ orderId: '', customerName: '', productId: '', productCode: '', productName: '', plateQuantity: 0, printType: 'Gövde', printQuantity: 0, total: 0, plateSize: '' });
    const [dispatchForm, setDispatchForm] = useState({ id: crypto.randomUUID(), dispatchDate: new Date().toISOString().slice(0, 10), vehiclePlate: '', driverNames: '', notes: '', lines: Array.from({ length: 10 }, () => createEmptyDispatchLine()) });

    const fetchDispatches = async () => { try { setDispatchesLoading(true); const res = await fetch('/api/procurement-dispatches'); if (res.ok) { const d = await res.json(); setDispatches(Array.isArray(d) ? d : []); } } catch (e) { setDispatches([]); } finally { setDispatchesLoading(false); } };
    const fetchDispatchChangeRequests = async () => { try { const res = await fetch('/api/procurement-dispatch-change-requests'); if (res.ok) { const d = await res.json(); setDispatchChangeRequests(Array.isArray(d) ? d : []); } } catch (e) { setDispatchChangeRequests([]); } };

    useEffect(() => { fetchDispatches(); fetchDispatchChangeRequests(); }, []);

    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean; item: any | null; quantity: number; }>({ isOpen: false, item: null, quantity: 0 });
    const [quantityModal, setQuantityModal] = useState<{ isOpen: boolean; item: any | null; quantity: number; }>({ isOpen: false, item: null, quantity: 0 });

    const handleViewOrder = (order: Order) => { setSelectedOrder(order); setIsOrderModalOpen(true); };
    const handleProcurementStatusChange = async (orderId: string, status: string) => { if (status === 'completed' && !confirm('Sipariş üretime gönderilsin mi?')) return; await updateOrder(orderId, { procurementStatus: status, status: status === 'completed' ? 'production_pending' : undefined } as any); };

    const handleOpenDispatchModal = async () => {
        try { const res = await fetch('/api/procurement-dispatches/reserve-id', { method: 'POST' }); if (!res.ok) throw new Error(); const data = await res.json();
            setDispatchMode('create'); setDispatchForm({ id: data.id, dispatchDate: new Date().toISOString().slice(0, 10), vehiclePlate: '', driverNames: '', notes: '', lines: Array.from({ length: 10 }, () => createEmptyDispatchLine()) });
            setIsDispatchModalOpen(true);
        } catch (e) { alert('Hata.'); }
    };

    const handleSaveDispatch = async () => {
        const cleanLines = dispatchForm.lines.filter(l => l.orderId && l.productId && l.plateQuantity > 0 && l.printQuantity > 0);
        if (cleanLines.length === 0) { alert('En az 1 satır doldurun.'); return; }
        const payload: ProcurementDispatch = { ...dispatchForm, lines: cleanLines, createdAt: new Date().toISOString() };
        try {
            const res = dispatchMode === 'create' ? await fetch('/api/procurement-dispatches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) : await fetch(`/api/procurement-dispatches/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) { await fetchDispatches(); setIsDispatchModalOpen(false); }
        } catch (e) { alert('Hata.'); }
    };

    const handleSaveProcurement = async () => {
        if (!processingOrder) return;
        for (const [itemId, amount] of Object.entries(selectedStockItems)) { await updateStockQuantity(itemId, { deduct: amount }); }
        const newUsage = { ...processingOrder.stockUsage };
        for (const [itemId, amount] of Object.entries(selectedStockItems)) { newUsage[itemId] = (newUsage[itemId] || 0) + amount; }
        await updateOrder(processingOrder.id, { procurementStatus: 'printing_started', stockUsage: newUsage } as any);
        setIsProcurementModalOpen(false); setProcessingOrder(null); setSelectedStockItems({});
    };

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Tedarik' }, { label: 'Malzeme & Sevk Yönetimi', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<Plus size={13} />} label="Yeni Sevkiyat" variant="primary" onClick={handleOpenDispatchModal} />
                    <ToolbarBtn icon={<Package size={13} />} label="Stok Ekle" onClick={() => setIsAddStockModalOpen(true)} />
                    <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
        >
            <div className="space-y-6">
                {/* Pending Orders Section */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Tedarik Bekleyenler</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold border border-amber-200">{procurementOrders.length} SİPARİŞ</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                                <th className="px-3 py-2 border-r border-slate-100">Sipariş</th>
                                <th className="px-3 py-2 border-r border-slate-100">Müşteri</th>
                                <th className="px-3 py-2 border-r border-slate-100">Ürün Listesi</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-center">Tarih</th>
                                <th className="px-3 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {procurementOrders.map(order => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-[10px] text-slate-400">#{order.id.slice(0, 8)}</td>
                                    <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-700">{order.customerName}</td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                        {order.items.map((item, i) => <div key={i} className="text-[10px] text-slate-600 truncate max-w-[200px]">• {item.productName} ({item.quantity})</div>)}
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center font-bold text-slate-500">{format(new Date(order.createdAt), 'dd.MM.yyyy')}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => handleViewOrder(order)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Detay"><Eye size={13} /></button>
                                            <button onClick={() => { setProcessingOrder(order); setIsProcurementModalOpen(true); }} className="p-1 px-2.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1"><Network size={12} /> TEDARİK</button>
                                            <button onClick={() => handleProcurementStatusChange(order.id, 'completed')} className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1"><CheckCircle2 size={12} /> TAMAMLA</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Dispatch Section */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Sevkiyat Geçmişi</span>
                        <div className="flex items-center gap-2">
                           {dispatchesLoading && <span className="animate-pulse text-blue-500 text-[9px] font-bold">YÜKLENİYOR...</span>}
                           <button onClick={fetchDispatches} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-all"><Network size={12} /></button>
                        </div>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                                <th className="px-3 py-2 border-r border-slate-100 text-center">Fiş No</th>
                                <th className="px-3 py-2 border-r border-slate-100">Araç/Sürücü</th>
                                <th className="px-3 py-2 border-r border-slate-100">Ürünler (Özet)</th>
                                <th className="px-3 py-2 border-r border-slate-100 text-center">Sevk Tarihi</th>
                                <th className="px-3 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dispatches.map(d => (
                                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-slate-100 font-mono text-center text-slate-400">{d.id}</td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                        <div className="font-bold text-slate-700 uppercase tracking-tight">{d.vehiclePlate || '-'}</div>
                                        <div className="text-[9px] text-slate-400 truncate max-w-[150px]">{d.driverNames || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                        <div className="text-[10px] text-slate-600 truncate max-w-[300px]">{Array.from(new Set(d.lines.map(l => l.productName))).join(', ')}</div>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-center font-bold text-slate-500">{format(new Date(d.dispatchDate || d.createdAt), 'dd.MM.yyyy')}</td>
                                    <td className="px-3 py-2 text-right">
                                       <div className="flex justify-end gap-1">
                                          <button onClick={() => setDispatchViewModal({ isOpen: true, dispatch: d })} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded border border-blue-50 transition-colors" title="Görüntüle"><Eye size={13} /></button>
                                          <button onClick={() => { setDispatchMode('edit'); setDispatchForm({ ...d, lines: Array.from({ length: 10 }, (_, i) => d.lines[i] || createEmptyDispatchLine()) } as any); setIsDispatchModalOpen(true); }} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded transition-colors" title="Düzenle"><Pencil size={13} /></button>
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} title={dispatchMode === 'create' ? "Firma Dışı Sevk Fişi (Yeni)" : "Sevk Fişi Düzenle"} size="xl">
                <div className="space-y-4 p-1">
                   <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                      <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Fiş No</label><div className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-blue-600">{dispatchForm.id}</div></div>
                      <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Sevk Tarihi</label><input type="date" value={dispatchForm.dispatchDate} onChange={e => setDispatchForm({...dispatchForm, dispatchDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400" /></div>
                      <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Araç Plaka</label><input type="text" value={dispatchForm.vehiclePlate} onChange={e => setDispatchForm({...dispatchForm, vehiclePlate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400 uppercase" placeholder="34 XXX 99" /></div>
                      <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Sürücü(ler)</label><input type="text" value={dispatchForm.driverNames} onChange={e => setDispatchForm({...dispatchForm, driverNames: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400" /></div>
                   </div>
                   <div className="border border-slate-100 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px] border-collapse">
                         <thead className="bg-slate-50 font-bold text-slate-500 uppercase">
                            <tr><th className="px-2 py-1.5 border-r border-slate-100 w-32">Sipariş</th><th className="px-2 py-1.5 border-r border-slate-100">Ürün</th><th className="px-2 py-1.5 border-r border-slate-100 w-20 text-center">Levha</th><th className="px-2 py-1.5 border-r border-slate-100 w-20 text-center">İş</th><th className="px-2 py-1.5 w-24 text-right">Toplam</th></tr>
                         </thead>
                         <tbody className="bg-white">
                            {dispatchForm.lines.map((l, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                 <td className="p-1 border-r border-slate-100 text-center">
                                    <select value={l.orderId} onChange={e => {
                                      const ord = procurementOrders.find(o => o.id === e.target.value);
                                      const nLines = [...dispatchForm.lines]; nLines[i] = {...nLines[i], orderId: e.target.value, customerName: ord?.customerName || ''}; setDispatchForm({...dispatchForm, lines: nLines});
                                    }} className="w-full p-1 bg-slate-50 rounded border-0 text-[10px] font-mono outline-none">
                                       <option value="">Seçiniz</option>
                                       {procurementOrders.map(o => <option key={o.id} value={o.id}>{o.id.slice(0, 8)} - {o.customerName.slice(0, 10)}...</option>)}
                                    </select>
                                 </td>
                                 <td className="p-1 border-r border-slate-100">
                                     <select value={l.productId} onChange={e => {
                                       const prd = products.find(p => p.id === e.target.value);
                                       const nLines = [...dispatchForm.lines]; nLines[i] = {...nLines[i], productId: e.target.value, productCode: prd?.code || '', productName: prd?.name || ''}; setDispatchForm({...dispatchForm, lines: nLines});
                                     }} className="w-full p-1 bg-slate-50 rounded border-0 text-[10px] outline-none">
                                        <option value="">Ürün Seçiniz</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>)}
                                     </select>
                                 </td>
                                 <td className="p-1 border-r border-slate-100"><input type="number" value={l.plateQuantity} onChange={e => { const nLines = [...dispatchForm.lines]; nLines[i] = {...nLines[i], plateQuantity: Number(e.target.value), total: Number(e.target.value) * l.printQuantity}; setDispatchForm({...dispatchForm, lines: nLines}); }} className="w-full p-1 text-center bg-slate-50 rounded border-0 outline-none" /></td>
                                 <td className="p-1 border-r border-slate-100"><input type="number" value={l.printQuantity} onChange={e => { const nLines = [...dispatchForm.lines]; nLines[i] = {...nLines[i], printQuantity: Number(e.target.value), total: l.plateQuantity * Number(e.target.value)}; setDispatchForm({...dispatchForm, lines: nLines}); }} className="w-full p-1 text-center bg-slate-50 rounded border-0 outline-none" /></td>
                                 <td className="p-1 text-right font-bold text-blue-600 pr-2">{l.total}</td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                   <div className="flex justify-end gap-2 pt-4 border-t border-slate-50"><button onClick={() => setIsDispatchModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Vazgeç</button><button onClick={handleSaveDispatch} className="px-5 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-100">KAYDET VE KAPAT</button></div>
                </div>
            </Modal>

            <Modal isOpen={isProcurementModalOpen} onClose={() => setIsProcurementModalOpen(false)} title="Tedarik Hammadde Kullanımı">
               <div className="space-y-4 p-1">
                  <div className="bg-blue-50 p-3 rounded border border-blue-100 flex items-center justify-between">
                     <div><span className="text-[10px] font-bold text-blue-800 uppercase block">Hedef Sipariş</span><span className="text-xs font-bold text-slate-700 capitalize">{processingOrder?.customerName}</span></div>
                     <ArrowRight size={16} className="text-blue-400" />
                  </div>
                  <div className="max-h-64 overflow-auto border border-slate-100 rounded custom-scrollbar">
                     <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0">
                           <tr><th className="p-2">Hammadde</th><th className="p-2">Stok</th><th className="p-2 text-center">Kullanılan</th></tr>
                        </thead>
                        <tbody>
                           {stockItems.map(item => (
                             <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-700">{item.product}</td>
                                <td className="p-2"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${item.quantity < 100 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{item.quantity} {item.unit}</span></td>
                                <td className="p-1 px-2 text-center">
                                   <input type="number" value={selectedStockItems[item.id] || ''} onChange={e => setSelectedStockItems({...selectedStockItems, [item.id]: Number(e.target.value)})} className="w-16 p-1 text-center bg-white border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400 transition-all font-bold" placeholder="0" />
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-50"><button onClick={() => setIsProcurementModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded text-[10px] font-bold uppercase">İptal</button><button onClick={handleSaveProcurement} className="px-5 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700">İŞLEMİ KAYDET</button></div>
               </div>
            </Modal>
        </ERPPageLayout>
    );
}
