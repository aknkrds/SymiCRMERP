import React, { useMemo, useRef } from 'react';
import { useDesktopStore } from '../../store/desktopStore';
import { useWindowStore } from '../../store/windowStore';
import { FileText, Image as ImageIcon, File, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PreviewWindow() {
    const { items, activeFileId, setActiveFileId, addItem, deleteItem } = useDesktopStore();
    const { openWindow } = useWindowStore();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeItem = items.find(i => i.id === activeFileId) || items.find(i => i.type === 'file');

    const folderChildren = useMemo(() => {
        if (!activeItem || activeItem.type !== 'folder') return [];
        return items.filter(i => i.parentId === activeItem.id);
    }, [activeItem, items]);

    const parentFolder = useMemo(() => {
        if (!activeItem || activeItem.type !== 'file' || !activeItem.parentId) return null;
        return items.find(i => i.id === activeItem.parentId && i.type === 'folder') || null;
    }, [activeItem, items]);

    if (!activeItem) {
        return (
            <div className="flex items-center justify-center h-full bg-[var(--bg-main)] text-[var(--text-muted)]">
                Önizlenecek dosya bulunamadı.
            </div>
        );
    }

    if (activeItem.type === 'folder') {
        const folder = activeItem;
        return (
            <div className="flex flex-col h-full bg-[var(--bg-main)]">
                <div className="shrink-0 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)]">{folder.name}</div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            title="Dosya ekle"
                        >
                            Dosya Ekle
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            aria-label="Klasöre dosya ekle"
                            onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                if (!user?.username) return;
                                for (const f of files) {
                                    const formData = new FormData();
                                    formData.append('file', f);
                                    const res = await fetch(`/api/users/${user.username}/upload`, { method: 'POST', body: formData });
                                    if (!res.ok) continue;
                                    const data = await res.json();
                                    addItem({
                                        type: 'file',
                                        name: f.name,
                                        x: 0,
                                        y: 0,
                                        parentId: folder.id,
                                        url: data.url,
                                        mimeType: f.type,
                                        extension: f.name.split('.').pop()?.toLowerCase()
                                    });
                                }
                                e.target.value = '';
                            }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {folderChildren.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                            Bu klasör boş.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {folderChildren.map((it) => {
                                const isImage = it.mimeType?.startsWith('image/');
                                const isPDF = it.mimeType === 'application/pdf';
                                const icon = isImage ? <ImageIcon size={32} className="text-emerald-500" /> : isPDF ? <FileText size={32} className="text-red-500" /> : (it.mimeType?.includes('spreadsheet') || it.extension === 'xls' || it.extension === 'xlsx') ? <FileSpreadsheet size={32} className="text-emerald-600" /> : <File size={32} className="text-slate-500" />;
                                return (
                                    <div
                                        key={it.id}
                                        className="group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] shadow-sm p-3 hover:shadow-md transition-all cursor-pointer"
                                        onDoubleClick={() => { setActiveFileId(it.id); openWindow('preview', it.name); }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {icon}
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-semibold text-[var(--text-main)] truncate">{it.name}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{it.extension || it.mimeType || ''}</div>
                                                </div>
                                            </div>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-white/10 rounded p-1 transition-all"
                                                onClick={(e) => { e.stopPropagation(); deleteItem(it.id); }}
                                                title="Sil"
                                                aria-label="Sil"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const src = activeItem.url || activeItem.content;
    const isImage = activeItem.mimeType?.startsWith('image/');
    const isPDF = activeItem.mimeType === 'application/pdf';

    return (
        <div className="flex flex-col h-full bg-[var(--bg-main)]">
            {parentFolder && (
                <div className="shrink-0 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
                    <button
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-500"
                        onClick={() => setActiveFileId(parentFolder.id)}
                        title="Klasöre dön"
                    >
                        ← {parentFolder.name}
                    </button>
                    <a
                        href={src}
                        download={activeItem.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        title="İndir"
                    >
                        İndir
                    </a>
                </div>
            )}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                {isImage && src && (
                    <img src={src} alt={activeItem.name} className="max-w-full max-h-full object-contain shadow-lg rounded" />
                )}
                {isPDF && src && (
                    <iframe src={src} className="w-full h-full rounded shadow flex-1 bg-[var(--bg-surface)]" title={activeItem.name} />
                )}
                {!isImage && !isPDF && (
                    <div className="bg-[var(--bg-surface)] p-12 rounded-xl shadow-lg flex flex-col items-center gap-4 border border-[var(--border-subtle)]">
                        {activeItem.mimeType?.includes('spreadsheet') ? <FileSpreadsheet size={64} className="text-emerald-500" /> : <FileText size={64} className="text-blue-500" />}
                        <h3 className="font-semibold text-lg text-[var(--text-main)]">{activeItem.name}</h3>
                        <p className="text-[var(--text-muted)] text-sm">Bu dosya türü için doğrudan önizleme kullanılamıyor.</p>
                        {src && <a href={src} download={activeItem.name} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">İndir</a>}
                    </div>
                )}
            </div>
        </div>
    );
}
