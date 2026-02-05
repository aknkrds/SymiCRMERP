import { useState, useEffect, useCallback } from 'react';

export type CompanySettings = {
    companyName: string;
    contactName: string;
    address: string;
    phone: string;
    mobile: string;
    logoUrl?: string;
};

export function useCompanySettings() {
    const [settings, setSettings] = useState<CompanySettings>({
        companyName: 'Symi Satış ve Üretim Takip',
        contactName: '',
        address: '',
        phone: '',
        mobile: '',
        logoUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/company-settings');
            if (!response.ok) throw new Error('Firma bilgileri yüklenemedi');
            const data = await response.json();
            setSettings(prev => ({ ...prev, ...data }));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = async (newSettings: CompanySettings) => {
        try {
            const response = await fetch('/api/company-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            
            if (!response.ok) throw new Error('Güncelleme başarısız');
            
            setSettings(newSettings);
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, error, updateSettings, refreshSettings: fetchSettings };
}
