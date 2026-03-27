import { useStock } from '../hooks/useStock';
import { PackagePlus, Boxes, Menu, Filter } from 'lucide-react';
import { ERPPageLayout, ToolbarBtn } from '../components/ui/ERPPageLayout';

export default function Stock() {
    const { stockItems, loading, error } = useStock();

    const procurementItems = stockItems.filter(s => (s.category || 'procurement') === 'procurement');
    const finishedItems = stockItems.filter(s => s.category === 'finished' || s.category === 'scrap');

    return (
        <ERPPageLayout
            breadcrumbs={[{ label: 'Depo' }, { label: 'Stok', active: true }]}
            toolbar={
                <>
                    <ToolbarBtn icon={<Filter size={13} />} label="Filtrele" />
                    <ToolbarBtn icon={<Menu size={13} />} />
                </>
            }
        >
            {loading && <div className="p-6 text-slate-500 text-sm">Yükleniyor...</div>}
            {error && <div className="p-6 text-red-600 text-sm">Hata: {error}</div>}
            {!loading && !error && (
                <div className="space-y-6">
                    {/* Procurement / Raw Material */}
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
                        <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <PackagePlus size={14} className="text-blue-500" />
                                <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Hammadde & Tedarik Stokları</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 text-[9px] uppercase tracking-tighter">{procurementItems.length} KALEM</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/30">
                                    <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                                        <th className="w-12 px-5 py-3 text-center border-r border-slate-100">#</th>
                                        <th className="px-5 py-3 border-r border-slate-100">Stok Tanımı / Ürün</th>
                                        <th className="px-5 py-3 border-r border-slate-100">Tedarikçi Firma</th>
                                        <th className="px-5 py-3 border-r border-slate-100 text-center w-32">Miktar</th>
                                        <th className="px-5 py-3 w-24">Birim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {procurementItems.length === 0 ? (
                                        <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-medium">Tedarik/hammadde stoğu bulunmuyor.</td></tr>
                                    ) : procurementItems.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-5 py-4 text-center text-slate-300 border-r border-slate-50 font-mono font-bold">{idx + 1}</td>
                                            <td className="px-5 py-4 border-r border-slate-50">
                                                <div className="font-bold text-slate-700 uppercase tracking-tight">{item.product}</div>
                                                <div className="text-[9px] text-blue-500 font-mono font-bold mt-0.5 select-all">#{item.stockNumber}</div>
                                            </td>
                                            <td className="px-5 py-4 border-r border-slate-50">
                                                <div className="text-slate-600 font-medium">{item.company}</div>
                                            </td>
                                            <td className="px-5 py-4 border-r border-slate-50 text-center">
                                                <div className="inline-flex flex-col">
                                                    <span className="text-[12px] font-bold text-slate-800 tabular-nums">{item.quantity.toLocaleString()}</span>
                                                    {item.quantity < 100 && <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">KRİTİK SEVİYE</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase tracking-tighter text-[9px] border border-slate-200">{item.unit}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Finished Goods */}
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
                        <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <Boxes size={14} className="text-emerald-500" />
                                <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Genel Stok (Mamul & Reçeteli)</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 text-[9px] uppercase tracking-tighter">{finishedItems.length} KALEM</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/30">
                                    <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                                        <th className="w-12 px-5 py-3 text-center border-r border-slate-100">#</th>
                                        <th className="px-5 py-3 border-r border-slate-100">Ürün Bilgisi</th>
                                        <th className="px-5 py-3 border-r border-slate-100 w-32">Kategori</th>
                                        <th className="px-5 py-3 border-r border-slate-100">Müşteri / Üretici</th>
                                        <th className="px-5 py-3 border-r border-slate-100 text-center w-32">Miktar</th>
                                        <th className="px-5 py-3 w-24">Birim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {finishedItems.length === 0 ? (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-medium">Genel stok kaydı bulunmuyor.</td></tr>
                                    ) : finishedItems.map((item, idx) => (
                                        <tr key={item.id} className={`hover:bg-emerald-50/20 transition-colors group ${item.category === 'scrap' ? 'bg-red-50/10' : ''}`}>
                                            <td className="px-5 py-4 text-center text-slate-300 border-r border-slate-50 font-mono font-bold">{idx + 1}</td>
                                            <td className="px-5 py-4 border-r border-slate-50">
                                                <div className="font-bold text-slate-700 uppercase tracking-tight">{item.product}</div>
                                                <div className="text-[9px] text-blue-500 font-mono font-bold mt-0.5 select-all">#{item.stockNumber}</div>
                                            </td>
                                            <td className="px-5 py-4 border-r border-slate-50">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${
                                                    item.category === 'scrap' 
                                                        ? 'bg-red-50 text-red-600 border-red-200' 
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {item.category === 'finished' ? 'Mamul' : 'Hurda'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 border-r border-slate-50">
                                                <div className="text-slate-600 font-medium">{item.company}</div>
                                            </td>
                                            <td className="px-5 py-4 border-r border-slate-50 text-center">
                                                <span className="text-[12px] font-bold text-slate-800 tabular-nums">{item.quantity.toLocaleString()}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase tracking-tighter text-[9px] border border-slate-200">{item.unit}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </ERPPageLayout>
    );
}
