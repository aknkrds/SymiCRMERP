import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import type { Product, ProductFormData } from '../../types';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const COLOR_OPTIONS = ['CMYK', 'Pantone', 'Altın Yaldız', 'Gümüş Yaldız', 'Vernik', 'Lak', 'Selefon', 'Beyaz', 'Siyah'];

const productSchema = z.object({
    code: z.string().min(2, 'Ürün kodu en az 2 karakter olmalıdır'),
    description: z.string().min(5, 'Ürün açıklaması en az 5 karakter olmalıdır'),
    dimensions: z.object({
        length: z.coerce.number().min(1, 'Boy zorunludur'),
        width: z.coerce.number().min(1, 'En zorunludur'),
        depth: z.coerce.number().min(0, 'Derinlik zorunludur'),
    }),
    features: z.object({
        hasLid: z.boolean(),
        hasWindow: z.boolean(),
        extras: z.string().optional().default(''),
        gofre: z.boolean().default(false),
        gofreDetails: z.object({
            count: z.coerce.number().optional(),
            notes: z.string().optional(),
        }).optional(),
        foodGrade: z.boolean().default(false),
        colors: z.array(z.string()).max(5, 'En fazla 5 renk seçebilirsiniz').default([]),
    }),
    details: z.string().optional(),
    windowDetails: z.object({
        width: z.coerce.number().optional(),
        height: z.coerce.number().optional(),
        count: z.coerce.number().optional(),
    }).optional(),
    lidDetails: z.object({
        material: z.string().optional(),
        color: z.string().optional(),
        paint: z.string().optional(),
        notes: z.string().optional(),
        hasGofre: z.boolean().default(false),
        gofreDetails: z.object({
            count: z.coerce.number().optional(),
            notes: z.string().optional(),
        }).optional(),
        hasWindow: z.boolean().default(false),
        windowDimensions: z.object({
            width: z.coerce.number().optional(),
            height: z.coerce.number().optional(),
        }).optional(),
        dimensions: z.object({
            length: z.coerce.number().optional(),
            width: z.coerce.number().optional(),
            depth: z.coerce.number().optional(),
        }).optional(),
    }).optional(),
    images: z.object({
        customer: z.array(z.string()).optional(),
        design: z.array(z.string()).optional(),
    }).optional(),
});

