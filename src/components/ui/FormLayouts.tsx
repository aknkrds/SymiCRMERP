import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface FormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    compact?: boolean;
}

export function FormSection({ title, description, children, className, compact }: FormSectionProps) {
    return (
        <div className={cn(
            "border-b border-slate-100 last:border-0 last:pb-0",
            compact ? "space-y-3 pb-3" : "space-y-4 pb-6",
            className
        )}>
            <div>
                <h4 className={cn(
                    "text-slate-800 tracking-tight",
                    compact ? "text-xs font-semibold" : "text-sm font-bold"
                )}>{title}</h4>
                {description && <p className={cn(
                    "text-slate-500 mt-0.5",
                    compact ? "text-[10px]" : "text-[11px]"
                )}>{description}</p>}
            </div>
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2",
                compact ? "gap-x-4 gap-y-3" : "gap-x-6 gap-y-4"
            )}>
                {children}
            </div>
        </div>
    );
}

interface FormCardProps {
    children: React.ReactNode;
    className?: string;
    compact?: boolean;
}

export function FormCard({ children, className, compact }: FormCardProps) {
    return (
        <div className={cn(
            "bg-white/50 border border-slate-200 shadow-sm rounded-xl transition-all hover:shadow-md hover:border-blue-200/50",
            compact ? "p-3" : "p-4",
            className
        )}>
            {children}
        </div>
    );
}

interface InputGroupProps {
    label: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
    required?: boolean;
    compact?: boolean;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
    ({ label, error, children, className, required, compact }, ref) => {
        return (
            <div ref={ref} className={cn(compact ? "space-y-1" : "space-y-1.5", className)}>
                <label className={cn(
                    "text-slate-500 uppercase tracking-wider ml-1",
                    compact ? "text-[10px] font-semibold" : "text-[11px] font-bold"
                )}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative group">
                    {children}
                </div>
                {error && <p className={cn(
                    "text-red-500 font-medium ml-1 animate-in slide-in-from-top-1",
                    compact ? "text-[9px]" : "text-[10px]"
                )}>{error}</p>}
            </div>
        );
    }
);

InputGroup.displayName = 'InputGroup';

export const premiumInputClass = cn(
    "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none transition-all duration-200",
    "focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white",
    "placeholder:text-slate-400 text-sm font-medium text-slate-700 shadow-sm shadow-black/[0.02]",
    "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-default"
);
