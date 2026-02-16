import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

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
    const [userHistory, setUserHistory] = useState<string[]>([]);
    const [userActions, setUserActions] = useState<UserAction[]>([]);
    const [isLearning] = useState(true);

    // Track navigation history
    useEffect(() => {
        if (location.pathname) {
            setUserHistory(prev => {
                const newHistory = [location.pathname, ...prev].slice(0, 50); // Keep last 50 paths
                return newHistory;
            });
            
            // Log for "learning" simulation
            console.log(`[Octavia AI Learning] User navigated to: ${location.pathname}`);
        }
    }, [location]);

    const trackAction = (type: string, payload?: Record<string, unknown>) => {
        const newAction: UserAction = {
            type,
            payload,
            timestamp: new Date()
        };
        
        setUserActions(prev => [newAction, ...prev].slice(0, 100)); // Keep last 100 actions
        console.log(`[Octavia AI Learning] Action tracked: ${type}`, payload);
    };

    const getSuggestions = () => {
        // Simple heuristic-based suggestions
        const suggestions: string[] = [];
        
        // Analyze history frequency
        const pathCounts = userHistory.reduce((acc, path) => {
            acc[path] = (acc[path] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Suggest based on frequent usage
        if (pathCounts['/orders'] > 5) {
            suggestions.push("Sık sık sipariş oluşturuyorsunuz, hızlı sipariş şablonu oluşturmak ister misiniz?");
        }
        
        if (pathCounts['/customers'] > 5) {
            suggestions.push("Müşteri listenizle ilgili bir rapor hazırlayabilirim.");
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
