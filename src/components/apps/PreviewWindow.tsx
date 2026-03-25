import React, { useState } from 'react';
import { useDesktopStore } from '../../store/desktopStore';
import { FileText, Image as ImageIcon, File, FileSpreadsheet } from 'lucide-react';

export default function PreviewWindow() {
    const { items, activeFileId } = useDesktopStore();
    // We need to know WHICH file is open. For now, since PreviewWindow is just one app instance,
    // we could pass an ID through the store or just show a fallback if none selected.
    // A robust macOS system opens a NEW window per file. 
    // Let's grab the most recently added file for demo purposes if none is currently "active" in state.
    // Ideally, windowStore should accept "props" or we use a separate "activePreviewId" in desktopStore.

    // Fake state for preview:
    const activeFile = items.find(i => i.id === activeFileId) || items.find(i => i.type === 'file');

    if (!activeFile) {
        return (
            <div className="flex items-center justify-center h-full bg-[#ECECEC] text-slate-500">
                Önizlenecek dosya bulunamadı.
            </div>
        );
    }

    const isImage = activeFile.mimeType?.startsWith('image/');
    const isPDF = activeFile.mimeType === 'application/pdf';

    return (
        <div className="flex flex-col h-full bg-[#ECECEC]">
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                {isImage && activeFile.content && (
                    <img src={activeFile.content} alt={activeFile.name} className="max-w-full max-h-full object-contain shadow-lg rounded" />
                )}
                {isPDF && activeFile.content && (
                    <iframe src={activeFile.content} className="w-full h-full rounded shadow flex-1 bg-white" title={activeFile.name} />
                )}
                {!isImage && !isPDF && (
                    <div className="bg-white p-12 rounded-xl shadow-lg flex flex-col items-center gap-4">
                        {activeFile.mimeType?.includes('spreadsheet') ? <FileSpreadsheet size={64} className="text-emerald-500" /> : <FileText size={64} className="text-blue-500" />}
                        <h3 className="font-semibold text-lg text-slate-700">{activeFile.name}</h3>
                        <p className="text-slate-500 text-sm">Bu dosya türü için doğrudan önizleme kullanılamıyor.</p>
                        <a href={activeFile.content} download={activeFile.name} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">İndir</a>
                    </div>
                )}
            </div>
        </div>
    );
}
