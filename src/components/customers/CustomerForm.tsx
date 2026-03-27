import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer, CustomerFormData } from '../../types';
import { FormSection, InputGroup, premiumInputClass } from '../ui/FormLayouts';
import { Mail, Phone, MapPin, User, Building } from 'lucide-react';

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full mx-auto">
            <FormSection 
                title="Şirket Bilgileri" 
                description="Müşterinin resmi ünvanı ve ana iletişim bilgileri"
            >
                <InputGroup label="Firma Ünvanı" error={errors.companyName?.message} required>
                    <div className="relative group">
                        <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            {...register('companyName')}
                            placeholder="Şirket A.Ş."
                            className={`${premiumInputClass} pl-11`}
                        />
                    </div>
                </InputGroup>

                <InputGroup label="Yetkili Kişi" error={errors.contactName?.message} required>
                    <div className="relative group">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            {...register('contactName')}
                            placeholder="Ad Soyad"
                            className={`${premiumInputClass} pl-11`}
                        />
                    </div>
                </InputGroup>
            </FormSection>

            <FormSection 
                title="İletişim Detayları" 
                description="E-posta ve telefon numaraları"
            >
                <InputGroup label="Email" error={errors.email?.message} required>
                    <div className="relative group">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            {...register('email')}
                            type="email"
                            placeholder="ornek@sirket.com"
                            className={`${premiumInputClass} pl-11`}
                        />
                    </div>
                </InputGroup>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Telefon" error={errors.phone?.message} required>
                        <div className="relative group">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                {...register('phone')}
                                placeholder="0212..."
                                className={`${premiumInputClass} pl-11`}
                            />
                        </div>
                    </InputGroup>

                    <InputGroup label="Mobil" error={errors.mobile?.message} required>
                        <div className="relative group">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                {...register('mobile')}
                                placeholder="05..."
                                className={`${premiumInputClass} pl-11`}
                            />
                        </div>
                    </InputGroup>
                </div>
            </FormSection>

            <FormSection 
                title="Adres Bilgileri" 
                description="Faturada görünecek açık adres"
            >
                <div className="md:col-span-2">
                    <InputGroup label="Açık Adres" error={errors.address?.message} required>
                        <div className="relative group">
                            <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <textarea
                                {...register('address')}
                                rows={3}
                                placeholder="Mahalle, Cadde, No..."
                                className={`${premiumInputClass} pl-11 pt-2.5 resize-none`}
                            />
                        </div>
                    </InputGroup>
                </div>
            </FormSection>

            <div className="sticky bottom-0 bg-white/50 backdrop-blur-md pt-6 pb-2 -mx-6 px-6 border-t border-slate-200/60 flex justify-end gap-3 z-10">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    className="px-8 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
                >
                    {initialData ? 'GÜNCELLE' : 'MÜŞTERİYİ KAYDET'}
                </button>
            </div>
        </form>
    );
}
