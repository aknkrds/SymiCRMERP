import React, { useState } from 'react';
import { appsConfig } from '../../config/apps';
import { useWindowStore } from '../../store/windowStore';
import { Download } from 'lucide-react';

export default function ShortcutManager() {
    const { openWindow, closeWindow } = useWindowStore();

    const handleCreate = (appId: string, appTitle: string) => {
        // For now we just trigger it or save to a desktop shortcuts store.
        // In Phase 3, this will add to a desktop store. For now, it opens the app.
        openWindow(appId, appTitle);
        closeWindow('shortcuts');
    };

    return (
        <div className="p-6 bg-slate-50 min-h-full">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Kısayol Yöneticisi</h2>
                <p className="text-slate-500 text-sm mb-6">Masaüstüne veya hızlı erişime eklemek istediğiniz uygulamaları / işlemleri seçin.</p>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {appsConfig.filter(app => app.id !== 'shortcuts').map((app) => {
                        const Icon = app.icon;
                        return (
                            <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group hover:border-blue-400 transition-colors">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${app.colorClass || 'bg-blue-500'}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-700 text-sm truncate">{app.title}</h3>
                                </div>
                                <button
                                    onClick={() => handleCreate(app.id, app.title)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Masaüstüne Kısayol Ekle"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
