import { useState, useEffect } from 'react';
import type { Product, ProductFormData } from '../types';

const API_URL = 'http://localhost:3000/products';

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a: Product, b: Product) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setProducts(sorted);
            })
            .catch(err => console.error('Error fetching products:', err));
    }, []);

    const addProduct = async (data: ProductFormData) => {
        const newProduct: Product = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct),
            });
            if (res.ok) {
                const saved = await res.json();
                setProducts(prev => [saved, ...prev]);
            }
        } catch (err) {
            console.error('Error adding product:', err);
        }
    };

    const updateProduct = async (id: string, data: ProductFormData) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const updated = await res.json();
                setProducts(prev => prev.map(p => p.id === id ? updated : p));
            }
        } catch (err) {
            console.error('Error updating product:', err);
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Error deleting product:', err);
        }
    };

    return { products, addProduct, updateProduct, deleteProduct };
}
