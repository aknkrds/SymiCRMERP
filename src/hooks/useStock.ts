import { useState, useEffect } from 'react';
import type { StockItem, StockItemFormData } from '../types';

const API_URL = '/api/stock-items';

export function useStock() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStockItems();
    }, []);

    const fetchStockItems = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch stock items');
            const data = await res.json();
            setStockItems(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addStockItem = async (data: StockItemFormData) => {
        const newItem = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem),
            });
            if (res.ok) {
                const savedItem = await res.json();
                setStockItems(prev => [savedItem, ...prev]);
            }
        } catch (err) {
            console.error('Error adding stock item:', err);
        }
    };

    const deleteStockItem = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setStockItems(prev => prev.filter(item => item.id !== id));
            }
        } catch (err) {
            console.error('Error deleting stock item:', err);
        }
    };

    const updateStockQuantity = async (id: string, updates: { quantity?: number, deduct?: number }) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const updatedItem = await res.json();
                setStockItems(prev => prev.map(item => item.id === id ? updatedItem : item));
                return updatedItem;
            }
        } catch (err) {
            console.error('Error updating stock item:', err);
            throw err;
        }
    };

    return {
        stockItems,
        loading,
        error,
        addStockItem,
        deleteStockItem,
        updateStockQuantity
    };
}
