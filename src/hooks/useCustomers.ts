import { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerFormData } from '../types';
import { useAutoRefreshOnServerMutation } from './useAutoRefreshOnServerMutation';

const API_URL = '/api/customers';

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);

    const fetchCustomers = useCallback(async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if (!Array.isArray(data)) {
                setCustomers([]);
                return;
            }
            const sorted = data.sort((a: Customer, b: Customer) =>
                a.companyName.localeCompare(b.companyName, 'tr')
            );
            setCustomers(sorted);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    useAutoRefreshOnServerMutation(fetchCustomers, { debounceMs: 500 });

    const addCustomer = async (data: CustomerFormData) => {
        const newCustomer: Customer = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer),
            });
            
            if (res.ok) {
                const saved = await res.json();
                setCustomers(prev => [saved, ...prev]);
            }
        } catch (error) {
            console.error('Error adding customer:', error);
        }
    };

    const updateCustomer = async (id: string, data: CustomerFormData) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                const updated = await res.json();
                setCustomers(prev => prev.map(c => c.id === id ? updated : c));
            }
        } catch (error) {
            console.error('Error updating customer:', error);
        }
    };

    const deleteCustomer = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    };

    return { customers, addCustomer, updateCustomer, deleteCustomer };
}
