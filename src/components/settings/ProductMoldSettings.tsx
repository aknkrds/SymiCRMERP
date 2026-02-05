import React, { useState } from 'react';
import { useMolds } from '../../hooks/useMolds';
import { Plus, Trash2, Box, RefreshCw } from 'lucide-react';

const PRODUCT_TYPES = [
    { value: 'percinli', label: 'Perçinli' },
    { value: 'sivama', label: 'Sıvama' },
];

const SHAPES = {
    percinli: ['Kare', 'Oval', 'Sekizgen', 'Dikdörtgen', 'Yuvarlak', 'Kalpli', 'Tepsi', 'Konik'],
    sivama: ['Standart']
};

const DEFAULT_MOLDS = [
    // Percinli Square
    ...['55x55','75x75','85x85','90x90','100x100','120x120','155x155','190x190','215x215','235x235'].map(d => ({ productType: 'percinli', boxShape: 'Kare', dimensions: d })),
    // Percinli Oval
    ...['60x70','83x103','143x232','200x300'].map(d => ({ productType: 'percinli', boxShape: 'Oval', dimensions: d })),
    // Percinli Octagon
    ...['85x110','220x220','190x275'].map(d => ({ productType: 'percinli', boxShape: 'Sekizgen', dimensions: d })),
    // Percinli Rectangle
    ...['45x65','80x120','80x140','90x150','100x75','100x130','110x150','115x190','135x190','140x240','155x195','170x260','180x225','180x240','215x235','200x300'].map(d => ({ productType: 'percinli', boxShape: 'Dikdörtgen', dimensions: d })),
    // Percinli Round
    ...[42, 52, 55, 65, 69, 73, 82, 85, 90, 99, 105, 108, 120, 140, 153, 160, 175, 190, 200, 215, 240, 265].map(d => ({ productType: 'percinli', boxShape: 'Yuvarlak', dimensions: String(d), label: `Ø${d}` })),
    // Percinli Heart
    ...['90x90','90x90x25','205x190x40','235x235'].map(d => ({ productType: 'percinli', boxShape: 'Kalpli', dimensions: d })),
    // Percinli Tray
    { productType: 'percinli', boxShape: 'Tepsi', dimensions: '304x234', label: '304x234' },
    { productType: 'percinli', boxShape: 'Tepsi', dimensions: '357x272', label: '357x272' },
    { productType: 'percinli', boxShape: 'Tepsi', dimensions: '362x245', label: '362x245 (Dalgalı)' },
    { productType: 'percinli', boxShape: 'Tepsi', dimensions: '315x215', label: '315x215' },
    { productType: 'percinli', boxShape: 'Tepsi', dimensions: '400x400', label: 'Ø400' },
    // Percinli Conic
    ...['130x165x160','130x165x140','90x120x105'].map(d => ({ productType: 'percinli', boxShape: 'Konik', dimensions: d })),
    // Sivama (Mapping these to 'Standart' shape)
    ...['90x90x30 - Kalp Şekilli','205x190x40 - Kalp Şekilli','75x205x25','65x205x25 - Fermuarlı','105x205x25 - Fermuarlı','135x200x25 - Fermuarlı','175x215x45','90x80x15','90x80x30','100x100x30','105x105x40','97x58x20','94x58x20','95x120x22','69x45','85x40','99x30','105x40 - Expanded','132x45 - Expanded','O115 - Bardak Altlığı'].map(d => ({ productType: 'sivama', boxShape: 'Standart', dimensions: d })),
];

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
                alert(`${data.inserted} adet ölçü eklendi. (${data.skipped} adet zaten mevcuttu)`);
                window.location.reload();
            } else {
                alert('Hata: ' + data.error);
            }
        } catch (error) {
            console.error('Seed error:', error);
            alert('Bir hata oluştu.');
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64 space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="font-medium text-slate-900 mb-3">Kategori Seçimi</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Ürün Tipi</label>
                                <select 
                                    value={selectedType}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        setSelectedType(newType);
                                        // Default to first shape of new type
                                        if (newType === 'percinli') setSelectedShape('Kare');
                                        else setSelectedShape('Standart');
                                    }}
                                    className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    aria-label="Ürün Tipi"
                                >
                                    {PRODUCT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedType === 'percinli' && (
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Kutu Şekli</label>
                                    <select 
                                        value={selectedShape}
                                        onChange={e => setSelectedShape(e.target.value)}
                                        className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        aria-label="Kutu Şekli"
                                    >
                                        {SHAPES.percinli.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="font-medium text-slate-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Kalıp Ölçüleri Listesi</span>
                            <button 
                                onClick={handleSeed}
                                disabled={seeding}
                                className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                            >
                                <RefreshCw className={`w-3 h-3 ${seeding ? 'animate-spin' : ''}`} />
                                Varsayılanları Yükle
                            </button>
                        </h3>

                        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Ölçü (örn: 55x55)"
                                value={newDimension}
                                onChange={e => setNewDimension(e.target.value)}
                                className="flex-1 text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                aria-label="Yeni Ölçü"
                            />
                            <input
                                type="text"
                                placeholder="Etiket (Opsiyonel, örn: Ø42)"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                className="flex-1 text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                aria-label="Yeni Etiket"
                            />
                            <button
                                type="submit"
                                className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 flex items-center gap-1"
                                aria-label="Ekle"
                            >
                                <Plus className="w-4 h-4" /> Ekle
                            </button>
                        </form>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {filteredMolds.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">Bu kategori için kayıtlı ölçü bulunamadı.</p>
                            ) : (
                                filteredMolds.map(mold => (
                                    <div key={mold.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100 group">
                                        <div>
                                            <span className="font-medium text-slate-700">{mold.dimensions}</span>
                                            {mold.label && <span className="ml-2 text-xs text-slate-500">({mold.label})</span>}
                                        </div>
                                        <button
                                            onClick={() => deleteMold(mold.id)}
                                            className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Sil"
                                            aria-label="Sil"
                                        >
                                            <Trash2 className="w-4 h-4" />
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
