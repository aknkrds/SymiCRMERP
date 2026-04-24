import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { Eye, Plus, X, Upload, PencilLine, Info, CheckCircle2, Search, Menu, Filter, Settings, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ProductDetail } from '../components/products/ProductDetail';
import type { Order, Product } from '../types';
import { ProductForm } from '../components/products/ProductForm';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Design() {
    const { orders, updateStatus, updateOrder } = useOrders();
    const { products, updateProduct } = useProducts();
    
    const designOrders = orders.filter(o => (o.status === 'supply_design_process' || o.status === 'design_pending' || o.status === 'offer_accepted' || o.status === 'waiting_manager_approval' || o.status === 'manager_approved' || o.status === 'revision_requested') && o.designStatus !== 'completed');

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [uploadOrder, setUploadOrder] = useState<Order | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<{ url: string; productId?: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedUploadProductId, setSelectedUploadProductId] = useState<string>('');
    const [infoOrder, setInfoOrder] = useState<Order | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [infoSelectedItemId, setInfoSelectedItemId] = useState<string | null>(null);
    const [jobOrder, setJobOrder] = useState<Order | null>(null);
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [jobSelectedProductId, setJobSelectedProductId] = useState<string>('');
    const [jobDetailsByProduct, setJobDetailsByProduct] = useState<Record<string, { type: 'Gövde'|'Kapak'|'Dip'; jobSize: string; boxSize: string; efficiency: string; includesKapak?: boolean; includesDip?: boolean; }[]>>({});

    const handleSendToGM = async (orderId: string) => { if (confirm('Genel Müdür onayına gönderilsin mi?')) await updateStatus(orderId, 'waiting_manager_approval'); };
    const handleCompleteDesign = async (orderId: string) => { if (confirm('Tasarım tamamlandı mı?')) await updateOrder(orderId, { designStatus: 'completed' } as any); };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !uploadOrder) return;
        const maxPerProduct = 5;
        const targetProductId = selectedUploadProductId || uploadOrder.items[0]?.productId || '';
        if (!targetProductId) return;
        if (!selectedUploadProductId) setSelectedUploadProductId(targetProductId);

        const existingCount = uploadedImages.filter(img => img.productId === targetProductId).length;
        const remaining = Math.max(0, maxPerProduct - existingCount);
        const files = Array.from(e.target.files).slice(0, remaining);
        if (files.length === 0) return;

        setIsUploading(true);
        for (const file of files) {
            const fd = new FormData(); fd.append('image', file);
            try {
                const res = await fetch('/api/upload?folder=tasarim', { method: 'POST', body: fd });
                if (res.ok) {
                    const d = await res.json();
                    setUploadedImages(prev => [...prev, { url: d.url, productId: targetProductId }]);
                }
            } catch (e) {}
        }
        setIsUploading(false); e.target.value = '';
    };

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Tasarım' }, { label: 'Tasarım Onayları & Teknik Çizim', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<Plus size={13} />} label="Yeni Tasarım" variant="primary" onClick={() => setIsUploadModalOpen(true)} />
                    <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
        >
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Tasarım Bekleyenler</span></div>
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                            <th className="px-4 py-2">Sipariş</th>
                            <th className="px-4 py-2">Müşteri</th>
                            <th className="px-4 py-2">Ürün Detayları</th>
                            <th className="px-4 py-2 text-center">Durum</th>
                            <th className="px-4 py-2 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {designOrders.map(o => (
                            <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all group">
                                <td className="px-4 py-3 font-mono text-slate-400 font-bold">#{o.id.slice(0, 8)}</td>
                                <td className="px-4 py-3 font-bold text-slate-700 uppercase tracking-tight">{o.customerName}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-1 max-w-[250px]">
                                        {o.items.map((item, i) => <div key={i} className="text-[10px] text-slate-500 font-medium truncate">• {item.productName}</div>)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold border ${o.status === 'waiting_manager_approval' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {o.status === 'waiting_manager_approval' ? 'GM ONAYINDA' : 'TASARIMDA'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setInfoOrder(o); setInfoSelectedItemId(o.items[0]?.productId || null); setIsInfoModalOpen(true); }} className="p-1 px-3 bg-teal-50 text-teal-600 rounded text-[9px] font-bold border border-teal-100 hover:bg-teal-100 transition-all">BİLGİ</button>
                                        <button onClick={() => {
                                            const defaultProductId = o.items[0]?.productId || '';
                                            setUploadOrder(o);
                                            setSelectedUploadProductId(defaultProductId);
                                            setUploadedImages((o.designImages || []).map(img => {
                                                if (typeof img === 'string') return { url: img, productId: defaultProductId };
                                                return { ...img, productId: img.productId || defaultProductId };
                                            }));
                                            setIsUploadModalOpen(true);
                                        }} className="p-1 px-3 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100 hover:bg-indigo-100 transition-all">GÖRSEL</button>
                                        <button onClick={() => {
                                            const defaultProductId = o.items[0]?.productId || '';
                                            const source = (o.designJobDetails && typeof o.designJobDetails === 'object') ? o.designJobDetails : {};
                                            const next: Record<string, { type: 'Gövde'|'Kapak'|'Dip'; jobSize: string; boxSize: string; efficiency: string; includesKapak?: boolean; includesDip?: boolean; }[]> = {};
                                            for (const it of o.items) {
                                                const existing = (source as any)[it.productId];
                                                if (Array.isArray(existing)) {
                                                    next[it.productId] = existing;
                                                } else if (existing && typeof existing === 'object') {
                                                    next[it.productId] = [{
                                                        type: 'Gövde',
                                                        jobSize: existing.jobSize || '',
                                                        boxSize: existing.boxSize || '',
                                                        efficiency: existing.efficiency || ''
                                                    }];
                                                } else {
                                                    const fallbackFromOrder = it.productId === defaultProductId
                                                        ? { jobSize: o.jobSize || '', boxSize: o.boxSize || '', efficiency: o.efficiency || '' }
                                                        : { jobSize: '', boxSize: '', efficiency: '' };
                                                    next[it.productId] = [{
                                                        type: 'Gövde',
                                                        jobSize: fallbackFromOrder.jobSize,
                                                        boxSize: fallbackFromOrder.boxSize,
                                                        efficiency: fallbackFromOrder.efficiency
                                                    }];
                                                }
                                            }
                                            setJobOrder(o);
                                            setJobSelectedProductId(defaultProductId);
                                            setJobDetailsByProduct(next);
                                            setIsJobModalOpen(true);
                                        }} className="p-1 px-3 bg-slate-50 text-slate-600 rounded text-[9px] font-bold border border-slate-100 hover:bg-slate-100 transition-all">LEVHA</button>
                                        <button onClick={() => handleSendToGM(o.id)} disabled={o.status === 'waiting_manager_approval'} className="p-1 px-3 bg-orange-50 text-orange-600 rounded text-[9px] font-bold border border-orange-100 hover:bg-orange-100 transition-all disabled:opacity-30">GM ONAYI</button>
                                        <button onClick={() => handleCompleteDesign(o.id)} disabled={o.status !== 'manager_approved'} className="p-1 px-3 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-all disabled:opacity-30">TAMAMLA</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Tasarım Görsel Yönetimi">
                <div className="space-y-4 p-1">
                    {!uploadOrder ? (
                        <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
                            <p className="text-xs text-slate-500 font-bold mb-4 uppercase">Önce bir sipariş seçiniz</p>
                            <select
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none"
                                aria-label="Sipariş Seçimi"
                                onChange={e => {
                                    const o = designOrders.find(do_ => do_.id === e.target.value);
                                    if (o) {
                                        const defaultProductId = o.items[0]?.productId || '';
                                        setUploadOrder(o);
                                        setSelectedUploadProductId(defaultProductId);
                                        setUploadedImages((o.designImages || []).map(img => {
                                            if (typeof img === 'string') return { url: img, productId: defaultProductId };
                                            return { ...img, productId: img.productId || defaultProductId };
                                        }));
                                    }
                                }}
                            >
                                <option value="">Sipariş Seçiniz...</option>
                                {designOrders.map(o => <option key={o.id} value={o.id}>{o.customerName} (#{o.id.slice(0,8)})</option>)}
                            </select>
                        </div>
                    ) : (
                        <>
                            <div className="bg-indigo-50 p-2 rounded border border-indigo-100 text-[10px] font-bold text-indigo-700 uppercase text-center">{uploadOrder.customerName}</div>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {uploadOrder.items.map(item => (
                                    <button
                                        key={item.productId}
                                        onClick={() => setSelectedUploadProductId(item.productId)}
                                        className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase whitespace-nowrap border transition-all ${selectedUploadProductId === item.productId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                                    >
                                        {item.productName}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {uploadedImages
                                    .map((img, idx) => ({ img, idx }))
                                    .filter(({ img }) => !!selectedUploadProductId && img.productId === selectedUploadProductId)
                                    .map(({ img, idx }) => (
                                    <div key={idx} className="relative w-20 h-20 rounded border border-slate-200 overflow-hidden group">
                                        <img src={img.url} alt="Tasarım" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setUploadedImages(prev => prev.filter((_, j) => j !== idx))}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100"
                                            aria-label="Görseli kaldır"
                                            title="Kaldır"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                                {uploadedImages.filter(img => img.productId === selectedUploadProductId).length < 5 && (
                                    <label className="w-20 h-20 rounded border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                                        <Plus size={14} className="text-slate-400" />
                                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 text-center">GÖRSEL EKLE</span>
                                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
                                    </label>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1">
                                    {isUploading ? 'Yükleniyor...' : 'Seçili ürün için en fazla 5 görsel ekleyebilirsiniz'}
                                </div>
                                <div className="text-[10px] font-bold text-slate-600">
                                    {uploadedImages.filter(img => img.productId === selectedUploadProductId).length}/5
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 flex justify-end gap-2"><button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-500 text-[10px] font-bold uppercase">Kapat</button><button onClick={async () => { await updateOrder(uploadOrder.id, { designImages: uploadedImages } as any); setIsUploadModalOpen(false); }} className="px-5 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-md shadow-blue-100">KAYDET</button></div>
                        </>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Ürün Bilgi Girişi">
                <div className="space-y-4 p-1">
                   {infoOrder && (
                       <>
                           <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                               {infoOrder.items.map(item => (
                                   <button key={item.productId} onClick={() => setInfoSelectedItemId(item.productId)} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase whitespace-nowrap border transition-all ${infoSelectedItemId === item.productId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}>{item.productName}</button>
                               ))}
                           </div>
                           {infoSelectedItemId && products.find(p => p.id === infoSelectedItemId) && (
                               <ProductForm initialData={products.find(p => p.id === infoSelectedItemId)!} onSubmit={async (data) => { await updateProduct(infoSelectedItemId!, data); setIsInfoModalOpen(false); }} onCancel={() => setIsInfoModalOpen(false)} />
                           )}
                       </>
                   )}
                </div>
            </Modal>

            <Modal isOpen={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} title="Levha Bilgileri">
                <div className="space-y-4 p-1">
                    {jobOrder ? (
                        <>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {jobOrder.items.map(item => (
                                    <button
                                        key={item.productId}
                                        onClick={() => setJobSelectedProductId(item.productId)}
                                        className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase whitespace-nowrap border transition-all ${jobSelectedProductId === item.productId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                                    >
                                        {item.productName}
                                    </button>
                                ))}
                            </div>

                            {!jobSelectedProductId ? (
                                <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Ürün seçiniz</p>
                                </div>
                            ) : (
                            <div className="space-y-4">
                                {(() => {
                                    const plates = jobDetailsByProduct[jobSelectedProductId] || [];
                                    const availableTypes = ['Kapak', 'Dip'] as const;
                                    
                                    return (
                                        <>
                                            {plates.map((plate, pIdx) => (
                                                <div key={pIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                                                    {plate.type !== 'Gövde' && (
                                                        <button 
                                                            onClick={() => setJobDetailsByProduct(prev => ({ ...prev, [jobSelectedProductId]: prev[jobSelectedProductId].filter((_, i) => i !== pIdx) }))}
                                                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                                                            title="Kaldır"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <span className="text-[11px] font-bold text-slate-700 uppercase">{plate.type} Levhası</span>
                                                        {plate.type === 'Gövde' && (
                                                            <div className="flex gap-3">
                                                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={plate.includesKapak || false} 
                                                                        onChange={e => {
                                                                            setJobDetailsByProduct(prev => {
                                                                                const n = [...prev[jobSelectedProductId]];
                                                                                n[pIdx] = { ...n[pIdx], includesKapak: e.target.checked };
                                                                                return { ...prev, [jobSelectedProductId]: n };
                                                                            });
                                                                        }} 
                                                                        className="accent-blue-600 w-3 h-3" 
                                                                    />
                                                                    Aynı Levhada Kapak
                                                                </label>
                                                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={plate.includesDip || false} 
                                                                        onChange={e => {
                                                                            setJobDetailsByProduct(prev => {
                                                                                const n = [...prev[jobSelectedProductId]];
                                                                                n[pIdx] = { ...n[pIdx], includesDip: e.target.checked };
                                                                                return { ...prev, [jobSelectedProductId]: n };
                                                                            });
                                                                        }} 
                                                                        className="accent-blue-600 w-3 h-3" 
                                                                    />
                                                                    Aynı Levhada Dip
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Levha Ebadı</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none"
                                                                value={plate.jobSize}
                                                                onChange={(e) => setJobDetailsByProduct(prev => {
                                                                    const n = [...prev[jobSelectedProductId]];
                                                                    n[pIdx] = { ...n[pIdx], jobSize: e.target.value };
                                                                    return { ...prev, [jobSelectedProductId]: n };
                                                                })}
                                                                placeholder="Örn: 70x100"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Levha Adeti</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none"
                                                                value={plate.boxSize}
                                                                onChange={(e) => setJobDetailsByProduct(prev => {
                                                                    const n = [...prev[jobSelectedProductId]];
                                                                    n[pIdx] = { ...n[pIdx], boxSize: e.target.value };
                                                                    return { ...prev, [jobSelectedProductId]: n };
                                                                })}
                                                                placeholder="Örn: 500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Montaj</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none"
                                                                value={plate.efficiency}
                                                                onChange={(e) => setJobDetailsByProduct(prev => {
                                                                    const n = [...prev[jobSelectedProductId]];
                                                                    n[pIdx] = { ...n[pIdx], efficiency: e.target.value };
                                                                    return { ...prev, [jobSelectedProductId]: n };
                                                                })}
                                                                placeholder="Örn: 2 veya 4"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {(() => {
                                                const usedTypes = plates.map(p => p.type);
                                                const govde = plates.find(p => p.type === 'Gövde');
                                                
                                                const canAdd = availableTypes.filter(t => 
                                                    !usedTypes.includes(t) && 
                                                    (t === 'Kapak' ? !govde?.includesKapak : !govde?.includesDip)
                                                );

                                                if (canAdd.length > 0) {
                                                    return (
                                                        <div className="flex gap-2">
                                                            {canAdd.map(type => (
                                                                <button 
                                                                    key={type}
                                                                    onClick={() => setJobDetailsByProduct(prev => ({
                                                                        ...prev, 
                                                                        [jobSelectedProductId]: [...prev[jobSelectedProductId], { type, jobSize: '', boxSize: '', efficiency: '' }]
                                                                    }))}
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded text-[10px] font-bold transition-colors"
                                                                >
                                                                    <Plus size={12} /> {type} Levhası Ekle
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </>
                                    );
                                })()}
                            </div>
                            )}
                            <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
                                <button onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-slate-500 text-[10px] font-bold uppercase">Vazgeç</button>
                                <button
                                    onClick={async () => {
                                        if (!jobOrder) return;
                                        const firstProductId = jobOrder.items[0]?.productId || '';
                                        const first = firstProductId ? jobDetailsByProduct[firstProductId] : undefined;
                                        await updateOrder(jobOrder.id, {
                                            designJobDetails: jobDetailsByProduct,
                                            jobSize: first?.jobSize || null,
                                            boxSize: first?.boxSize || null,
                                            efficiency: first?.efficiency || null
                                        } as any);
                                        setIsJobModalOpen(false);
                                    }}
                                    className="px-5 py-2 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-md shadow-blue-100"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase">Önce bir sipariş seçiniz</p>
                        </div>
                    )}
                </div>
            </Modal>
        </ERPPageLayout>
    );
}
