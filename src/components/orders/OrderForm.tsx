import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, Plus, Search, ChevronDown, Package, DollarSign, Calendar, CreditCard, Info, Users, Percent } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useUsers } from '../../hooks/useUsers';
import type { OrderFormData, Product, ProductFormData } from '../../types';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../products/ProductForm';
import { FormSection, FormCard, InputGroup, premiumInputClass } from '../ui/FormLayouts';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

const orderSchema = z.object({
    customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
    customerName: z.string(),
    currency: z.string().default('TRY'),
    deadline: z.string().nullish(),
    paymentMethod: z.enum(['havale_eft', 'cek', 'cari_hesap'], { 
        errorMap: () => ({ message: 'Lütfen geçerli bir ödeme şekli seçiniz' }) 
    }),
    maturityDays: z.coerce.number().optional(),
    prepaymentAmount: z.string().nullish(),
    prepaymentRate: z.coerce.number().optional(),
    salesRepId: z.string().nullish(),
    salesRepName: z.string().nullish(),
    gofrePrice: z.coerce.number().optional(),
    gofreQuantity: z.coerce.number().optional(),
    gofreUnitPrice: z.coerce.number().optional(),
    gofreVatRate: z.coerce.number().optional(),
    shippingPrice: z.coerce.number().optional(),
    shippingVatRate: z.coerce.number().optional(),
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
        'created', 'offer_sent', 'waiting_manager_approval', 'manager_approved',
        'revision_requested', 'offer_accepted', 'offer_cancelled',
        'supply_design_process', 'design_pending', 'design_approved',
        'supply_completed', 'production_planned', 'production_started',
        'production_completed', 'invoice_added', 'shipping_completed',
        'order_completed', 'order_cancelled'
    ]).default('offer_sent'),
    salesNotes: z.string().nullish(),
    designNotes: z.string().nullish(),
});

interface OrderFormProps {
    initialData?: any; 
    onSubmit: (data: OrderFormData) => void;
    onCancel: () => void;
    readOnly?: boolean;
    defaultVatRate?: number;
}

