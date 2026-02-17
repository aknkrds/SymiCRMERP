import { useState, useEffect } from 'react';
import type { Order, OrderFormData } from '../types';

const API_URL = '/api/orders';

type OrderTypePrefix = 'IHR' | 'ICP' | 'IKA';

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

    const calculateTotals = (order: Pick<Order, 'items' | 'gofrePrice' | 'gofreVatRate' | 'shippingPrice' | 'shippingVatRate'>) => {
        let subtotal = 0;
        let vatTotal = 0;

        order.items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            const vat = lineTotal * (item.vatRate / 100);
            subtotal += lineTotal;
            vatTotal += vat;
        });

        const gofreBase = order.gofrePrice || 0;
        const gofreVatRate = order.gofreVatRate || 0;
        subtotal += gofreBase;
        vatTotal += gofreBase * (gofreVatRate / 100);

        const shippingBase = order.shippingPrice || 0;
        const shippingVatRate = order.shippingVatRate || 0;
        subtotal += shippingBase;
        vatTotal += shippingBase * (shippingVatRate / 100);

        return {
            subtotal,
            vatTotal,
            grandTotal: subtotal + vatTotal
        };
    };

    const addOrder = async (data: OrderFormData, options?: { typePrefix?: OrderTypePrefix }) => {
        const totals = calculateTotals({
            items: data.items,
            gofrePrice: data.gofrePrice,
            gofreVatRate: data.gofreVatRate,
            shippingPrice: data.shippingPrice,
            shippingVatRate: data.shippingVatRate,
        });

        let generatedId: string;
        if (options?.typePrefix) {
            const existingNumbers = orders
                .filter(o => o.id.startsWith(options.typePrefix))
                .map(o => parseInt(o.id.slice(options.typePrefix.length), 10))
                .filter(n => !Number.isNaN(n));
            const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
            generatedId = `${options.typePrefix}${nextNumber}`;
        } else {
            generatedId = crypto.randomUUID();
        }

        const newOrder: Order = {
            ...data,
            ...totals,
            id: generatedId,
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
        const existing = orders.find(o => o.id === id);
        if (existing) {
            const merged = {
                ...existing,
                ...data,
            };
            totals = calculateTotals({
                items: merged.items,
                gofrePrice: merged.gofrePrice,
                gofreVatRate: merged.gofreVatRate,
                shippingPrice: merged.shippingPrice,
                shippingVatRate: merged.shippingVatRate,
            });
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
