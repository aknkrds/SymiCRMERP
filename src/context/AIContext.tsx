import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface UserAction {
    type: string;
    payload?: Record<string, unknown>;
    timestamp: Date;
}

interface AIContextType {
    trackAction: (type: string, payload?: Record<string, unknown>) => void;
    userHistory: string[];
    userActions: UserAction[];
    getSuggestions: () => string[];
    isLearning: boolean;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const location = useLocation();
    const { user } = useAuth();
    const [userHistory, setUserHistory] = useState<string[]>([]);
    const [userActions, setUserActions] = useState<UserAction[]>([]);
    const [isLearning] = useState(true);

    const trackAction = useCallback((type: string, payload?: Record<string, unknown>) => {
        const newAction: UserAction = {
            type,
            payload,
            timestamp: new Date()
        };
        
        setUserActions(prev => [newAction, ...prev].slice(0, 100));
        console.log(`[Octavia AI Learning] Action tracked: ${type}`, payload);

        try {
            const body = {
                userId: user?.id,
                username: user?.username,
                fullName: user?.fullName,
                roleId: user?.roleId,
                roleName: user?.roleName,
                path: location.pathname,
                type,
                payload,
                createdAt: new Date().toISOString()
            };

            fetch('/api/logs/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).catch(() => {});
        } catch {
        }
    }, [location.pathname, user?.id, user?.username, user?.fullName, user?.roleId, user?.roleName]);

    useEffect(() => {
        if (location.pathname) {
            setUserHistory(prev => {
                const newHistory = [location.pathname, ...prev].slice(0, 50);
                return newHistory;
            });
            
            console.log(`[Octavia AI Learning] User navigated to: ${location.pathname}`);
            trackAction('navigation', { path: location.pathname });
        }
    }, [location.pathname, trackAction]);

    const getSuggestions = () => {
        const suggestions: string[] = [];

        const pathCounts = userHistory.reduce((acc, path) => {
            acc[path] = (acc[path] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (pathCounts['/orders'] > 5) {
            suggestions.push("Sık sık sipariş oluşturuyorsunuz, hızlı sipariş şablonu oluşturmak ister misiniz?");
        }
        
        if (pathCounts['/customers'] > 5) {
            suggestions.push("Müşteri listenizle ilgili bir rapor hazırlayabilirim.");
        }

        const recentActions = userActions.slice(0, 50);
        const actionCounts = recentActions.reduce((acc, action) => {
            acc[action.type] = (acc[action.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (actionCounts['order_created'] > 3 && !suggestions.some(s => s.includes('sipariş oluşturuyorsunuz'))) {
            suggestions.push("Son dönemde çok sayıda sipariş oluşturuldu, en çok satılan ürünler için hızlı seçim listesi hazırlayabilirim.");
        }

        if (actionCounts['order_status_updated'] > 5) {
            suggestions.push("Sipariş durumlarını sıkça güncelliyorsunuz, sizin için bir iş akışı özeti oluşturabilirim.");
        }

        if (actionCounts['stock_usage_updated'] > 3) {
            suggestions.push("Stok kullanımıyla ilgili çok işlem yaptınız, kritik stok seviyeleri için uyarı kuralı tanımlamak ister misiniz?");
        }

        if (suggestions.length === 0 && recentActions.length > 0) {
            suggestions.push("Yaptığınız işlemlere göre size özel kısa yollar ve raporlar önerebilirim.");
        }

        return suggestions;
    };

    return (
        <AIContext.Provider value={{ 
            trackAction, 
            userHistory, 
            userActions, 
            getSuggestions,
            isLearning 
        }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};