export function OrderForm({ initialData, onSubmit, onCancel, readOnly = false, defaultVatRate = 20 }: OrderFormProps) {
    const { customers } = useCustomers();
    const { users } = useUsers();
    const salesUsers = users.filter(u => u.roleName === 'Satış');
    const [customerProducts, setCustomerProducts] = useState<Product[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
    const [maturityMode, setMaturityMode] = useState<'days' | 'date'>('days');
    const [maturityDate, setMaturityDate] = useState('');

    const [customerSearch, setCustomerSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: initialData || {
            customerId: '', customerName: '', currency: 'TRY', status: 'offer_sent', items: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            reset(initialData);
            if (initialData.customerName) setCustomerSearch(initialData.customerName);
            const md = Number(initialData.maturityDays) || 0;
            if (md > 0) {
                try {
                    setMaturityDate(format(addDays(new Date(), md), 'yyyy-MM-dd'));
                } catch {
                    setMaturityDate('');
                }
            }
        }
    }, [initialData, reset]);

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });

    const watchedItems = watch('items');
    const watchedCustomerId = watch('customerId');
    const watchedCustomerName = watch('customerName');
    const watchedPaymentMethod = watch('paymentMethod');
    const watchedMaturityDays = watch('maturityDays');
    const watchedGofreQuantity = watch('gofreQuantity');
    const watchedGofreUnitPrice = watch('gofreUnitPrice');
    const watchedGofreVatRate = watch('gofreVatRate');
    const watchedShippingPrice = watch('shippingPrice');
    const watchedShippingVatRate = watch('shippingVatRate');
    const watchedPrepaymentRate = watch('prepaymentRate');

    useEffect(() => {
        const qty = Number(watchedGofreQuantity) || 0;
        const up = Number(watchedGofreUnitPrice) || 0;
        setValue('gofrePrice', qty * up);
    }, [watchedGofreQuantity, watchedGofreUnitPrice, setValue]);

    useEffect(() => {
        if (watchedCustomerId) {
            fetch(`/api/customers/${watchedCustomerId}/products`)
                .then(async (res) => {
                    if (!res.ok) {
                        return [];
                    }
                    const data = await res.json();
                    return Array.isArray(data) ? data : [];
                })
                .then(setCustomerProducts)
                .catch(() => setCustomerProducts([]));
        } else {
            setCustomerProducts([]);
        }
    }, [watchedCustomerId]);

    useEffect(() => {
        if (readOnly) return;
        const usesMaturity = watchedPaymentMethod === 'cek' || watchedPaymentMethod === 'cari_hesap';
        if (!usesMaturity) {
            setValue('maturityDays', undefined);
            setMaturityDate('');
            return;
        }
        const md = Number(watchedMaturityDays) || 0;
        if (md > 0 && maturityMode === 'days') {
            try {
                setMaturityDate(format(addDays(new Date(), md), 'yyyy-MM-dd'));
            } catch {
                setMaturityDate('');
            }
        }
    }, [watchedPaymentMethod, watchedMaturityDays, maturityMode, readOnly, setValue]);

    const handleCreateProduct = async (data: ProductFormData) => {
        const newProduct = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        const res = await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct),
        });
        if (res.ok) {
            const saved = await res.json();
            setCustomerProducts(prev => [...prev, saved]);
            if (activeLineIndex !== null) setValue(`items.${activeLineIndex}.productId`, saved.id);
            setIsProductModalOpen(false);
        }
    };

    const calculateGrandTotal = () => {
        const itemsTotal = (watchedItems || []).reduce((acc, item) => {
            const val = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 + (Number(item.vatRate) || 0) / 100);
            return acc + val;
        }, 0);
        const gofre = ((Number(watchedGofreQuantity) || 0) * (Number(watchedGofreUnitPrice) || 0)) * (1 + (Number(watchedGofreVatRate) || 0) / 100);
        const shipping = (Number(watchedShippingPrice) || 0) * (1 + (Number(watchedShippingVatRate) || 0) / 100);
        return itemsTotal + gofre + shipping;
    };

    return (
        <div className="w-full space-y-8 pb-12">
            <form onSubmit={handleSubmit(onSubmit, (errors) => {
                console.error("Validation Errors:", errors);
                const firstError = Object.values(errors)[0];
                if (firstError && typeof firstError === 'object' && 'message' in firstError) {
                    alert('Lütfen zorunlu alanları doldurun: ' + firstError.message);
                } else if (errors.items && Array.isArray(errors.items)) {
                    alert('Lütfen sipariş kalemlerindeki eksikleri giderin.');
                } else {
                    alert('Lütfen formdaki hataları düzeltin.');
                }
            })} className="space-y-8">
                {/* Header Information */}
                <FormSection compact={readOnly} title="Genel Bilgiler" description="Müşteri seçimi ve sipariş temel detayları">
                    <InputGroup compact={readOnly} label="Müşteri" error={errors.customerId?.message} required className="relative" ref={customerDropdownRef}>
                        <div className="relative group">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setIsCustomerDropdownOpen(true);
                                    if (watchedCustomerId) setValue('customerId', '');
                                    if (watchedCustomerName) setValue('customerName', '');
                                }}
                                onFocus={() => !readOnly && setIsCustomerDropdownOpen(true)}
                                disabled={readOnly}
                                placeholder="Müşteri ara..."
                                className={`${premiumInputClass} pl-11`}
                            />
                            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        {isCustomerDropdownOpen && !readOnly && (
                            <div className="absolute z-[100] w-full mt-1 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1">
                                {customers.filter(c => c.companyName.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                    <button
                                        key={c.id} type="button"
                                        onClick={() => {
                                            setValue('customerId', c.id);
                                            setValue('customerName', c.companyName);
                                            setCustomerSearch(c.companyName);
                                            setIsCustomerDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                    >
                                        <div className="font-bold text-sm tracking-tight">{c.companyName}</div>
                                        <div className="text-[10px] opacity-80 uppercase tracking-wider">{c.contactName}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <input type="hidden" {...register('customerId')} />
                        <input type="hidden" {...register('customerName')} />
                    </InputGroup>

                    <InputGroup compact={readOnly} label="Termin Tarihi" error={errors.deadline?.message}>
                        <div className="relative group">
                            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                            <input type="date" {...register('deadline')} disabled={readOnly} className={`${premiumInputClass} pl-11`} />
                        </div>
                    </InputGroup>

                    <InputGroup compact={readOnly} label="Para Birimi" required>
                        <select {...register('currency')} disabled={readOnly} className={premiumInputClass}>
                            <option value="TRY">TRY - Türk Lirası</option>
                            <option value="USD">USD - Amerikan Doları</option>
                            <option value="EUR">EUR - Euro</option>
                        </select>
                    </InputGroup>

                    <InputGroup compact={readOnly} label="Satış Temsilcisi">
                        <div className="relative group">
                            <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
                            <select
                                value={watch('salesRepId') || ''}
                                onChange={(e) => {
                                    const user = salesUsers.find(u => u.id === e.target.value);
                                    setValue('salesRepId', e.target.value || undefined);
                                    setValue('salesRepName', user?.fullName || undefined);
                                }}
                                disabled={readOnly}
                                className={`${premiumInputClass} pl-11`}
                            >
                                <option value="">Seçiniz</option>
                                {salesUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                            </select>
                        </div>
                    </InputGroup>

                    <InputGroup compact={readOnly} label="Ödeme Şekli" required error={errors.paymentMethod?.message as string}>
                        <select {...register('paymentMethod')} disabled={readOnly} className={premiumInputClass}>
                            <option value="">Seçiniz</option>
                            <option value="havale_eft">Havale-EFT</option>
                            <option value="cek">Çek</option>
                            <option value="cari_hesap">Cari Hesap</option>
                        </select>
                    </InputGroup>

                    {(watchedPaymentMethod === 'cek' || watchedPaymentMethod === 'cari_hesap') && (
                        <InputGroup compact={readOnly} label="Vade">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setMaturityMode('days')}
                                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-colors ${maturityMode === 'days' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Gün
                                    </button>
                                    <button
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setMaturityMode('date')}
                                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-colors ${maturityMode === 'date' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Tarih
                                    </button>
                                    {Number(watchedMaturityDays) > 0 && (
                                        <div className="text-[11px] text-slate-500 font-mono ml-auto">
                                            {Number(watchedMaturityDays)} gün
                                        </div>
                                    )}
                                </div>

                                {maturityMode === 'days' ? (
                                    <div className="space-y-1">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={Number(watchedMaturityDays) || ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                                                setValue('maturityDays', val);
                                                if (val && val > 0) {
                                                    try {
                                                        setMaturityDate(format(addDays(new Date(), val), 'yyyy-MM-dd'));
                                                    } catch {
                                                        setMaturityDate('');
                                                    }
                                                } else {
                                                    setMaturityDate('');
                                                }
                                            }}
                                            disabled={readOnly}
                                            className={premiumInputClass}
                                            placeholder="Vade gün (örn: 30)"
                                            aria-label="Vade gün"
                                        />
                                        {maturityDate && (
                                            <div className="text-[11px] text-slate-500">
                                                Vade Tarihi: <span className="font-mono">{maturityDate}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <input
                                            type="date"
                                            value={maturityDate}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setMaturityDate(v);
                                                if (!v) {
                                                    setValue('maturityDays', undefined);
                                                    return;
                                                }
                                                const today = new Date();
                                                const target = new Date(`${v}T00:00:00`);
                                                const diff = Math.max(0, differenceInCalendarDays(target, today));
                                                setValue('maturityDays', diff);
                                            }}
                                            disabled={readOnly}
                                            className={premiumInputClass}
                                            aria-label="Vade tarihi"
                                        />
                                        {Number(watchedMaturityDays) > 0 && (
                                            <div className="text-[11px] text-slate-500">
                                                Vade Gün: <span className="font-mono">{Number(watchedMaturityDays)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </InputGroup>
                    )}
                </FormSection>

                {/* Notlar Section */}
                <FormSection compact={readOnly} title="Notlar" description="Sipariş için gerekli açıklamalar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup compact={readOnly} label="Satış Personeli Notu">
                            <textarea
                                {...register('salesNotes')}
                                disabled={readOnly}
                                rows={3}
                                className={premiumInputClass}
                                placeholder="Satış süreciyle ilgili notlar..."
                            />
                        </InputGroup>
                        <InputGroup compact={readOnly} label="Tasarım Departmanı Notu">
                            <textarea
                                {...register('designNotes')}
                                disabled={readOnly}
                                rows={3}
                                className={premiumInputClass}
                                placeholder="Tasarım ekibi için özel notlar..."
                            />
                        </InputGroup>
                    </div>
                </FormSection>

                {/* Items Section */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Package size={18} className="text-blue-500" />
                            <h4 className="font-bold text-slate-800 tracking-tight">Sipariş Kalemleri</h4>
                        </div>
                        <button
                            type="button"
                            onClick={() => append({ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, unit: 'Adet', vatRate: defaultVatRate, total: 0 })}
                            disabled={readOnly}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50"
                        >
                            <Plus size={14} /> Yeni Satır Ekle
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <FormCard compact={readOnly} key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative overflow-visible">
                                <div className="md:col-span-4 lg:col-span-5">
                                    <InputGroup compact={readOnly} label="Ürün">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                {readOnly ? (
                                                    <input
                                                        type="text"
                                                        value={watch(`items.${index}.productName`) || ''}
                                                        disabled
                                                        aria-label="Ürün"
                                                        placeholder="Ürün"
                                                        className={premiumInputClass}
                                                    />
                                                ) : (
                                                    <Controller
                                                        control={control}
                                                        name={`items.${index}.productId`}
                                                        render={({ field }) => (
                                                            <select
                                                                {...field}
                                                                onChange={(e) => {
                                                                    const p = customerProducts.find(x => x.id === e.target.value);
                                                                    if (p) {
                                                                        setValue(`items.${index}.productName`, p.name);
                                                                        field.onChange(e.target.value);
                                                                    } else {
                                                                        setValue(`items.${index}.productName`, '');
                                                                        field.onChange(e.target.value);
                                                                    }
                                                                }}
                                                                className={premiumInputClass}
                                                            >
                                                                <option value="">Seçiniz...</option>
                                                                {customerProducts.map(p => {
                                                                    const dims = p.dimensions && (p.dimensions.length || p.dimensions.width || p.dimensions.depth)
                                                                        ? ` (${[p.dimensions.length, p.dimensions.width, p.dimensions.depth].filter(v => v && Number(v) > 0).join('x')}mm)`
                                                                        : '';
                                                                    return <option key={p.id} value={p.id}>{p.code} - {p.name}{dims}</option>;
                                                                })}
                                                            </select>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    disabled={!watchedCustomerId}
                                                    onClick={() => {
                                                        if (!watchedCustomerId) return;
                                                        setActiveLineIndex(index);
                                                        setIsProductModalOpen(true);
                                                    }}
                                                    className="shrink-0 flex items-center justify-center w-[42px] bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-100"
                                                    title={watchedCustomerId ? "Bu müşteri için yeni ürün ekle" : "Önce müşteri seçmelisiniz"}
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-2">
                                    <InputGroup compact={readOnly} label="Miktar">
                                        <input type="number" {...register(`items.${index}.quantity`)} disabled={readOnly} className={premiumInputClass} />
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <InputGroup compact={readOnly} label="Birim Fiyat">
                                        <div className="relative group">
                                            <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500" />
                                            <input type="number" step="0.01" {...register(`items.${index}.unitPrice`)} disabled={readOnly} className={`${premiumInputClass} pl-9`} />
                                        </div>
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-3 lg:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <InputGroup compact={readOnly} label="KDV %">
                                                <input type="number" {...register(`items.${index}.vatRate`)} disabled={readOnly} className={premiumInputClass} />
                                            </InputGroup>
                                        </div>
                                        {!readOnly && (
                                            <button 
                                                type="button" onClick={() => remove(index)}
                                                className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                aria-label="Satırı sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </FormCard>
                        ))}
                    </div>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                    <div className="md:col-span-2 space-y-6">
                        <FormSection compact={readOnly} title="Ek Hizmetler" description="Gofre ve Nakliye detayları">
                            <InputGroup compact={readOnly} label="Gofre Bilgisi">
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="Adet" {...register('gofreQuantity')} disabled={readOnly} className={premiumInputClass} />
                                    <input type="number" step="0.01" placeholder="Birim Fiyat" {...register('gofreUnitPrice')} disabled={readOnly} className={premiumInputClass} />
                                </div>
                            </InputGroup>
                            <InputGroup compact={readOnly} label="Nakliye Tutarı">
                                <div className="relative group">
                                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500" />
                                    <input type="number" step="0.01" {...register('shippingPrice')} disabled={readOnly} className={`${premiumInputClass} pl-9`} />
                                </div>
                            </InputGroup>
                            <InputGroup compact={readOnly} label="Peşin Tutar (%)">
                                <div className="relative group">
                                    <Percent size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500" />
                                    <input type="number" step="1" min="0" max="100" placeholder="Örn: 30" {...register('prepaymentRate')} disabled={readOnly} className={`${premiumInputClass} pl-9`} />
                                </div>
                                {Number(watchedPrepaymentRate) > 0 && (
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                                        %{Number(watchedPrepaymentRate)} peşin → {(calculateGrandTotal() * Number(watchedPrepaymentRate) / 100).toLocaleString()} {watch('currency')} peşin
                                    </div>
                                )}
                            </InputGroup>
                        </FormSection>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-6 space-y-6 sticky top-4 h-fit">
                        <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-widest text-[10px]">
                            <CreditCard size={14} /> Hesap Özeti
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Ara Toplam</span>
                                <span className="font-mono">{(calculateGrandTotal() / 1.2).toLocaleString()} {watch('currency')}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Vergiler (KDV)</span>
                                <span className="font-mono">{(calculateGrandTotal() * 0.166).toLocaleString()} {watch('currency')}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-bold text-slate-800">GENEL TOPLAM</span>
                                <span className="text-xl font-black text-blue-600 font-mono tracking-tighter">
                                    {calculateGrandTotal().toLocaleString()} {watch('currency')}
                                </span>
                            </div>
                            {Number(watchedPrepaymentRate) > 0 && (
                                <>
                                    <div className="h-px bg-emerald-200" />
                                    <div className="flex justify-between text-sm text-emerald-700">
                                        <span className="font-bold">Peşin (%{Number(watchedPrepaymentRate)})</span>
                                        <span className="font-mono font-bold">
                                            {(calculateGrandTotal() * Number(watchedPrepaymentRate) / 100).toLocaleString()} {watch('currency')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm text-amber-700">
                                        <span className="font-bold">{watchedPaymentMethod === 'cek' ? 'Çek' : 'Vade'}</span>
                                        <span className="font-mono font-bold">
                                            {(calculateGrandTotal() * (100 - Number(watchedPrepaymentRate)) / 100).toLocaleString()} {watch('currency')}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="bg-blue-100/50 p-3 rounded-xl flex items-start gap-2 text-blue-700 text-[10px] leading-relaxed">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <span>Tutarlar seçilen para birimi üzerinden hesaplanmış olup vergiler dahildir.</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white/50 backdrop-blur-md pt-6 pb-2 -mx-6 px-6 border-t border-slate-200/60 flex justify-end gap-3 z-10">
                    <button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all">Vazgeç</button>
                    <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
                        {initialData ? 'SİPARİŞİ GÜNCELLE' : 'SİPARİŞİ OLUŞTUR'}
                    </button>
                </div>
            </form>

            <Modal size="lg" isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Yeni Ürün Tanımla">
                <ProductForm onSubmit={handleCreateProduct} onCancel={() => setIsProductModalOpen(false)} />
            </Modal>
        </div>
    );
}
