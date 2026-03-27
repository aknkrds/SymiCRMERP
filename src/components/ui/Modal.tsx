import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    theme?: 'light' | 'glass' | 'minimal';
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-[95vw] h-[90vh]'
};

export function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    theme = 'minimal'
}: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isFull = size === 'full';
    const isMinimal = theme === 'minimal';

    const modalNode = (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className={cn(
                    "absolute inset-0 transition-opacity animate-in fade-in duration-300",
                    isMinimal ? "bg-slate-900/30" : "bg-slate-900/40 backdrop-blur-sm"
                )}
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div 
                className={cn(
                    "relative w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border max-h-[85vh]",
                    sizeClasses[size],
                    theme === 'glass' 
                        ? "bg-[var(--bg-surface)] backdrop-blur-2xl border-[var(--border-subtle)] shadow-black/20"
                        : isMinimal
                          ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-black/10"
                          : "bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-slate-200/50",
                    isFull && "h-[90vh]"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0",
                    isMinimal ? "px-4 py-2.5 bg-[var(--bg-surface)]" : "px-6 py-4"
                )}>
                    <h3 className={cn(
                        "text-[var(--text-main)] tracking-tight",
                        isMinimal ? "text-sm font-semibold" : "text-lg font-bold"
                    )}>{title}</h3>
                    <button
                        onClick={onClose}
                        className={cn(
                            "rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]",
                            isMinimal ? "p-1 hover:bg-black/5" : "p-1.5 hover:bg-black/5"
                        )}
                        title="Kapat"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className={cn(
                    "flex-1 overflow-y-auto min-w-0 custom-scrollbar overscroll-contain",
                    isMinimal ? "p-4" : "p-6"
                )}>
                    <div className="mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalNode, document.body);
}
