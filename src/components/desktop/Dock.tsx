import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { appsConfig } from '../../config/apps';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function Dock() {
    const { windows, openWindow, activeWindowId, minimizeWindow, closeWindow } = useWindowStore();
    const { hasPermission } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [dockScale, setDockScale] = useState(1);
    const [showSizer, setShowSizer] = useState(false);
    const dockRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const stored = localStorage.getItem('dockScale');
        if (stored) {
            const n = Number(stored);
            if (!Number.isNaN(n)) setDockScale(Math.min(1.4, Math.max(0.8, n)));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('dockScale', String(dockScale));
    }, [dockScale]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!dockRef.current) return;
            if (!dockRef.current.contains(e.target as Node)) {
                setContextMenu(null);
                setShowSizer(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    return (
        <>
            <div
                className={cn(
                    "dock-container absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto transition-transform duration-500 ease-in-out",
                    isMinimized ? "translate-y-[150%]" : "translate-y-0"
                )}
                ref={dockRef}
            >
                <div
                    className="relative px-4 py-3 rounded-2xl bg-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-end gap-3"
                    style={{ transform: `scale(${dockScale})`, transformOrigin: 'bottom center' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowSizer(v => !v);
                            setContextMenu(null);
                        }
                    }}
                    onContextMenu={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            setContextMenu(null);
                            setShowSizer(v => !v);
                        }
                    }}
                >
                    {showSizer && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white rounded-xl border border-white/10 shadow-xl backdrop-blur-xl px-3 py-2 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Boyut</span>
                            <input
                                type="range"
                                min={0.8}
                                max={1.4}
                                step={0.05}
                                value={dockScale}
                                onChange={(e) => setDockScale(Number(e.target.value))}
                                aria-label="Dock boyutu"
                                className="w-36"
                            />
                            <span className="text-[10px] font-mono text-white/70 w-10 text-right">{Math.round(dockScale * 100)}%</span>
                        </div>
                    )}
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
                                    onContextMenu={(e) => {
                                        if (!isOpen) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowSizer(false);
                                        setContextMenu({ id: app.id, x: e.clientX, y: e.clientY });
                                    }}
                                    className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all duration-300 origin-bottom transform hover:scale-125 hover:-translate-y-2",
                                        app.colorClass || "bg-blue-500",
                                        isOpen && "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent shadow-lg"
                                    )}
                                    title={app.title}
                                >
                                    <Icon size={24} />
                                </button>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1.5 transition-all duration-300",
                                    isOpen ? "bg-white/80" : "opacity-0 scale-0"
                                )} />
                            </div>
                        );
                    })}
                    
                    <div className="h-10 w-px bg-white/20 mx-1 mb-1 rounded-full" />
                    
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="h-12 w-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 mb-1"
                        title="Dock'u Gizle"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {contextMenu && (
                <div
                    className="fixed bg-slate-800/95 backdrop-blur-3xl border border-white/20 rounded-lg shadow-2xl py-1 z-[250] min-w-[170px] text-sm text-slate-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => { closeWindow(contextMenu.id); setContextMenu(null); }}
                        className="w-full text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition-colors"
                        title="Pencereyi kapat"
                    >
                        Pencereyi Kapat
                    </button>
                </div>
            )}

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
