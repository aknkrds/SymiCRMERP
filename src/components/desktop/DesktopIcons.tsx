import { useState, useEffect } from 'react';
import { useDesktopStore } from '../../store/desktopStore';
import { useWindowStore } from '../../store/windowStore';
import { Folder, Image as ImageIcon, FileText, FileSpreadsheet, File, Trash2, Zap } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { appsConfig } from '../../config/apps';

export function DesktopIcons() {
    const { items, updateItemPosition, deleteItem, renameItem, setActiveFileId } = useDesktopStore();
    const { openWindow } = useWindowStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

    useEffect(() => {
        const hideMenu = () => setContextMenu(null);
        document.addEventListener('click', hideMenu);
        return () => document.removeEventListener('click', hideMenu);
    }, []);

    const handleDoubleClick = (item: any) => {
        if (item.type === 'folder') {
            setActiveFileId(item.id);
            openWindow('preview', item.name);
        } else if (item.mimeType === 'application/x-shortcut') {
            const app = appsConfig.find(a => a.id === item.url);
            if (app) openWindow(app.id, app.title);
        } else {
            setActiveFileId(item.id);
            openWindow('preview', item.name);
        }
    };

    const getIcon = (item: any) => {
        if (item.mimeType === 'application/x-shortcut') {
            const app = appsConfig.find(a => a.id === item.url);
            if (app) {
                const Icon = app.icon;
                return (
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${app.colorClass || 'bg-blue-500'}`}>
                            <Icon size={28} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-200">
                            <Zap size={10} className="text-amber-500 fill-amber-500" />
                        </div>
                    </div>
                );
            }
        }
        if (item.type === 'folder') return <Folder size={48} className="text-blue-400 fill-blue-400/20" />;
        if (item.mimeType?.startsWith('image/')) return <ImageIcon size={48} className="text-emerald-400" />;
        if (item.mimeType === 'application/pdf') return <FileText size={48} className="text-red-500" />;
        if (item.mimeType?.includes('spreadsheet') || item.extension === 'xls' || item.extension === 'xlsx') return <FileSpreadsheet size={48} className="text-green-600" />;
        if (item.mimeType?.includes('wordprocessing') || item.extension === 'doc' || item.extension === 'docx') return <FileText size={48} className="text-blue-600" />;
        return <File size={48} className="text-slate-400" />;
    };

    return (
        <>
            {items.filter(i => !i.parentId).map(item => (
                <Rnd
                    key={item.id}
                    bounds="parent"
                    position={{ x: item.x, y: item.y }}
                    onDragStop={(_e, d) => updateItemPosition(item.id, d.x, d.y)}
                    enableResizing={false}
                    className="absolute z-[5]"
                >
                    <div
                        className={`w-24 h-28 flex flex-col items-center justify-start p-2 rounded-lg cursor-pointer select-none transition-colors ${selectedId === item.id ? 'bg-blue-500/30 ring-1 ring-blue-400/50' : 'hover:bg-white/10'}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(item); }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedId(item.id);
                            setContextMenu({ id: item.id, x: e.clientX, y: e.clientY });
                        }}
                    >
                        <div className="flex-1 flex items-center justify-center drop-shadow-md">
                            {getIcon(item)}
                        </div>
                        <div className="mt-1 h-8 flex items-center justify-center w-full">
                            <span className={`text-xs text-center leading-tight line-clamp-2 px-1 rounded ${selectedId === item.id ? 'bg-blue-500 text-white' : 'text-white drop-shadow-md font-medium'}`}>
                                {item.name}
                            </span>
                        </div>
                    </div>
                </Rnd>
            ))}

            {/* Icon Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-slate-800/95 backdrop-blur-3xl border border-white/20 rounded-lg shadow-2xl py-1 z-[250] min-w-[120px] text-sm text-red-400"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(() => {
                        const item = items.find(i => i.id === contextMenu.id);
                        if (!item || item.type !== 'folder') return null;
                        return (
                            <button
                                onClick={() => {
                                    const next = (window.prompt('Klasör adını değiştir:', item.name) || '').trim();
                                    if (!next) return;
                                    renameItem(item.id, next);
                                    setContextMenu(null);
                                }}
                                className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2 text-slate-200"
                            >
                                Yeniden Adlandır
                            </button>
                        );
                    })()}
                    <button onClick={() => { deleteItem(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2">
                        <Trash2 size={14} /> Sil
                    </button>
                </div>
            )}
        </>
    );
}
