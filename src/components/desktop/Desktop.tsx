import React, { useEffect, useState, useRef } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { appsConfig } from '../../config/apps';
import { WindowFrame } from './WindowFrame';
import { Dock } from './Dock';
import { DesktopIcons } from './DesktopIcons';
import { useDesktopStore } from '../../store/desktopStore';
import { Notifications } from '../ui/Notifications';
import { DepartmentTasks } from '../ui/DepartmentTasks';
import { Messaging } from '../ui/Messaging';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { OctaviaChat } from '../ai/OctaviaChat';
import NotesApp from '../apps/NotesApp';
import ShortcutManager from '../apps/ShortcutManager';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { LogOut, Settings as SettingsIcon, StickyNote, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Desktop() {
    const { windows, openWindow, closeAllWindows } = useWindowStore();
    const { settings } = useCompanySettings();
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const { addItem, fetchDesktopData } = useDesktopStore();

    useEffect(() => {
        if (user?.username) {
            fetchDesktopData(user.username);
        }
    }, [user, fetchDesktopData]);

    // Background image based on user request "arka plan değiştirelim"
    const defaultBg = "url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=3000&auto=format&fit=crop')";
    const [bgImage, setBgImage] = useState(defaultBg);

    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const fileMenuRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setFileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close all windows on unmount
    useEffect(() => {
        return () => closeAllWindows();
    }, [closeAllWindows]);

    const handleContextMenu = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.window-frame') || target.closest('.dock-container') || target.closest('header')) return;

        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleAddFolder = () => {
        setContextMenu(null);
        addItem({
            type: 'folder',
            name: 'Yeni Klasör',
            x: contextMenu?.x || 100,
            y: contextMenu?.y || 100
        });
    };

    const handleAddFile = () => {
        setContextMenu(null);
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            alert('Video ve müzik dosyaları desteklenmemektedir.');
            return;
        }

        if (!user?.username) {
            alert('Dosya yüklemek için giriş yapmalısınız.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/users/${user.username}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Yükleme başarısız');

            const data = await res.json();

            addItem({
                type: 'file',
                name: file.name,
                x: (contextMenu?.x || 150) + 20,
                y: (contextMenu?.y || 150) + 20,
                url: data.url, // store URL instead of base64 content
                mimeType: file.type,
                extension: file.name.split('.').pop()?.toLowerCase()
            });
        } catch (error) {
            console.error('File upload error:', error);
            alert('Dosya yüklenirken bir hata oluştu.');
        }
    };

    return (
        <div
            className="fixed inset-0 w-full h-full overflow-hidden bg-cover bg-center bg-no-repeat bg-slate-900 transition-all duration-1000"
            style={{ backgroundImage: bgImage }}
            onContextMenu={handleContextMenu}
            onClick={() => { setContextMenu(null); }}
        >
            {/* Menubar (Top Bar) */}
            <header className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-md border-b border-white/10 z-[110] flex items-center justify-between px-4 text-sm text-white font-medium select-none shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 font-bold cursor-pointer hover:text-white/80 transition-colors">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="h-4 w-auto drop-shadow-md brightness-0 invert" />
                        ) : (
                            <span className="drop-shadow-md">SymiOS</span>
                        )}
                        <span className="drop-shadow-md">{settings.companyName || 'Symi CRM'}</span>
                    </div>
                    <div className="flex items-center gap-3 relative">
                        <div className="relative" ref={fileMenuRef}>
                            <span
                                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${fileMenuOpen ? 'bg-white/20' : 'hover:bg-white/20'}`}
                                onClick={() => setFileMenuOpen(!fileMenuOpen)}
                            >
                                Dosya
                            </span>

                            {fileMenuOpen && (
                                <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-800/90 backdrop-blur-3xl border border-white/20 rounded-xl shadow-2xl py-1 z-50 overflow-hidden text-slate-200">
                                    <button onClick={() => { setFileMenuOpen(false); openWindow('orders', 'Siparişler'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors">Yeni Sipariş Oluştur</button>
                                    <button onClick={() => { setFileMenuOpen(false); openWindow('customers', 'Müşteriler'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors">Yeni Müşteri Oluştur</button>
                                    <div className="h-px bg-white/10 my-1 mx-2 border-0"></div>
                                    <button onClick={() => { setFileMenuOpen(false); openWindow('shortcuts', 'Kısayol Yöneticisi'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors">Kısayol Ekle...</button>
                                </div>
                            )}
                        </div>
                        <span className="hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors" onClick={() => openWindow('settings', 'Ayarlar')}>Ayarlar</span>
                        <span className="hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors" onClick={() => openWindow('notes', 'Notlar')}>Notlar</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeSwitcher />
                    <Messaging />
                    <DepartmentTasks />
                    <Notifications />

                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/30">
                        <span className="text-xs">{user?.fullName}</span>
                        <button onClick={logout} className="hover:bg-red-500 p-1 rounded transition-colors" title="Çıkış Yap">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Render Windows */}
            {/* Needs full viewport minus menubar, pointer-events none to pass clicks to wallpaper,
          but window items must be pointer-events-auto */}
            <div className="absolute inset-0 pt-8 overflow-hidden pointer-events-none z-[10]">
                {windows.map((windowState) => {
                    const app = appsConfig.find((a) => a.id === windowState.id);
                    if (!app) return null;

                    return (
                        <div key={windowState.id} className="pointer-events-none w-full h-full absolute inset-0">
                            <WindowFrame windowState={windowState}>
                                {app.component}
                            </WindowFrame>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Icons Layer */}
            <div className="absolute inset-0 pt-8 pointer-events-auto z-[5]">
                <DesktopIcons />
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={onFileChange}
            />

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="absolute bg-slate-800/90 backdrop-blur-3xl border border-white/20 rounded-lg shadow-2xl py-1 z-[200] min-w-[160px] text-sm text-slate-200"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button onClick={handleAddFolder} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Yeni Klasör</button>
                    <button onClick={handleAddFile} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Dosya Ekle...</button>
                </div>
            )}

            {/* Dock */}
            <Dock />

            <OctaviaChat />
        </div>
    );
}
