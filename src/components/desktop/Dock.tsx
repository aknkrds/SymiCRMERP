import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { appsConfig } from '../../config/apps';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

type DockPosition = 'left' | 'bottom' | 'right';

export type DockSettings = {
    scale: number;
    autoHide: boolean;
    position: DockPosition;
    magnifyEnabled: boolean;
    magnifyScale: number;
};

export const DEFAULT_DOCK_SETTINGS: DockSettings = {
    scale: 0.8,
    autoHide: false,
    position: 'bottom',
    magnifyEnabled: true,
    magnifyScale: 1.25
};

export function Dock({
    settings,
    onSettingsChange,
    onReset
}: {
    settings: DockSettings;
    onSettingsChange: (next: DockSettings) => void;
    onReset: () => void;
}) {
    const { windows, openWindow, activeWindowId, minimizeWindow, closeWindow } = useWindowStore();
    const { hasPermission } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [autoShown, setAutoShown] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);
    const autoHideTimerRef = useRef<number | null>(null);

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
        if (!settings.autoHide) {
            setAutoShown(false);
            return;
        }
        setAutoShown(false);
    }, [settings.autoHide]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node;
            const inDock = !!dockRef.current && dockRef.current.contains(target);
            const inPanel = !!settingsPanelRef.current && settingsPanelRef.current.contains(target);
            if (!inDock && !inPanel) {
                setContextMenu(null);
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => {
        return () => {
            if (autoHideTimerRef.current) window.clearTimeout(autoHideTimerRef.current);
        };
    }, []);

    const visible = settings.autoHide ? autoShown : !isMinimized;

    const containerPositionClass =
        settings.position === 'left'
            ? 'bottom-4 left-4 translate-x-0'
            : settings.position === 'right'
                ? 'bottom-4 right-4 translate-x-0'
                : 'bottom-4 left-1/2 -translate-x-1/2';

    const restorePositionClass =
        settings.position === 'left'
            ? 'bottom-2 left-4 translate-x-0'
            : settings.position === 'right'
                ? 'bottom-2 right-4 translate-x-0'
                : 'bottom-2 left-1/2 -translate-x-1/2';

    const settingsPanelPositionClass =
        settings.position === 'left'
            ? 'bottom-28 left-4'
            : settings.position === 'right'
                ? 'bottom-28 right-4'
                : 'bottom-28 left-1/2 -translate-x-1/2';

    const update = (partial: Partial<DockSettings>) => {
        onSettingsChange({ ...settings, ...partial });
    };

    const onDockMouseEnter = () => {
        if (!settings.autoHide) return;
        if (autoHideTimerRef.current) window.clearTimeout(autoHideTimerRef.current);
        setAutoShown(true);
    };

    const onDockMouseLeave = () => {
        if (!settings.autoHide) return;
        if (autoHideTimerRef.current) window.clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = window.setTimeout(() => setAutoShown(false), 350);
    };

    return (
        <>
            <div
                className={cn(
                    "dock-container absolute z-[100] pointer-events-auto transition-transform duration-500 ease-in-out",
                    containerPositionClass,
                    visible ? "translate-y-0" : "translate-y-[150%]"
                )}
                ref={dockRef}
                onMouseEnter={onDockMouseEnter}
                onMouseLeave={onDockMouseLeave}
            >
                <div
                    className="relative px-4 py-3 rounded-2xl bg-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-end gap-3"
                    style={{ transform: `scale(${settings.scale})`, transformOrigin: 'bottom center' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowSettings(v => !v);
                            setContextMenu(null);
                        }
                    }}
                    onContextMenu={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            setContextMenu(null);
                            setShowSettings(v => !v);
                        }
                    }}
                >
                    {appsConfig.filter(app => !app.permission || hasPermission(app.permission)).map(app => {
                        const isOpen = windows.some(w => w.id === app.id);
                        const Icon = app.icon;
                        const isHovered = hoveredId === app.id;
                        const hoverScale = settings.magnifyEnabled ? settings.magnifyScale : 1;
                        const hoverTranslate = settings.magnifyEnabled ? -8 : 0;

                        return (
                            <div key={app.id} className="relative group flex flex-col items-center">
                                <div className="absolute -top-10 bg-slate-800/90 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg backdrop-blur-md border border-white/10">
                                    {app.title}
                                </div>
                                <button
                                    onClick={() => handleDockClick(app.id, app.title)}
                                    onMouseEnter={() => setHoveredId(app.id)}
                                    onMouseLeave={() => setHoveredId(prev => (prev === app.id ? null : prev))}
                                    onContextMenu={(e) => {
                                        if (!isOpen) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowSettings(false);
                                        setContextMenu({ id: app.id, x: e.clientX, y: e.clientY });
                                    }}
                                    className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center text-white transition-transform duration-200 origin-bottom",
                                        app.colorClass || "bg-blue-500",
                                        isOpen && "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent shadow-lg"
                                    )}
                                    style={{
                                        transform: isHovered ? `translateY(${hoverTranslate}px) scale(${hoverScale})` : 'translateY(0px) scale(1)'
                                    }}
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
                        onClick={() => {
                            if (settings.autoHide) setAutoShown(false);
                            else setIsMinimized(true);
                        }}
                        className="h-12 w-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 mb-1"
                        title="Dock'u Gizle"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {showSettings && (
                <div
                    ref={settingsPanelRef}
                    className={cn(
                        'fixed z-[210] bg-slate-900/85 text-white rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl px-3 py-3 w-[360px]',
                        settingsPanelPositionClass
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Dock Ayarları</span>
                        <button
                            type="button"
                            onClick={() => { onReset(); setShowSettings(false); setContextMenu(null); setIsMinimized(false); setAutoShown(false); }}
                            className="text-[10px] px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            Sıfırla
                        </button>
                    </div>

                    <div className="mt-2 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 w-28">Boyut</span>
                            <input
                                type="range"
                                min={0.8}
                                max={1.4}
                                step={0.05}
                                value={settings.scale}
                                onChange={(e) => update({ scale: Number(e.target.value) })}
                                aria-label="Dock boyutu"
                                className="flex-1"
                            />
                            <span className="text-[10px] font-mono text-white/70 w-12 text-right">{Math.round(settings.scale * 100)}%</span>
                        </div>

                        <label className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Otomatik Gizleme</span>
                            <input
                                type="checkbox"
                                checked={settings.autoHide}
                                onChange={(e) => {
                                    update({ autoHide: e.target.checked });
                                    setIsMinimized(false);
                                    setAutoShown(false);
                                }}
                                aria-label="Otomatik gizleme"
                            />
                        </label>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Konum</span>
                            <div className="bg-white/10 border border-white/10 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => update({ position: 'left' })}
                                    className={cn('px-2 py-1 text-[10px]', settings.position === 'left' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10')}
                                >
                                    Sol
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update({ position: 'bottom' })}
                                    className={cn('px-2 py-1 text-[10px]', settings.position === 'bottom' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10')}
                                >
                                    Alt
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update({ position: 'right' })}
                                    className={cn('px-2 py-1 text-[10px]', settings.position === 'right' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10')}
                                >
                                    Sağ
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Büyütme</span>
                            <input
                                type="checkbox"
                                checked={settings.magnifyEnabled}
                                onChange={(e) => update({ magnifyEnabled: e.target.checked })}
                                aria-label="Büyütme"
                            />
                        </div>

                        <div className={cn('flex items-center gap-3', !settings.magnifyEnabled && 'opacity-50')}>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 w-28">Oran</span>
                            <input
                                type="range"
                                min={1}
                                max={1.6}
                                step={0.05}
                                value={settings.magnifyScale}
                                onChange={(e) => update({ magnifyScale: Number(e.target.value) })}
                                aria-label="Büyütme oranı"
                                className="flex-1"
                                disabled={!settings.magnifyEnabled}
                            />
                            <span className="text-[10px] font-mono text-white/70 w-12 text-right">{Math.round(settings.magnifyScale * 100)}%</span>
                        </div>
                    </div>
                </div>
            )}

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
                onClick={() => { setIsMinimized(false); setAutoShown(true); }}
                onMouseEnter={() => { if (settings.autoHide) setAutoShown(true); }}
                className={cn(
                    "absolute z-[100] p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-white shadow-xl transition-all duration-500 ease-in-out pointer-events-auto",
                    restorePositionClass,
                    settings.autoHide
                        ? (!autoShown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none")
                        : (isMinimized ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none")
                )}
                title="Dock'u Göster"
            >
                <ChevronUp size={20} />
            </button>
        </>
    );
}
