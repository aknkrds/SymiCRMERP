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
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { LogOut, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

export function Desktop() {
    const { windows, openWindow, closeAllWindows, setWindows, setUsername: setWindowUsername } = useWindowStore();
    const { settings } = useCompanySettings();
    const { logout, user } = useAuth();
    const { addItem, fetchDesktopData, setUsername: setDesktopUsername } = useDesktopStore();
    const appVersion = '0.9.6.0';
    const { orders } = useOrders();

    const defaultBg = "url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=3000&auto=format&fit=crop')";
    const [bgImage, setBgImage] = useState(defaultBg);

    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const fileMenuRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTime, setCurrentTime] = useState<string>(format(new Date(), 'HH:mm'));
    const [isCalOpen, setIsCalOpen] = useState(false);
    const userAreaRef = useRef<HTMLDivElement>(null);
    const [calMonth, setCalMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const calPanelRef = useRef<HTMLDivElement>(null);
    const [hoverTip, setHoverTip] = useState<{ x: number; y: number; items: { id: string; customer: string }[] } | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [showOrders, setShowOrders] = useState(true);
    const [showMeetings, setShowMeetings] = useState(true);
    const [meetings, setMeetings] = useState<{ id?: string; title?: string; date: string }[]>([]);

    // Initial load and store synchronization
    useEffect(() => {
        if (user?.username) {
            setDesktopUsername(user.username);
            setWindowUsername(user.username);
            
            fetch(`/api/users/${user.username}/desktop-data`)
                .then(res => res.json())
                .then(data => {
                    if (data) {
                        if (data.desktopItems) fetchDesktopData(user.username); 
                        if (data.windows) setWindows(data.windows);
                        if (data.preferences?.bgImage) setBgImage(data.preferences.bgImage);
                    }
                })
                .catch(e => console.error('Failed to load initial desktop data', e));
        }
    }, [user, setDesktopUsername, setWindowUsername, fetchDesktopData, setWindows]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setFileMenuOpen(false);
            }
            if (userAreaRef.current && !userAreaRef.current.contains(event.target as Node)) {
                setIsCalOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close all windows on unmount
    useEffect(() => {
        return () => closeAllWindows();
    }, [closeAllWindows]);

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(format(new Date(), 'HH:mm')), 1000);
        return () => clearInterval(t);
    }, []);

    const monthInterval = eachDayOfInterval({
        start: startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 }),
    });

    const weekInterval = eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    });

    const displayDays = viewMode === 'month' ? monthInterval : weekInterval;

    const ordersByDate: Record<string, { id: string; customer: string }[]> = {};
    orders.forEach(o => {
        if (!o.deadline) return;
        try {
            const d = new Date(o.deadline);
            const key = format(d, 'yyyy-MM-dd');
            if (!ordersByDate[key]) ordersByDate[key] = [];
            ordersByDate[key].push({ id: o.id, customer: o.customerName });
        } catch {}
    });

    useEffect(() => {
        if (!isCalOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/meetings');
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                const arr = Array.isArray(data) ? data : [];
                const normalized = arr.map((m: any) => {
                    const dt = m.date || m.startAt || m.startDate || m.when;
                    if (!dt) return null;
                    return { id: m.id, title: m.title || m.subject || m.name, date: dt };
                }).filter(Boolean) as { id?: string; title?: string; date: string }[];
                setMeetings(normalized);
            } catch {
                setMeetings([]);
            }
        })();
        return () => { cancelled = true; };
    }, [isCalOpen]);

    const meetingsByDate: Record<string, { id?: string; title?: string }[]> = {};
    meetings.forEach(m => {
        try {
            const d = new Date(m.date);
            const key = format(d, 'yyyy-MM-dd');
            if (!meetingsByDate[key]) meetingsByDate[key] = [];
            meetingsByDate[key].push({ id: m.id, title: m.title });
        } catch {}
    });

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
        if (!file || !user?.username) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/api/users/${user.username}/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Yükleme başarısız');
            const data = await res.json();

            addItem({
                type: 'file',
                name: file.name,
                x: (contextMenu?.x || 150) + 20,
                y: (contextMenu?.y || 150) + 20,
                url: data.url,
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
            onClick={() => setContextMenu(null)}
        >
            {/* Menubar */}
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

                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/30 relative" ref={userAreaRef}>
                        <span className="text-xs font-mono flex items-center gap-1"><Clock3 size={12} /> {currentTime}</span>
                        <button
                            className="px-2 py-0.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1"
                            onClick={() => setIsCalOpen(v => !v)}
                            title="Takvim ve Hatırlatıcılar"
                        >
                            <CalendarIcon size={14} />
                            <span className="text-xs">{user?.fullName}</span>
                        </button>
                        <button onClick={logout} className="hover:bg-red-500 p-1 rounded transition-colors" title="Çıkış Yap">
                            <LogOut size={14} />
                        </button>

                        {isCalOpen && (
                            <div className="absolute right-0 top-full mt-2 w-96 bg-white text-slate-700 rounded-xl border border-slate-200 shadow-2xl z-[200] overflow-hidden" ref={calPanelRef}>
                                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button className="p-1 rounded hover:bg-white" title="Önceki Ay" onClick={() => setCalMonth(prev => addMonths(prev, -1))}><ChevronLeft size={14} /></button>
                                        <div className="text-[11px] font-bold uppercase tracking-widest">{format(calMonth, 'MMMM yyyy', { locale: tr })}</div>
                                        <button className="p-1 rounded hover:bg-white" title="Sonraki Ay" onClick={() => setCalMonth(prev => addMonths(prev, 1))}><ChevronRight size={14} /></button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="bg-white border border-slate-200 rounded overflow-hidden">
                                            <button className={`px-2 py-1 text-[10px] ${viewMode==='month'?'bg-blue-50 text-blue-700':''}`} onClick={() => setViewMode('month')} title="Ay">Ay</button>
                                            <button className={`px-2 py-1 text-[10px] ${viewMode==='week'?'bg-blue-50 text-blue-700':''}`} onClick={() => setViewMode('week')} title="Hafta">Hafta</button>
                                        </div>
                                        <button className="px-2 py-1 text-[10px] rounded border border-slate-200 hover:bg-white" onClick={() => { const now = new Date(); setCalMonth(now); setSelectedDate(now); }} title="Bugün">Bugün</button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={showOrders} onChange={(e)=>setShowOrders(e.target.checked)} /><span className="px-1 rounded bg-amber-100 text-amber-700">Terminler</span></label>
                                            <label className="flex items-center gap-1"><input type="checkbox" checked={showMeetings} onChange={(e)=>setShowMeetings(e.target.checked)} /><span className="px-1 rounded bg-indigo-100 text-indigo-700">Toplantılar</span></label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 mb-2 text-[10px] font-bold text-slate-500 text-center">
                                        {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => <div key={d}>{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {displayDays.map((day, idx) => {
                                            const key = format(day, 'yyyy-MM-dd');
                                            const inMonth = isSameMonth(day, calMonth);
                                            const isToday = isSameDay(day, new Date());
                                            const orderCount = showOrders ? (ordersByDate[key]?.length || 0) : 0;
                                            const meetingCount = showMeetings ? (meetingsByDate[key]?.length || 0) : 0;
                                            const totalCount = orderCount + meetingCount;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedDate(day)}
                                                    onMouseEnter={(e) => {
                                                        if (totalCount === 0) return;
                                                        const rect = calPanelRef.current?.getBoundingClientRect();
                                                        const x = rect ? e.clientX - rect.left + 8 : 0;
                                                        const y = rect ? e.clientY - rect.top + 8 : 0;
                                                        const items = [
                                                            ...(showOrders ? (ordersByDate[key] || []).map(o => ({ id: o.id, customer: o.customer })) : []),
                                                            ...(showMeetings ? (meetingsByDate[key] || []).map(m => ({ id: m.id || '-', customer: m.title || 'Toplantı' })) : [])
                                                        ];
                                                        setHoverTip({ x, y, items });
                                                    }}
                                                    onMouseMove={(e) => {
                                                        if (totalCount === 0) return;
                                                        const rect = calPanelRef.current?.getBoundingClientRect();
                                                        const x = rect ? e.clientX - rect.left + 8 : 0;
                                                        const y = rect ? e.clientY - rect.top + 8 : 0;
                                                        setHoverTip(prev => prev ? { ...prev, x, y } : prev);
                                                    }}
                                                    onMouseLeave={() => setHoverTip(null)}
                                                    className={`h-9 rounded-lg text-[11px] flex flex-col items-center justify-center border transition-all
                                                        ${inMonth ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-slate-50 border-slate-100 text-slate-400'}
                                                        ${isToday ? 'ring-1 ring-blue-500/50' : ''} ${isSameDay(day, selectedDate) ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                                                >
                                                    <span>{format(day, 'd')}</span>
                                                    {totalCount > 0 && (
                                                        <span className="mt-0.5 inline-flex items-center gap-0.5">
                                                            {orderCount > 0 && <span className="inline-block px-1 rounded bg-amber-100 text-amber-700 text-[9px]">{orderCount}</span>}
                                                            {meetingCount > 0 && <span className="inline-block px-1 rounded bg-indigo-100 text-indigo-700 text-[9px]">{meetingCount}</span>}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {hoverTip && (
                                        <div
                                            className="absolute pointer-events-none z-[201] bg-white border border-slate-200 rounded-lg shadow-xl px-2 py-1.5 text-[10px] animate-in fade-in"
                                            style={{ top: hoverTip.y, left: hoverTip.x, maxWidth: '18rem' }}
                                        >
                                            <div className="font-bold text-slate-700 mb-1">Günün Kayıtları</div>
                                            <div className="space-y-1">
                                                {hoverTip.items.slice(0, 4).map((it, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{it.customer}</span>
                                                        <span className="font-mono text-slate-500">#{it.id.slice(0,8)}</span>
                                                    </div>
                                                ))}
                                                {hoverTip.items.length > 4 && (
                                                    <div className="text-[9px] text-slate-400">+{hoverTip.items.length - 4} daha</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-3 border-t border-slate-100 pt-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">{format(selectedDate, 'dd MMMM yyyy', { locale: tr })} • Hatırlatıcılar</div>
                                        <div className="space-y-1.5">
                                            {showOrders && (ordersByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((e, i) => (
                                                <div key={`o${i}`} className="flex items-center justify-between px-2 py-1.5 rounded border border-slate-200 bg-white hover:bg-blue-50 transition-colors">
                                                    <div className="text-[11px] font-medium">{e.customer}</div>
                                                    <div className="text-[10px] font-mono text-slate-500">#{e.id.slice(0,8)}</div>
                                                </div>
                                            ))}
                                            {showMeetings && (meetingsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((m, i) => (
                                                <div key={`m${i}`} className="flex items-center justify-between px-2 py-1.5 rounded border border-slate-200 bg-white hover:bg-blue-50 transition-colors">
                                                    <div className="text-[11px] font-medium">{m.title || 'Toplantı'}</div>
                                                    <div className="text-[10px] font-mono text-slate-500">TOPLANTI</div>
                                                </div>
                                            ))}
                                            {((showOrders ? (ordersByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length : 0) + (showMeetings ? (meetingsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length : 0) === 0) && (
                                                <div className="text-[10px] text-slate-400 text-center py-2">Kayıt yok</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Windows Layer */}
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

            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={onFileChange} aria-label="Dosya yükle" />

            {/* Desktop Context Menu */}
            {contextMenu && (
                <div
                    className="absolute bg-slate-800/90 backdrop-blur-3xl border border-white/20 rounded-lg shadow-2xl py-1 z-[200] min-w-[160px] text-sm text-slate-200"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button onClick={handleAddFolder} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Yeni Klasör</button>
                    <button onClick={handleAddFile} className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors">Dosya Ekle...</button>
                </div>
            )}

            <div className="absolute left-4 bottom-4 z-[115] pointer-events-auto select-text">
                <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-xl px-3 py-2.5 shadow-lg shadow-black/20 text-white/90">
                    <div className="text-xs font-bold tracking-wide">SYMI</div>
                    <div className="text-[10px] text-white/80 leading-4 mt-1">
                        <div>Symi Software Ltd</div>
                        <div>Akın KARADAŞ</div>
                        <div>v{appVersion}</div>
                        <div className="font-mono">+905337328983</div>
                    </div>
                </div>
            </div>

            <Dock />
            <OctaviaChat />
        </div>
    );
}
