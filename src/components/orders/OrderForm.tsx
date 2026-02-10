import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, CheckCircle, ArrowRight, Plus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useProducts } from '../../hooks/useProducts';
import { useAuth } from '../../context/AuthContext';
import type { OrderFormData, Product, ProductFormData } from '../../types';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../products/ProductForm';

const orderSchema = z.object({
    customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
    customerName: z.string(),
    currency: z.string().default('TRY'),
    deadline: z.string().optional(),
    paymentMethod: z.enum(['havale_eft', 'cek', 'cari_hesap']).optional(),
    maturityDays: z.coerce.number().optional(),
    items: z.array(z.object({
        id: z.string(),
        productId: z.string().min(1, 'Ürün seçimi zorunludur'),
        productName: z.string(),
        quantity: z.coerce.number().min(1, 'Adet en az 1 olmalıdır'),
        unitPrice: z.coerce.number().min(0, 'Fiyat 0 dan küçük olamaz'),
        vatRate: z.coerce.number().min(0).max(100),
        total: z.number(),
    })).min(1, 'En az bir ürün eklemelisiniz'),
    status: z.enum([
        'created', 
        'offer_sent', 
        'waiting_manager_approval',
        'manager_approved',
        'revision_requested',
        'offer_accepted', 
        'offer_cancelled',
        'supply_design_process',
        'design_pending', 
        'design_approved',
        'supply_completed',
        'production_planned',
        'production_started',
        'production_completed',
        'invoice_added',
        'shipping_completed',
        'order_completed',
        'order_cancelled'
    ]).default('offer_sent'),
});

interface OrderFormProps {
    initialData?: any; 
    onSubmit: (data: OrderFormData) => void;
    onCancel: () => void;
    readOnly?: boolean;
}