interface ProductFormProps {
    initialData?: Product;
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: initialData || {
            code: '',
            description: '',
            dimensions: { length: 0, width: 0, depth: 0 },
            features: { hasLid: false, hasWindow: false, extras: '', gofre: false, foodGrade: false, colors: [] },
            details: '',
            windowDetails: { width: 0, height: 0, count: 1 },
            lidDetails: { 
                material: '', color: '', paint: '', notes: '', hasGofre: false, hasWindow: false, 
                windowDimensions: { width: 0, height: 0 },
                dimensions: { length: 0, width: 0, depth: 0 }
            },
            images: { customer: [], design: [] },
        },
    });

    const hasLid = watch('features.hasLid');
    const hasWindow = watch('features.hasWindow');
    const lidHasWindow = watch('lidDetails.hasWindow');
    const selectedColors = watch('features.colors') || [];
    const customerImages = watch('images.customer') || [];
    const designImages = watch('images.design') || [];

    const toggleColor = (color: string) => {
        const current = selectedColors;
        if (current.includes(color)) {
            setValue('features.colors', current.filter(c => c !== color));
        } else {
            if (current.length >= 5) {
                alert('En fazla 5 renk seçebilirsiniz.');
                return;
            }
            setValue('features.colors', [...current, color]);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'customer' | 'design') => {
        const files = e.target.files;
        if (!files) return;

        const currentImages = type === 'customer' ? customerImages : designImages;
        if (currentImages.length + files.length > 2) {
            alert('En fazla 2 resim yükleyebilirsiniz.');
            return;
        }

        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                
                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url);
                } else {
                    console.error('Upload failed');
                    alert('Resim yüklenirken bir hata oluştu.');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Resim yüklenirken bir hata oluştu.');
            }
        }
        
        if (uploadedUrls.length > 0) {
             const newImages = [...currentImages, ...uploadedUrls];
             setValue(`images.${type}`, newImages);
        }
    };

    const removeImage = (index: number, type: 'customer' | 'design') => {
        const currentImages = type === 'customer' ? customerImages : designImages;
        const newImages = currentImages.filter((_, i) => i !== index);
        setValue(`images.${type}`, newImages);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Temel Bilgiler</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Ürün Kodu</label>
                        <input
                            {...register('code')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                errors.code ? "border-red-500" : "border-slate-300"
                            )}
                            placeholder="PRD-001"
                        />
                        {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Açıklama</label>
                        <input
                            {...register('description')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                errors.description ? "border-red-500" : "border-slate-300"
                            )}
                            placeholder="Ürün detayları..."
                        />
                        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Boyutlar (mm)</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Boy</label>
                        <input
                            type="number"
                            {...register('dimensions.length')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                errors.dimensions?.length ? "border-red-500" : "border-slate-300"
                            )}
                        />
                        {errors.dimensions?.length && <p className="text-xs text-red-500">{errors.dimensions.length.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">En</label>
                        <input
                            type="number"
                            {...register('dimensions.width')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                errors.dimensions?.width ? "border-red-500" : "border-slate-300"
                            )}
                        />
                        {errors.dimensions?.width && <p className="text-xs text-red-500">{errors.dimensions.width.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Derinlik</label>
                        <input
                            type="number"
                            {...register('dimensions.depth')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                                errors.dimensions?.depth ? "border-red-500" : "border-slate-300"
                            )}
                        />
                        {errors.dimensions?.depth && <p className="text-xs text-red-500">{errors.dimensions.depth.message}</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Özellikler & Detaylar</h4>

                <div className="flex flex-wrap gap-6 mb-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            {...register('features.hasWindow')}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Pencere Var
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            {...register('features.hasLid')}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Kapak Var
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            {...register('features.gofre')}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Gofre
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            {...register('features.foodGrade')}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Gıda İşlemi
                    </label>
                </div>

                <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium text-slate-700">Renkler (Max 5)</label>
                    <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => toggleColor(color)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                    selectedColors.includes(color)
                                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                    {errors.features?.colors && <p className="text-xs text-red-500">{errors.features.colors.message}</p>}
                </div>

                {hasWindow && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h5 className="text-sm font-medium text-indigo-900 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Pencere Ölçüleri
                        </h5>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Genişlik (mm)</label>
                                <input
                                    type="number"
                                    {...register('windowDetails.width')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Yükseklik (mm)</label>
                                <input
                                    type="number"
                                    {...register('windowDetails.height')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Pencere Adet</label>
                                <input
                                    type="number"
                                    {...register('windowDetails.count')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {hasLid && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                        <h5 className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Kapak Bilgileri
                        </h5>
                        
                        <div className="flex gap-6">
                             <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    {...register('lidDetails.hasGofre')}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                Kapakta Gofre
                            </label>
                             <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    {...register('lidDetails.hasWindow')}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                Kapakta Pencere
                            </label>
                        </div>

                        {/* Lid Gofre Details */}
                        {watch('lidDetails.hasGofre') && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border border-slate-200">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Gofre Adet</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.gofreDetails.count')}
                                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Konum / Notlar</label>
                                    <input
                                        {...register('lidDetails.gofreDetails.notes')}
                                        placeholder="Örn: Tam orta..."
                                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {lidHasWindow && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border border-slate-200">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Pencere Genişlik</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.windowDimensions.width')}
                                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Pencere Yükseklik</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.windowDimensions.height')}
                                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Materyal</label>
                                <input
                                    {...register('lidDetails.material')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Örn: PVC, Karton..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Boya / Renk</label>
                                <input
                                    {...register('lidDetails.paint')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Örn: CMYK + Yaldız"
                                />
                            </div>
                            
                            <div className="col-span-full grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Kapak Boy</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.dimensions.length')}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Kapak En</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.dimensions.width')}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Kapak Derinlik</label>
                                    <input
                                        type="number"
                                        {...register('lidDetails.dimensions.depth')}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Notlar</label>
                                <input
                                    {...register('lidDetails.notes')}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Kapak hakkında ek notlar..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Ürün Detayları</label>
                    <textarea
                        {...register('details')}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Ürün hakkındaki tüm teknik detaylar ve açıklamalar..."
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Ürün Görselleri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Images */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 flex justify-between">
                            Müşteri Görselleri
                            <span className="text-xs text-slate-500 font-normal">{customerImages.length}/2</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {customerImages.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    <img src={img} alt={`Customer ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx, 'customer')}
                                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {customerImages.length < 2 && (
                                <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'customer')}
                                        multiple={false}
                                    />
                                    <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                    <span className="text-xs text-slate-500 group-hover:text-indigo-600 text-center px-2">
                                        Müşteri görseli<br />yükle
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Design Images */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 flex justify-between">
                            Tasarım Görselleri
                            <span className="text-xs text-slate-500 font-normal">{designImages.length}/2</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {designImages.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    <img src={img} alt={`Design ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx, 'design')}
                                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {designImages.length < 2 && (
                                <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'design')}
                                        multiple={false}
                                    />
                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                    <span className="text-xs text-slate-500 group-hover:text-indigo-600 text-center px-2">
                                        Tasarım görseli<br />yükle
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {initialData ? 'Güncelle' : 'Kaydet'}
                </button>
            </div>
        </form>
    );
}
