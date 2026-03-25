import React, { useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useWindowStore } from '../../store/windowStore';
import type { WindowState } from '../../store/windowStore';
import { X, Minus, Maximize2 } from 'lucide-react';

interface WindowFrameProps {
    windowState: WindowState;
    children: React.ReactNode;
}

export function WindowFrame({ windowState, children }: WindowFrameProps) {
    const { id, title, position, size, zIndex, isMinimized, isMaximized } = windowState;
    const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowBounds, activeWindowId } = useWindowStore();
    const rndRef = useRef<Rnd | null>(null);

    const isActive = activeWindowId === id;

    // Legacy ERP pages need padding since they used to be inside a layout container
    const noPaddingApps = ['notes', 'preview', 'shortcuts'];
    const contentPadding = noPaddingApps.includes(id) ? 'p-0' : 'p-6 md:p-8';

    if (isMinimized) return null;

    const handleDragStop = (e: any, d: any) => {
        if (!isMaximized) {
            updateWindowBounds(id, { x: d.x, y: d.y }, size || { width: 1000, height: 650 });
        }
    };

    const handleResizeStop = (e: any, direction: any, ref: any, delta: any, pos: any) => {
        if (!isMaximized) {
            updateWindowBounds(id, pos, { width: ref.style.width, height: ref.style.height });
        }
    };

    return (
        <Rnd
            ref={rndRef}
            size={isMaximized ? { width: '100%', height: '100%' } : (size || { width: 1000, height: 650 })}
            position={isMaximized ? { x: 0, y: 32 } : (position || { x: 50, y: 50 })}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
            disableDragging={isMaximized}
            enableResizing={!isMaximized}
            minWidth={400}
            minHeight={300}
            bounds="window"
            dragHandleClassName="window-titlebar"
            onMouseDown={() => focusWindow(id)}
            style={{ zIndex }}
            className={`pointer-events-auto absolute !flex flex-col rounded-xl overflow-hidden shadow-2xl transition-shadow ${isActive ? 'shadow-black/30 ring-1 ring-black/5' : 'shadow-black/10 ring-1 ring-black/5 opacity-95'
                } bg-white`}
        >
            {/* Titlebar (macOS style) */}
            <div
                className="window-titlebar h-12 flex items-center px-4 shrink-0 bg-white/40 border-b border-slate-200/50 backdrop-blur-xl group select-none cursor-default"
                onDoubleClick={() => maximizeWindow(id)}
            >
                <div className="flex items-center gap-2 w-20 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
                        className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center text-transparent hover:text-black/50 transition-colors"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
                        className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center text-transparent hover:text-black/50 transition-colors"
                    >
                        <Minus size={10} strokeWidth={3} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); maximizeWindow(id); }}
                        className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center text-transparent hover:text-black/50 transition-colors"
                    >
                        <Maximize2 size={8} strokeWidth={4} />
                    </button>
                </div>

                <div className="flex-1 text-center font-medium text-sm text-slate-700 truncate pr-20">
                    {title}
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 min-h-0 overflow-y-auto w-full bg-slate-50 relative ${contentPadding}`}>
                {children}
            </div>
        </Rnd>
    );
}
