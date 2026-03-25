import { useState } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { appsConfig } from '../../config/apps';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function Dock() {
    const { windows, openWindow, activeWindowId, minimizeWindow } = useWindowStore();
    const { hasPermission } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);

    const handleDockClick = (id: string, title: string) => {
        const existingWindow = windows.find(w => w.id === id);
        if (existingWindow) {
            if (existingWindow.isMinimized || activeWindowId !== id) {
                openWindow(id, title);
            } else {
                minimizeWindow(id);
            }
        } else {
            openWindow(id, title);
        }
    };

    return (
        <>
            <div className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl bg-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-end gap-3 pointer-events-auto transition-transform duration-500 ease-in-out",
                isMinimized ? "translate-y-[150%]" : "translate-y-0"
            )}>
                {appsConfig.filter(app => !app.permission || hasPermission(app.permission)).map(app => {
                    const isOpen = windows.some(w => w.id === app.id);
                    const Icon = app.icon;

                    return (
                        <div key={app.id} className="relative group flex flex-col items-center">
                            <div className="absolute -top-10 bg-slate-800/90 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg backdrop-blur-md border border-white/10">
                                {app.title}
                            </div>
                            <button
                                onClick={() => handleDockClick(app.id, app.title)}
                                className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all duration-300 origin-bottom transform hover:scale-125 hover:-translate-y-2",
                                    app.colorClass || "bg-blue-500",
                                    isOpen && "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent shadow-lg"
                                )}
                            >
                                <Icon size={24} />
                            </button>
                            {/* Indicator dot */}
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full mt-1.5 transition-all duration-300",
                                isOpen ? "bg-white/80" : "opacity-0 scale-0"
                            )} />
                        </div>
                    );
                })}
                
                {/* Divider */}
                <div className="h-10 w-px bg-white/20 mx-1 mb-1 rounded-full" />
                
                {/* Minimize Button */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="h-12 w-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 mb-1"
                    title="Dock'u Gizle"
                >
                    <ChevronDown size={20} />
                </button>
            </div>

            {/* Restore Button */}
            <button
                onClick={() => setIsMinimized(false)}
                className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2 z-[100] p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-white shadow-xl transition-all duration-500 ease-in-out pointer-events-auto",
                    isMinimized ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                )}
                title="Dock'u Göster"
            >
                <ChevronUp size={20} />
            </button>
        </>
    );
}