export function OrderForm({ initialData, onSubmit, onCancel, readOnly = false }: OrderFormProps) {
    const { customers } = useCustomers();
    const { products: allProducts } = useProducts(); // Renamed to avoid confusion, though we won't use it for the dropdown
    const { user } = useAuth();
    
    const [customerProducts, setCustomerProducts] = useState<Product[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: initialData || {
            customerId: '',
            customerName: '',
            currency: 'TRY',
            status: 'offer_sent',
            items: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    });

    const watchedStatus = watch('status');
    const watchedPaymentMethod = watch('paymentMethod');

    // Workflow Transition Logic
    const getNextStep = () => {
        if (!user) return null;
        const role = user.role?.name || '';
        
        // Define Handover Logic
        if (watchedStatus === 'offer_accepted' && role === 'Tasarımcı') {
            return { label: 'Tasarım İşini Üstlen', nextStatus: 'design_waiting' };
        }
        if (watchedStatus === 'design_approved' && (role === 'Tedarik' || role === 'Matbaa')) {
            return { label: 'Tedarik İşini Üstlen', nextStatus: 'supply_waiting' };
        }
        if (watchedStatus === 'supply_completed' && (role === 'Fabrika Müdürü' || role === 'Üretim')) {
            return { label: 'Üretim Planlamasını Başlat', nextStatus: 'production_planned' };
        }
        if (watchedStatus === 'production_completed' && role === 'Muhasebe') {
            return { label: 'Fatura/İrsaliye İşlemlerini Başlat', nextStatus: 'invoice_waiting' };
        }
        if (watchedStatus === 'invoice_added' && role === 'Sevkiyat') {
             return { label: 'Sevkiyat Hazırlığına Başla', nextStatus: 'shipping_waiting' };
        }
        if (watchedStatus === 'shipping_completed' && role === 'Admin') { // Assuming Admin role name
             return { label: 'Siparişi Tamamla', nextStatus: 'order_completed' };
        }
        return null;
    };

    const nextStep = getNextStep();

    const handleWorkflowAction = () => {
        if (nextStep) {
            setValue('status', nextStep.nextStatus as any);
            // Submit immediately to save the state change
            handleSubmit(onSubmit as any)();
        }
    };

    // Watch items to calculate totals interactively
    const watchedItems = watch('items');
    const watchedCustomerId = watch('customerId');

    // Fetch customer products when customer changes
    useEffect(() => {
        if (watchedCustomerId) {
            fetch(`/api/customers/${watchedCustomerId}/products`)
                .then(res => res.json())
                .then(data => setCustomerProducts(data))
                .catch(err => console.error('Error fetching customer products:', err));
        } else {
            setCustomerProducts([]);
        }
    }, [watchedCustomerId]);

    const handleCreateProduct = async (data: ProductFormData) => {
        try {
             const newProduct = {
                ...data,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            };
            
            // Post to backend
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct),
            });

            if (res.ok) {
                const savedProduct = await res.json();
                
                // Add to local list so it appears in dropdown
                setCustomerProducts(prev => [...prev, savedProduct]);
                
                // Select it in the active line
                if (activeLineIndex !== null) {
                    setValue(`items.${activeLineIndex}.productId`, savedProduct.id);
                    // Name sync will happen automatically via the other useEffect
                }
                
                setIsProductModalOpen(false);
                setActiveLineIndex(null);
            } else {
                const errorData = await res.json();
                console.error('Error creating product:', errorData);
                alert(`Ürün oluşturulamadı: ${errorData.error || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            console.error('Error creating product:', error);
            alert('Ürün oluşturulurken bir hata oluştu.');
        }
    };

    useEffect(() => {
        if (watchedCustomerId) {
            const customer = customers.find(c => c.id === watchedCustomerId);
            if (customer) {
                setValue('customerName', customer.companyName);
            }
        }
    }, [watchedCustomerId, customers, setValue]);

    // Auto-calculate totals and sync product names when items change
    useEffect(() => {
        watchedItems?.forEach((item, index) => {
            // Calculate Total
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const vat = Number(item.vatRate) || 0;
            const total = qty * price * (1 + vat / 100);
            
            if (Math.abs((item.total || 0) - total) > 0.001) {
                setValue(`items.${index}.total`, total);
            }

            // Sync Product Name
            if (item.productId) {
                const product = customerProducts.find(p => p.id === item.productId);
                if (product) {
                    const dimStr = product.dimensions ? `${product.dimensions.length}x${product.dimensions.width}x${product.dimensions.depth}` : '';
                    const expectedName = `${product.code} - ${dimStr} - ${product.name}`;
                    if (item.productName !== expectedName) {
                        setValue(`items.${index}.productName`, expectedName);
                    }
                }
            }
        });
    }, [watchedItems, setValue, customerProducts]);

    const calculateGrandTotal = () => {
        if (!watchedItems) return 0;
        return watchedItems.reduce((acc, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const vat = Number(item.vatRate) || 0;
            const lineTotal = qty * price * (1 + vat / 100);
            return acc + lineTotal;
        }, 0);
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                {nextStep && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-indigo-900">Bekleyen İşlem</h4>
                            <p className="text-sm text-indigo-700">Bu sipariş için onayınız/işlem başlatmanız bekleniyor.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleWorkflowAction}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                        aria-label={nextStep.label}
                    >
                        {nextStep.label}
                        <ArrowRight size={18} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Müşteri</label>
                    <select
                        {...register('customerId')}
                        disabled={readOnly}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500",
                            errors.customerId ? "border-red-500" : "border-slate-300"
                        )}
                        aria-label="Müşteri Seçimi"
                    >
                        <option value="">Seçiniz</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.companyName} ({c.contactName})</option>
                        ))}
                    </select>
                    {errors.customerId && <p className="text-xs text-red-500">{errors.customerId.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Termin Tarihi</label>
                    <input
                        type="date"
                        {...register('deadline')}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                        aria-label="Termin Tarihi"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Para Birimi</label>
                    <select
                        {...register('currency')}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        aria-label="Para Birimi"
                    >
                        <option value="TRY">TRY - Türk Lirası</option>
                        <option value="USD">USD - Amerikan Doları</option>
                        <option value="EUR">EUR - Euro</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Ödeme Şekli</label>
                    <select
                        {...register('paymentMethod')}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        aria-label="Ödeme Şekli"
                    >
                        <option value="">Seçiniz</option>
                        <option value="havale_eft">Havale-EFT</option>
                        <option value="cek">Çek</option>
                        <option value="cari_hesap">Cari Hesap</option>
                    </select>
                </div>

                {(watchedPaymentMethod === 'cek' || watchedPaymentMethod === 'cari_hesap') && (
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Vade Gün</label>
                        <input
                            type="number"
                            {...register('maturityDays')}
                            disabled={readOnly}
                            placeholder="Örn: 45"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                            aria-label="Vade Gün"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">Sipariş Kalemleri</h4>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            {/* Üst Satır: Ürün Seçimi, Adet, Fiyat */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-6 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Ürün</label>
                                    <select
                                        {...register(`items.${index}.productId` as const)}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                                        aria-label="Ürün Seçimi"
                                    >
                                        <option value="">Seçiniz</option>
                                        {customerProducts.map(p => {
                                            const dims = p.dimensions || {};
                                            const dimStr = (dims.length && dims.width) 
                                                ? `${dims.length}x${dims.width}${dims.depth ? `x${dims.depth}` : ''}`
                                                : '';
                                            const detailsStr = p.details ? ` - ${p.details}` : '';
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.code} {dimStr ? `- ${dimStr}` : ''} - {p.name}{detailsStr}
                                                </option>
                                            );
                                        })}
                                        {/* Fallback for selected product not in list */}
                                        {watchedItems?.[index]?.productId && 
                                         !customerProducts.some(p => p.id === watchedItems[index].productId) && (
                                            <option value={watchedItems[index].productId}>
                                                {watchedItems[index].productName || 'Kayıtlı Ürün'}
                                            </option>
                                        )}
                                    </select>
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Adet</label>
                                    <input
                                        type="number"
                                        {...register(`items.${index}.quantity` as const)}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        aria-label="Adet"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Birim Fiyat</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`items.${index}.unitPrice` as const)}
                                            disabled={readOnly}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                            aria-label="Fiyat"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Alt Satır: KDV, Toplam, İşlemler */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">KDV %</label>
                                    <input
                                        type="number"
                                        {...register(`items.${index}.vatRate` as const)}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        aria-label="KDV Oranı"
                                        placeholder="20"
                                    />
                                </div>

                                <div className="md:col-span-4 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Satır Toplamı</label>
                                    <div className="w-full px-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
                                        {(
                                            (Number(watchedItems?.[index]?.quantity) || 0) * 
                                            (Number(watchedItems?.[index]?.unitPrice) || 0) * 
                                            (1 + (Number(watchedItems?.[index]?.vatRate) || 0) / 100)
                                        ).toFixed(2)} {watch('currency')}
                                    </div>
                                </div>

                                {!readOnly && (
                                    <div className="md:col-span-5 flex justify-end gap-2 pb-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveLineIndex(index);
                                                setIsProductModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors text-sm font-medium"
                                            title="Listede olmayan yeni bir ürün oluştur"
                                        >
                                            <Plus size={16} />
                                            Yeni Ürün Ekle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-sm font-medium"
                                            title="Bu satırı sil"
                                        >
                                            <Trash2 size={16} />
                                            Sil
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {errors.items && <p className="text-xs text-red-500 text-center">{errors.items.message}</p>}
                    
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => append({
                                id: crypto.randomUUID(),
                                productId: '',
                                productName: '',
                                quantity: 1,
                                unitPrice: 0,
                                vatRate: 20,
                                total: 0
                            })}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus size={20} />
                            Başka Bir Ürün Daha Ekle
                        </button>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <div className="bg-slate-100 p-4 rounded-lg min-w-[200px] space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Toplam Tutar:</span>
                            <span className="font-bold text-slate-800">{calculateGrandTotal().toFixed(2)} {watch('currency')}</span>
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
                    {readOnly ? 'Kapat' : 'İptal'}
                </button>
                {!readOnly && (
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        {initialData ? 'Güncelle' : 'Sipariş Oluştur'}
                    </button>
                )}
            </div>
        </form>

        <Modal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            title="Yeni Ürün Ekle"
        >
            <ProductForm
                onSubmit={handleCreateProduct}
                onCancel={() => setIsProductModalOpen(false)}
            />
        </Modal>
    </>
    );
}
