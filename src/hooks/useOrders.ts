import { useState, useEffect } from 'react';
import type { Order, OrderFormData } from '../types';

const API_URL = '/api/orders';

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    console.error('Expected array of orders but got:', data);
                    setOrders([]);
                    return;
                }
                const sorted = data.sort((a: Order, b: Order) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setOrders(sorted);
            })
            .catch(err => console.error('Error fetching orders:', err))
            .finally(() => setLoading(false));
    }, []);

    const calculateTotals = (items: Order['items']) => {
        let subtotal = 0;
        let vatTotal = 0;

        items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            const vat = lineTotal * (item.vatRate / 100);
            subtotal += lineTotal;
            vatTotal += vat;
        });

        return {
            subtotal,
            vatTotal,
            grandTotal: subtotal + vatTotal
        };
    };

    const addOrder = async (data: OrderFormData) => {
        const totals = calculateTotals(data.items);
        const newOrder: Order = {
            ...data,
            ...totals,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder),
            });
            if (res.ok) {
                const saved = await res.json();
                setOrders(prev => [saved, ...prev]);
            }
        } catch (err) {
            console.error('Error adding order:', err);
        }
    };

    const updateOrder = async (id: string, data: Partial<OrderFormData>) => {
        let totals = {};
        if (data.items) {
            totals = calculateTotals(data.items);
        }
        
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, ...totals }),
            });
            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === id ? updated : o));
            }
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    const updateStatus = async (id: string, status: Order['status']) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === id ? updated : o));
            }
        } catch (err) {
            console.error('Error updating order status:', err);
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
            }
        } catch (err) {
            console.error('Error deleting order:', err);
        }
    };

    return { orders, loading, addOrder, updateOrder, updateStatus, deleteOrder };
}
