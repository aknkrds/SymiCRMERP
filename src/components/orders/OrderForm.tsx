import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, CheckCircle, ArrowRight, Plus, Search, ChevronDown } from 'lucide-react';
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
    deadline: z.string().nullish(),
    paymentMethod: z.enum(['havale_eft', 'cek', 'cari_hesap']).nullish(),
    maturityDays: z.coerce.number().optional(),
    prepaymentAmount: z.string().nullish(),
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
    defaultVatRate?: number;
}

export function OrderForm({ initialData, onSubmit, onCancel, readOnly = false, defaultVatRate = 20 }: OrderFormProps) {
    const { customers } = useCustomers();
    const { products: allProducts } = useProducts(); // Renamed to avoid confusion, though we won't use it for the dropdown
    const { user } = useAuth();
    
    const [customerProducts, setCustomerProducts] = useState<Product[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

    // Customer Search State
    const [customerSearch, setCustomerSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: initialData || {
            customerId: '',
            customerName: '',
            currency: 'TRY',
            status: 'offer_sent',
            items: [],
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            console.log('OrderForm: Resetting with initialData', initialData);
            reset(initialData);
            if (initialData.customerName) {
                setCustomerSearch(initialData.customerName);
            }
        }
    }, [initialData, reset]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    });

    const watchedStatus = watch('status');
    const watchedPaymentMethod = watch('paymentMethod');
    const watchedPrepaymentAmount = watch('prepaymentAmount');
    const [isPrepaymentVisible, setIsPrepaymentVisible] = useState(false);

    // Workflow Transition Logic
    const getNextStep = () => {
        if (!user) return null;
        const role = user.roleName || '';
        
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
            handleSubmit(onFormSubmit, onFormError)();
        }
    };

    // Watch items to calculate totals interactively
    const watchedItems = watch('items');
    const watchedCustomerId = watch('customerId');
    const watchedGofrePrice = watch('gofrePrice');
    const watchedGofreQuantity = watch('gofreQuantity');
    const watchedGofreUnitPrice = watch('gofreUnitPrice');

    // Calculate Gofre Total Base automatically
    useEffect(() => {
        const qty = Number(watchedGofreQuantity) || 0;
        const unitPrice = Number(watchedGofreUnitPrice) || 0;
        const totalBase = qty * unitPrice;
        if (Math.abs((watchedGofrePrice || 0) - totalBase) > 0.01) {
            setValue('gofrePrice', totalBase);
        }
    }, [watchedGofreQuantity, watchedGofreUnitPrice, watchedGofrePrice, setValue]);
    
    const watchedGofreVatRate = watch('gofreVatRate');
    const watchedShippingPrice = watch('shippingPrice');
    const watchedShippingVatRate = watch('shippingVatRate');

    // Click outside handler for customer dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setIsCustomerDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Sync search text with selected customer
    useEffect(() => {
        if (watchedCustomerId) {
            const customer = customers.find(c => c.id === watchedCustomerId);
            if (customer) {
                // Only update search text if it's not currently being typed into (rough heuristic, or just on load)
                // Actually we update it to ensure it matches the ID
                if (customer.companyName !== customerSearch) {
                    setCustomerSearch(customer.companyName);
                }
            }
        }
    }, [watchedCustomerId, customers]);

    // Fetch customer products when customer changes
    useEffect(() => {
        if (watchedCustomerId) {
            console.log('Fetching products for customer:', watchedCustomerId);
            fetch(`/api/customers/${watchedCustomerId}/products`)
                .then(res => res.json())
                .then(data => {
                    console.log('Customer products loaded:', data.length);
                    setCustomerProducts(data);
                })
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
                    console.log('Setting new product for index:', activeLineIndex, savedProduct.id);
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
        if (readOnly) return;
        
        // Skip sync if products are not loaded yet to prevent overwriting correct data with empty values
        if (customerProducts.length === 0) return;

        // Calculate totals only
        watchedItems?.forEach((item, index) => {
            if (!item) return;

            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const vat = Number(item.vatRate) || 0;
            const total = qty * price * (1 + vat / 100);
            
            if (Math.abs((item.total || 0) - total) > 0.001) {
                setValue(`items.${index}.total`, total);
            }
        });
    }, [watchedItems, setValue, readOnly]);

    const onFormSubmit = (data: OrderFormData) => {
        console.log('OrderForm Submit Data:', JSON.stringify(data, null, 2));
        console.log('Items before submit:', data.items);
        
        // Validate items uniqueness check (optional debug)
        const productIds = data.items.map(i => i.productId);
        const uniqueIds = new Set(productIds);
        if (productIds.length !== uniqueIds.size) {
            console.warn('Warning: Duplicate product IDs in submission:', productIds);
        }

        // Validation passed
        onSubmit(data);
    };

    const onFormError = (errors: any) => {
        console.error("Form Validation Errors:", errors);
        alert('Lütfen formdaki hataları düzeltiniz.');
    };

    const calculateGrandTotal = () => {
        if (!watchedItems) return 0;
        const itemsTotal = watchedItems.reduce((acc, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const vat = Number(item.vatRate) || 0;
            const lineTotal = qty * price * (1 + vat / 100);
            return acc + lineTotal;
        }, 0);

        const gofreQty = Number(watchedGofreQuantity) || 0;
        const gofreUnit = Number(watchedGofreUnitPrice) || 0;
        // recalculate gofreBase to be sure
        const gofreBase = gofreQty * gofreUnit;
        
        const gofreVatRate = Number(watchedGofreVatRate) || 0;
        const gofreVat = gofreBase * (gofreVatRate / 100);

        const shippingBase = Number(watchedShippingPrice) || 0;
        const shippingVatRate = Number(watchedShippingVatRate) || 0;
        const shippingVat = shippingBase * (shippingVatRate / 100);

        return itemsTotal + gofreBase + gofreVat + shippingBase + shippingVat;
    };

    return (
        <>
            <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-6">
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
                <div className="space-y-1 relative" ref={customerDropdownRef}>
                    <label className="text-sm font-medium text-slate-700">Müşteri</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setIsCustomerDropdownOpen(true);
                                if (watchedCustomerId) setValue('customerId', '');
                            }}
                            onFocus={() => !readOnly && setIsCustomerDropdownOpen(true)}
                            disabled={readOnly}
                            placeholder="Müşteri ara..."
                            className={cn(
                                "w-full pl-10 pr-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500",
                                errors.customerId ? "border-red-500" : "border-slate-300"
                            )}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                    
                    {/* Hidden input to maintain form registration */}
                    <input type="hidden" {...register('customerId')} />

                    {isCustomerDropdownOpen && !readOnly && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {customers
                                .filter(c => 
                                    c.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                    c.contactName.toLowerCase().includes(customerSearch.toLowerCase())
                                )
                                .map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            setValue('customerId', c.id);
                                            setCustomerSearch(c.companyName);
                                            setIsCustomerDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none border-b border-slate-50 last:border-0"
                                    >
                                        <div className="font-medium text-slate-800">{c.companyName}</div>
                                        <div className="text-xs text-slate-500">{c.contactName}</div>
                                    </button>
                                ))
                            }
                            {customers.filter(c => 
                                c.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                c.contactName.toLowerCase().includes(customerSearch.toLowerCase())
                            ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Sonuç bulunamadı
                                </div>
                            )}
                        </div>
                    )}
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

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Ön Ödeme</label>
                    {!isPrepaymentVisible && !watchedPrepaymentAmount && (
                        <button
                            type="button"
                            onClick={() => !readOnly && setIsPrepaymentVisible(true)}
                            className="mt-1 inline-flex items-center px-3 py-1.5 border border-dashed border-slate-300 text-xs font-medium rounded-md text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-60"
                            disabled={readOnly}
                        >
                            Ön Ödeme Ekle
                        </button>
                    )}
                    {(isPrepaymentVisible || !!watchedPrepaymentAmount) && (
                        <div className="space-y-1">
                            <input
                                type="text"
                                {...register('prepaymentAmount')}
                                disabled={readOnly}
                                placeholder="Örn: %30 veya 10.000"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                aria-label="Ön ödeme oranı veya tutarı"
                            />
                            <p className="text-[11px] text-slate-500">
                                Bu alana ister % oran, ister tutar yazabilirsiniz. Genel toplamı değiştirmez.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">Sipariş Kalemleri</h4>
                </div>

                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <input type="hidden" {...register(`items.${index}.productName`)} />
                            {/* Üst Satır: Ürün Seçimi, Adet, Fiyat */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-6 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Ürün</label>
                                    <Controller
                                        control={control}
                                        name={`items.${index}.productId`}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                disabled={readOnly}
                                                onChange={(e) => {
                                                    const newProductId = e.target.value;
                                                    field.onChange(newProductId); // Update react-hook-form state
                                                    
                                                    // Find product and update other fields
                                                    const product = customerProducts.find(p => p.id === newProductId);
                                                    if (product) {
                                                        const dimStr = product.dimensions ? `${product.dimensions.length}x${product.dimensions.width}${product.dimensions.depth ? `x${product.dimensions.depth}` : ''}` : '';
                                                        const productName = `${product.code} ${dimStr ? `- ${dimStr}` : ''} - ${product.name}${product.details ? ` - ${product.details}` : ''}`;
                                                        
                                                        setValue(`items.${index}.productName`, productName, { shouldDirty: true });
                                                        // Reset price if 0 or keep existing? Usually reset to 0 or product price if available
                                                        // But products don't have price field in this model, so maybe keep 0
                                                        // Or if product has default price logic, apply it here.
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500",
                                                    errors.items?.[index]?.productId ? "border-red-500" : "border-slate-300"
                                                )}
                                                aria-label="Ürün Seçimi"
                                            >
                                                <option value="">Seçiniz</option>
                                                {customerProducts.map(p => {
                                                    const dims = p.dimensions;
                                                    const dimStr = (dims && dims.length && dims.width) 
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
                                                {field.value && 
                                                 !customerProducts.some(p => p.id === field.value) && (
                                                    <option value={field.value}>
                                                        {watchedItems?.[index]?.productName || 'Kayıtlı Ürün'}
                                                    </option>
                                                )}
                                            </select>
                                        )}
                                    />
                                    {(() => {
                                        const selectedProductId = watch(`items.${index}.productId`);
                                        if (!selectedProductId) return null;
                                        
                                        // Try to find in allProducts first (more reliable), then customerProducts
                                        const product = allProducts.find(p => p.id === selectedProductId) || customerProducts.find(p => p.id === selectedProductId);
                                        
                                        if (product) {
                                             const dims = product.dimensions;
                                             const dimStr = (dims && dims.length && dims.width) 
                                                 ? `${dims.length}x${dims.width}${dims.depth ? `x${dims.depth}` : ''}`
                                                 : '';
                                             
                                             return (
                                                  <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">
                                                      <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                                                          {product.name}
                                                          {product.productType && (
                                                              <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-normal">
                                                                  {product.productType === 'percinli' ? 'Perçinli' : (product.productType === 'sivama' ? 'Sıvama' : product.productType)}
                                                              </span>
                                                          )}
                                                      </div>
                                                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                         {product.code && <div><span className="font-medium">Kod:</span> {product.code}</div>}
                                                         {dimStr && <div><span className="font-medium">Ölçü:</span> {dimStr}</div>}
                                                         {product.details && <div className="col-span-2"><span className="font-medium">Açıklama:</span> {product.details}</div>}
                                                     </div>
                                                 </div>
                                             );
                                        }
                                        return null;
                                    })()}
                                    {errors.items?.[index]?.productId && (
                                        <p className="text-[10px] text-red-500">{errors.items[index]?.productId?.message}</p>
                                    )}
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Adet</label>
                                    <input
                                        type="number"
                                        {...register(`items.${index}.quantity` as const)}
                                        disabled={readOnly}
                                        className={cn(
                                            "w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500",
                                            errors.items?.[index]?.quantity ? "border-red-500" : "border-slate-300"
                                        )}
                                        aria-label="Adet"
                                        placeholder="0"
                                    />
                                    {errors.items?.[index]?.quantity && (
                                        <p className="text-[10px] text-red-500">{errors.items[index]?.quantity?.message}</p>
                                    )}
                                </div>

                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Birim Fiyat</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`items.${index}.unitPrice` as const)}
                                            disabled={readOnly}
                                            className={cn(
                                                "w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500",
                                                errors.items?.[index]?.unitPrice ? "border-red-500" : "border-slate-300"
                                            )}
                                            aria-label="Fiyat"
                                            placeholder="0.00"
                                        />
                                        {errors.items?.[index]?.unitPrice && (
                                            <p className="text-[10px] text-red-500">{errors.items[index]?.unitPrice?.message}</p>
                                        )}
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
                                vatRate: defaultVatRate,
                                total: 0
                            })}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus size={20} />
                            Başka Bir Ürün Daha Ekle
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">Ek Fiyatlar</span>
                            <span className="text-xs text-slate-500">Tutarlar {watch('currency')} cinsindendir</span>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Gofre Adeti</label>
                                    <input
                                        type="number"
                                        step="1"
                                        {...register('gofreQuantity')}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Gofre Fiyatı</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register('gofreUnitPrice')}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">KDV %</label>
                                    <input
                                        type="number"
                                        {...register('gofreVatRate')}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        placeholder={String(defaultVatRate)}
                                    />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Toplam</label>
                                    <div className="w-full px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
                                        {(
                                            ((Number(watchedGofreQuantity) || 0) * (Number(watchedGofreUnitPrice) || 0)) *
                                            (1 + (Number(watchedGofreVatRate) || 0) / 100)
                                        ).toFixed(2)} {watch('currency')}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-5 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Nakliye Fiyatı</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register('shippingPrice')}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">KDV %</label>
                                    <input
                                        type="number"
                                        {...register('shippingVatRate')}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        placeholder={String(defaultVatRate)}
                                    />
                                </div>
                                <div className="col-span-4 space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Toplam</label>
                                    <div className="w-full px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
                                        {(
                                            (Number(watchedShippingPrice) || 0) *
                                            (1 + (Number(watchedShippingVatRate) || 0) / 100)
                                        ).toFixed(2)} {watch('currency')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end md:justify-end items-end">
                        <div className="bg-slate-100 p-4 rounded-lg min-w-[220px] space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Genel Toplam:</span>
                                <span className="font-bold text-slate-800">{calculateGrandTotal().toFixed(2)} {watch('currency')}</span>
                            </div>
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
            onClose={() => {
                setIsProductModalOpen(false);
                setActiveLineIndex(null);
            }}
            title="Yeni Ürün Ekle"
        >
            <ProductForm
                key={activeLineIndex !== null ? `product-form-${activeLineIndex}` : 'new-product-form'}
                onSubmit={handleCreateProduct}
                onCancel={() => {
                    setIsProductModalOpen(false);
                    setActiveLineIndex(null);
                }}
            />
        </Modal>
    </>
    );
}
