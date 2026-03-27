import React, { useState } from 'react';
import { useMolds } from '../../hooks/useMolds';
import { Plus, Trash2, Box, RefreshCw, Layers, Maximize2, Tag } from 'lucide-react';

const PRODUCT_TYPES = [
    { value: 'percinli', label: 'Perçinli' },
    { value: 'sivama', label: 'Sıvama' },
];

const SHAPES = {
    percinli: ['Kare', 'Oval', 'Sekizgen', 'Dikdörtgen', 'Yuvarlak', 'Kalpli', 'Tepsi', 'Konik'],
    sivama: ['Standart']
};

export default function ProductMoldSettings() {
    const { molds, addMold, deleteMold } = useMolds();
    const [selectedType, setSelectedType] = useState('percinli');
    const [selectedShape, setSelectedShape] = useState('Kare');
    
    const [newDimension, setNewDimension] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [seeding, setSeeding] = useState(false);

    const filteredMolds = molds.filter(
        m => m.productType === selectedType && m.boxShape === selectedShape
    );

    const handleSeed = async () => {
        if (!window.confirm('Mevcut varsayılan ölçülerin tümü veritabanına eklenecek. Devam edilsin mi?')) return;
        setSeeding(true);
        try {
            const res = await fetch('/api/molds/seed-defaults', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`${data.inserted} adet ölçü eklendi.`);
                window.location.reload();
            } else {
                alert('Hata: ' + data.error);
            }
        } catch (error) {
            console.error('Seed error:', error);
        } finally {
            setSeeding(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDimension) return;

        const success = await addMold({
            productType: selectedType,
            boxShape: selectedShape,
            dimensions: newDimension,
            label: newLabel || undefined
        });
        
        if (success) {
            setNewDimension('');
            setNewLabel('');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-72 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Kategori Seçimi</span>
                    </div>
                    <div className="p-5 space-y-5">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                <Layers size={12} className="text-blue-500" /> ÜRÜN TİPİ
                            </label>
                            <select 
                                value={selectedType}
                                onChange={e => {
                                    const newType = e.target.value;
                                    setSelectedType(newType);
                                    if (newType === 'percinli') setSelectedShape('Kare');
                                    else setSelectedShape('Standart');
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all cursor-pointer"
                            >
                                {PRODUCT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedType === 'percinli' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    <Box size={12} className="text-blue-500" /> KUTU ŞEKLİ
                                </label>
                                <div className="grid grid-cols-1 gap-1">
                                  {SHAPES.percinli.map(s => (
                                      <button 
                                          key={s} 
                                          onClick={() => setSelectedShape(s)}
                                          className={`px-4 py-2 rounded-lg text-left text-[11px] font-bold transition-all ${
                                            selectedShape === s 
                                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                              : 'text-slate-500 hover:bg-slate-100'
                                          }`}
                                      >
                                        {s}
                                      </button>
                                  ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                              <Maximize2 size={16} />
                           </div>
                           <div>
                              <h3 className="font-black text-slate-800 uppercase tracking-tight leading-none text-[12px]">Kalıp Ölçüleri</h3>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedType} • {selectedShape}</p>
                           </div>
                        </div>
                        <button 
                            onClick={handleSeed}
                            disabled={seeding}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                            VARSAYILANLARI YÜKLE
                        </button>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="flex flex-wrap md:flex-nowrap gap-3 mb-8 p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl">
                            <div className="flex-1 space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">BOYUTLAR</label>
                                <input
                                    type="text"
                                    placeholder="örn: 200x300"
                                    value={newDimension}
                                    onChange={e => setNewDimension(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">ETİKET (OPSİYONEL)</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        placeholder="örn: Ø200"
                                        value={newLabel}
                                        onChange={e => setNewLabel(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="pt-5">
                                <button
                                    type="submit"
                                    className="h-10 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> EKLE
                                </button>
                            </div>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredMolds.length === 0 ? (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                   <Box size={40} className="text-slate-200 mb-2" />
                                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Ölçü Kaydı Bulunamadı</p>
                                </div>
                            ) : (
                                filteredMolds.map(mold => (
                                    <div key={mold.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl group hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{mold.dimensions}</span>
                                            {mold.label && <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1.5">{mold.label}</span>}
                                        </div>
                                        <button
                                            onClick={() => deleteMold(mold.id)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
