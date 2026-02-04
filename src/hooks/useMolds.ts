import { useState, useEffect } from 'react';

export interface ProductMold {
    id: string;
    productType: string;
    boxShape: string;
    dimensions: string;
    label?: string;
    createdAt: string;
}

const API_URL = '/api/molds';

export function useMolds() {
    const [molds, setMolds] = useState<ProductMold[]>([]);

    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMolds(data);
                } else {
                    console.error('Expected array of molds but got:', data);
                    setMolds([]);
                }
            })
            .catch(err => {
                console.error('Error fetching molds:', err);
                setMolds([]);
            });
    }, []);

    const addMold = async (data: Omit<ProductMold, 'id' | 'createdAt'>) => {
        const newMold = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMold),
            });
            if (res.ok) {
                setMolds(prev => [newMold, ...prev]);
                return true;
            }
        } catch (err) {
            console.error('Error adding mold:', err);
        }
        return false;
    };

    const deleteMold = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setMolds(prev => prev.filter(m => m.id !== id));
                return true;
            }
        } catch (err) {
            console.error('Error deleting mold:', err);
        }
        return false;
    };

    return { molds, addMold, deleteMold };
}
