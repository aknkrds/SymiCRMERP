import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Plus, Box } from 'lucide-react';
import type { Product, ProductFormData } from '../../types';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { useMolds } from '../../hooks/useMolds';
import { FormSection, InputGroup, premiumInputClass, FormCard } from '../ui/FormLayouts';

// Options for dropdowns
const PRODUCT_TYPES = [
    { value: 'percinli', label: 'Perçinli' },
    { value: 'sivama', label: 'Sıvama' },
] as const;

const PERCINLI_SHAPES = [
    'Kare', 'Oval', 'Sekizgen', 'Dikdörtgen', 'Yuvarlak', 'Kalpli', 'Tepsi', 'Konik', 'Özel'
] as const;

// Helper to sort dimensions naturally
const sortDimensions = (a: { dimensions: string }, b: { dimensions: string }) => {
    const getFirstNum = (s: string) => parseInt(s.split('x')[0]) || 0;
    return getFirstNum(a.dimensions) - getFirstNum(b.dimensions);
};

const productSchema = z.object({
    code: z.string().optional(),
    name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
    productType: z.enum(['percinli', 'sivama']),
    boxShape: z.string().min(1, 'Kutu şekli seçimi zorunludur'),
    dimensions: z.object({
        length: z.coerce.number().min(0.1, 'Boy bilgisi zorunludur'),
        width: z.coerce.number().min(0.1, 'En bilgisi zorunludur'),
        depth: z.coerce.number().min(0, 'Yükseklik bilgisi zorunludur'),
    }),
    inks: z.any().optional(),
    features: z.any().optional(),
    details: z.any().optional(),
    images: z.any().optional(),
});

interface ProductFormProps {
    initialData?: Product;
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
}

const defaultInks = {
    cmyk: false, white: false, pantones: [], 
    goldLak: { has: false }, emaye: { has: false }, astar: { has: false }, silverLak: { has: false },
    printType: { value: 'ofset' }
};

