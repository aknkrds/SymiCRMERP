import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer, CustomerFormData } from '../../types';
import { cn } from '../../lib/utils';

const customerSchema = z.object({
    companyName: z.string().min(2, 'Firma ünvanı en az 2 karakter olmalıdır'),
    contactName: z.string().min(2, 'Yetkili adı en az 2 karakter olmalıdır'),
    email: z.string().email('Geçersiz email adresi'),
    phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
    mobile: z.string().min(10, 'Geçerli bir mobil numara giriniz'),
    address: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
});

interface CustomerFormProps {
    initialData?: Customer;
    onSubmit: (data: CustomerFormData) => void;
    onCancel: () => void;
}

export function CustomerForm({ initialData, onSubmit, onCancel }: CustomerFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: initialData || {
            companyName: '',
            contactName: '',
            email: '',
            phone: '',
            mobile: '',
            address: '',
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Firma Ünvanı</label>
                    <input
                        {...register('companyName')}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.companyName ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="Şirket A.Ş."
                        aria-label="Firma Ünvanı"
                    />
                    {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Yetkili Kişi</label>
                    <input
                        {...register('contactName')}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.contactName ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="Ad Soyad"
                        aria-label="Yetkili Kişi"
                    />
                    {errors.contactName && <p className="text-xs text-red-500">{errors.contactName.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Telefon</label>
                    <input
                        {...register('phone')}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.phone ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="0212..."
                        aria-label="Telefon"
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Mobil</label>
                    <input
                        {...register('mobile')}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.mobile ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="05..."
                        aria-label="Mobil"
                    />
                    {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                        {...register('email')}
                        type="email"
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.email ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="ornek@sirket.com"
                        aria-label="Email"
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Adres</label>
                    <textarea
                        {...register('address')}
                        rows={3}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                            errors.address ? "border-red-500" : "border-slate-300"
                        )}
                        placeholder="Açık adres..."
                        aria-label="Adres"
                    />
                    {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="İptal"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    aria-label={initialData ? 'Müşteriyi Güncelle' : 'Müşteriyi Kaydet'}
                >
                    {initialData ? 'Güncelle' : 'Kaydet'}
                </button>
            </div>
        </form>
    );
}
