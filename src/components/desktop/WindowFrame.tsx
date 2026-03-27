import { useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useWindowStore } from '../../store/windowStore';
import type { WindowState } from '../../types';
import { X, Minus, Maximize2 } from 'lucide-react';

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 650;

interface WindowFrameProps {
    windowState: WindowState;
    children: React.ReactNode;
}

export function WindowFrame({ windowState, children }: WindowFrameProps) {
    const { id, title, position, size, zIndex, isMinimized, isMaximized } = windowState;
    const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowBounds, activeWindowId } = useWindowStore();
    const rndRef = useRef<Rnd | null>(null);

    const isActive = activeWindowId === id;

    if (isMinimized) return null;

    const handleDragStop = (_e: any, d: any) => {
        if (!isMaximized) {
            updateWindowBounds(id, { x: d.x, y: d.y }, (size as any) || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
        }
    };

    const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any, pos: any) => {
        if (!isMaximized) {
            updateWindowBounds(id, pos, { width: ref.style.width, height: ref.style.height });
        }
    };

    return (
        <Rnd
            ref={rndRef}
            size={isMaximized ? { width: '100%', height: window.innerHeight - 32 } : ((size as any) || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })}
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
            <div className="flex-1 overflow-auto w-full bg-white relative">
                {children}
            </div>
        </Rnd>
    );
}