const defaultFeatures = {
    window: { selected: false },
    lid: { selected: false },
    gofre: { selected: false },
    bottom: { selected: false },
    accessory: { selected: false },
    packaging: { selected: false },
    extras: ''
};

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
    const { molds } = useMolds();
    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: initialData ? {
            ...initialData,
            name: initialData.name || '',
            productType: initialData.productType || 'percinli',
            inks: initialData.inks || defaultInks,
            features: initialData.features || defaultFeatures
        } : {
            code: 'Otomatik',
            name: '',
            productType: 'percinli',
            dimensions: { length: 0, width: 0, depth: 0 },
            inks: defaultInks,
            features: defaultFeatures,
            details: '',
            images: { customer: [] },
        },
    });

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                name: initialData.name || '',
                productType: initialData.productType || 'percinli',
                inks: initialData.inks || defaultInks,
                features: initialData.features || defaultFeatures
            });
        }
    }, [initialData, reset]);

    const productType = watch('productType');
    const boxShape = watch('boxShape');
    const customerImages = watch('images.customer') || [];
    const pantones = watch('inks.pantones') || [];
    const [newPantone, setNewPantone] = useState('');

    // Feature Watchers
    // Watchers for visual state
    const winSelected = watch('features.window.selected');
    const lidSelected = watch('features.lid.selected');
    const gofreSelected = watch('features.gofre.selected');
    const bottomSelected = watch('features.bottom.selected');
    const printTypeType = watch('inks.printType.value');

    // Dimension Watchers
    const dimLength = watch('dimensions.length');
    const dimWidth = watch('dimensions.width');
    const currentBaseDim = (dimLength && dimWidth) ? `${dimLength}x${dimWidth}` : '';

    const handleBaseDimChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            setValue('dimensions.length', 0);
            setValue('dimensions.width', 0);
            return;
        }
        const [l, w] = val.split('x').map(Number);
        setValue('dimensions.length', l);
        setValue('dimensions.width', w);
    };

    // Dimension change handlers (kept for potential future use or removed if strictly unused)
    // Removed unused handlers

    // Auto-fill dimensions for Sivama
    useEffect(() => {
        if (productType === 'sivama' && boxShape) {
            const parts = boxShape.split('x').map(p => parseFloat(p));
            if (!parts.some(isNaN) && parts.length > 0) {
                if (parts.length === 3) {
                    setValue('dimensions.length', parts[0]);
                    setValue('dimensions.width', parts[1]);
                    setValue('dimensions.depth', parts[2]);
                } else {
                    setValue('dimensions.length', parts[0]);
                    setValue('dimensions.width', parts[0]);
                    setValue('dimensions.depth', parts[1] || 0);
                }
            }
        }
    }, [productType, boxShape, setValue]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        if (customerImages.length + files.length > 2) {
            alert('En fazla 2 resim yükleyebilirsiniz.');
            return;
        }

        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('image', file);
            try {
                const response = await fetch('/api/upload', { method: 'POST', body: formData });
                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
        if (uploadedUrls.length > 0) {
            setValue(`images.customer`, [...customerImages, ...uploadedUrls]);
        }
    };

    const removeImage = (index: number) => {
        setValue(`images.customer`, customerImages.filter((_, i) => i !== index));
    };

    const addPantone = () => {
        if (newPantone.trim() && pantones.length < 10) {
            setValue('inks.pantones', [...pantones, newPantone.trim()]);
            setNewPantone('');
        }
    };

    const removePantone = (index: number) => {
        setValue('inks.pantones', pantones.filter((_, i) => i !== index));
    };

    return (
        <form 
            onSubmit={handleSubmit(onSubmit as any, (errors) => {
                console.error('Form Validation Errors:', errors);
                alert('Lütfen zorunlu alanları doldurunuz.');
            })} 
            className="space-y-8 w-full mx-auto pb-8"
        >
            {/* TEMEL BILGILER */}
            <FormSection title="Temel Bilgiler" description="Ürün tanımlama ve kod bilgileri">
                <InputGroup label="Ürün Kodu">
                    <input
                        disabled
                        value={initialData?.code || "Otomatik Oluşturulacak"}
                        className={`${premiumInputClass} bg-slate-50 text-slate-400 font-mono`}
                    />
                </InputGroup>
                <InputGroup label="Ürün Adı" error={errors.name?.message} required>
                    <div className="relative group">
                        <Box size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            {...register('name')}
                            placeholder="Örn: Yuvarlak Kutu"
                            className={`${premiumInputClass} pl-11`}
                        />
                    </div>
                </InputGroup>
            </FormSection>

            {/* ÜRÜN ŞEKLİ */}
            <FormSection title="Ürün Şekli" description="Üretim tipi ve form detayları">
                <div className="md:col-span-2 space-y-4">
                    <InputGroup label="Ürün Tipi" required>
                        <div className="flex gap-6 p-1">
                            {PRODUCT_TYPES.map(type => (
                                <label key={type.value} className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input type="radio" value={type.value} {...register('productType')} className="peer sr-only" />
                                        <div className="w-5 h-5 border-2 border-slate-300 rounded-full peer-checked:border-blue-500 peer-checked:border-[6px] transition-all group-hover:border-slate-400" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{type.label}</span>
                                </label>
                            ))}
                        </div>
                    </InputGroup>

                    <FormCard className="bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup label="Kutu Şekli / Ölçü" error={errors.boxShape?.message} required>
                                <select {...register('boxShape')} className={premiumInputClass}>
                                    <option value="">Seçiniz...</option>
                                    {productType === 'percinli' && PERCINLI_SHAPES.map(shape => (
                                        <option key={shape} value={shape}>{shape}</option>
                                    ))}
                                    {productType === 'sivama' && molds.filter(m => m.productType === 'sivama').map(m => (
                                        <option key={m.id} value={m.dimensions}>{m.dimensions}</option>
                                    ))}
                                </select>
                            </InputGroup>

                            {productType === 'percinli' && ['Kare', 'Oval', 'Sekizgen', 'Dikdörtgen', 'Yuvarlak', 'Tepsi'].includes(boxShape || '') && (
                                <InputGroup label={boxShape === 'Yuvarlak' ? 'Çap (Ø)' : 'Taban Ölçüsü (mm)'}>
                                    <select value={currentBaseDim} onChange={handleBaseDimChange} className={premiumInputClass}>
                                        <option value="">Seçiniz...</option>
                                        {molds.filter(m => m.boxShape === boxShape).sort(sortDimensions).map(m => (
                                            <option key={m.id} value={boxShape === 'Yuvarlak' ? `${m.dimensions}x${m.dimensions}` : m.dimensions}>
                                                {boxShape === 'Yuvarlak' ? (m.label || `Ø${m.dimensions}`) : (m.label || m.dimensions)}
                                            </option>
                                        ))}
                                    </select>
                                </InputGroup>
                            )}

                            {productType === 'percinli' && boxShape === 'Özel' && (
                                <>
                                    <InputGroup label="En (mm)"><input type="number" {...register('dimensions.width')} className={premiumInputClass} /></InputGroup>
                                    <InputGroup label="Genişlik (mm)"><input type="number" {...register('dimensions.length')} className={premiumInputClass} /></InputGroup>
                                    <InputGroup label="Boy (mm)"><input type="number" {...register('dimensions.depth')} className={premiumInputClass} /></InputGroup>
                                </>
                            )}

                            {currentBaseDim && productType === 'percinli' && !['Özel', 'Kalpli', 'Konik'].includes(boxShape || '') && (
                                <InputGroup label="Boy / Yükseklik (mm)">
                                    <input type="number" placeholder="0" {...register('dimensions.depth')} className={premiumInputClass} />
                                </InputGroup>
                            )}
                        </div>
                    </FormCard>
                </div>
            </FormSection>

            {/* MÜREKKEPLER */}
            <FormSection title="Mürekkepler" description="Baskı ve renk detayları">
                <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/50 transition-colors">
                            <input type="checkbox" {...register('inks.cmyk')} className="w-4 h-4 text-blue-600 rounded" />
                            <span className="text-sm font-semibold text-slate-700">CMYK</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-blue-50/50 transition-colors">
                            <input type="checkbox" {...register('inks.white')} className="w-4 h-4 text-blue-600 rounded" />
                            <span className="text-sm font-semibold text-slate-700">Beyaz</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Baskı Şekli">
                            <select {...register('inks.printType.value')} className={premiumInputClass}>
                                <option value="ofset">Ofset</option>
                                <option value="dijital">Dijital</option>
                                <option value="dijital_ofset">Dijital + Ofset</option>
                            </select>
                            {printTypeType === 'dijital_ofset' && (
                                <input {...register('inks.printType.note')} placeholder="Not..." className={`${premiumInputClass} mt-2`} />
                            )}
                        </InputGroup>

                        <InputGroup label="Pantone Kodları">
                            <div className="flex gap-2">
                                <input value={newPantone} onChange={(e) => setNewPantone(e.target.value)} placeholder="Kod (Örn: C0000)" className={premiumInputClass} />
                                <button type="button" onClick={addPantone} className="px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"><Plus size={18} /></button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {pantones.map((code: string, i: number) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                        {code}
                                        <button type="button" onClick={() => removePantone(i)} className="hover:text-red-500"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </InputGroup>
                    </div>

                    <FormCard className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {[
                            { id: 'goldLak', label: 'Gold Lak' },
                            { id: 'emaye', label: 'Emaye' },
                            { id: 'astar', label: 'Astar' },
                            { id: 'silverLak', label: 'Silver Lak' }
                        ].map(ink => (
                            <div key={ink.id} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                                    <input type="checkbox" {...register(`inks.${ink.id}.has` as any)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-xs font-bold text-slate-600 uppercase">{ink.label}</span>
                                </label>
                                {watch(`inks.${ink.id}.has` as any) && (
                                    <input {...register(`inks.${ink.id}.code` as any)} placeholder="Kod" className={`${premiumInputClass} !py-1.5 !px-3 text-xs`} />
                                )}
                            </div>
                        ))}
                    </FormCard>
                </div>
            </FormSection>

            {/* ÖZELLİKLER */}
            <FormSection title="Özellikler" description="Pencere, kapak ve ek mekanizmalar">
                <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Window */}
                        <FormCard className={cn("transition-all", winSelected && "border-blue-500 bg-blue-50/20")}>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" {...register('features.window.selected')} className="w-5 h-5 text-blue-600 rounded-lg" />
                                <span className="font-bold text-slate-800">Pencere</span>
                            </label>
                            {winSelected && (
                                <div className="space-y-3 pl-8 animate-in slide-in-from-top-2">
                                    <select {...register('features.window.value')} className={premiumInputClass}>
                                        <option value="kapakta">Kapakta</option>
                                        <option value="govdede">Gövdede</option>
                                        <option value="kapakta_govdede">Kapakta ve Gövdede</option>
                                    </select>
                                    <input {...register('features.window.note')} placeholder="Ölçü/Not..." className={premiumInputClass} />
                                </div>
                            )}
                        </FormCard>

                        {/* Lid */}
                        <FormCard className={cn("transition-all", lidSelected && "border-blue-500 bg-blue-50/20")}>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" {...register('features.lid.selected')} className="w-5 h-5 text-blue-600 rounded-lg" />
                                <span className="font-bold text-slate-800">Kapak</span>
                            </label>
                            {lidSelected && (
                                <div className="space-y-3 pl-8 animate-in slide-in-from-top-2">
                                    <select {...register('features.lid.value')} className={premiumInputClass}>
                                        <option value="ustten_gecme">Üstten Geçme</option>
                                        <option value="ice_kivrim">İçe Kıvrım</option>
                                        <option value="ice_giren">İçe Giren</option>
                                        <option value="menteseli">Menteşeli</option>
                                    </select>
                                    <input {...register('features.lid.note')} placeholder="Not..." className={premiumInputClass} />
                                </div>
                            )}
                        </FormCard>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gofre */}
                        <FormCard className={cn("transition-all", gofreSelected && "border-blue-500 bg-blue-50/20")}>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" {...register('features.gofre.selected')} className="w-5 h-5 text-blue-600 rounded-lg" />
                                <span className="font-bold text-slate-800">Gofre</span>
                            </label>
                            {gofreSelected && (
                                <div className="space-y-3 pl-8 animate-in slide-in-from-top-2">
                                    <select {...register('features.gofre.value')} className={premiumInputClass}>
                                        <option value="govde">Gövdede</option>
                                        <option value="kapak">Kapakta</option>
                                        <option value="govde_kapak">Her İkisinde</option>
                                    </select>
                                </div>
                            )}
                        </FormCard>

                        {/* Bottom */}
                        <FormCard className={cn("transition-all", bottomSelected && "border-blue-500 bg-blue-50/20")}>
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input type="checkbox" {...register('features.bottom.selected')} className="w-5 h-5 text-blue-600 rounded-lg" />
                                <span className="font-bold text-slate-800">Dip</span>
                            </label>
                            {bottomSelected && (
                                <div className="space-y-3 pl-8 animate-in slide-in-from-top-2">
                                    <select {...register('features.bottom.value')} className={premiumInputClass}>
                                        <option value="baskili">Baskılı</option>
                                        <option value="baskisiz">Baskısız</option>
                                    </select>
                                </div>
                            )}
                        </FormCard>
                    </div>
                </div>
            </FormSection>

            {/* DETAYLAR & GÖRSELLER */}
            <FormSection title="Görsel & Detay" description="Görüntüleme ve ek notlar">
                <InputGroup label="Müşteri Görselleri" className="md:col-span-2">
                    <div className="flex flex-wrap gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        {customerImages.map((url: string, i: number) => (
                            <div key={i} className="relative group w-28 h-28 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                <img src={url} alt="Product" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                            </div>
                        ))}
                        {customerImages.length < 2 && (
                            <label className="w-28 h-28 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-500">
                                <Upload size={24} />
                                <span className="text-[10px] font-bold mt-1 uppercase">Yükle</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>
                </InputGroup>

                <InputGroup label="Ek Notlar" className="md:col-span-2">
                    <textarea {...register('details')} className={`${premiumInputClass} min-h-[120px] resize-none`} placeholder="Ürün hakkında ek detaylar..." />
                </InputGroup>
            </FormSection>

            {/* Footer Actions */}
            <div className="sticky bottom-0 z-20 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl mx-1 animate-in slide-in-from-bottom-4">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider">İptal</button>
                <button type="submit" className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg hover:shadow-black/20 uppercase tracking-widest">Kaydet</button>
            </div>
        </form>
    );
}
