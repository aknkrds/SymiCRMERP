import React, { useEffect, useState, useRef } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { appsConfig } from '../../config/apps';
import { WindowFrame } from './WindowFrame';
import { Dock, DEFAULT_DOCK_SETTINGS } from './Dock';
import type { DockSettings } from './Dock';
import { DesktopIcons } from './DesktopIcons';
import { useDesktopStore } from '../../store/desktopStore';
import { Notifications } from '../ui/Notifications';
import { DepartmentTasks } from '../ui/DepartmentTasks';
import { Messaging } from '../ui/Messaging';
import { BackgroundSwitcher } from '../ui/BackgroundSwitcher';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { Modal } from '../ui/Modal';
import { OctaviaChat } from '../ai/OctaviaChat';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { LogOut, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useUsers } from '../../hooks/useUsers';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

export function Desktop() {
    const { windows, openWindow, closeAllWindows, setWindows, setUsername: setWindowUsername } = useWindowStore();
    const { settings } = useCompanySettings();
    const { logout, user, hasPermission } = useAuth();
    const { addItem, fetchDesktopData, setUsername: setDesktopUsername } = useDesktopStore();
    const appVersion = '0.9.6.5';
    const { orders } = useOrders();

    const defaultBg = "url('/wallpapers/gradient-01.svg')";
    const [bgImage, setBgImage] = useState(defaultBg);
    const [dockSettings, setDockSettings] = useState<DockSettings>(DEFAULT_DOCK_SETTINGS);

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [activeShortcutAppId, setActiveShortcutAppId] = useState<string | null>(null);
    const menubarRef = useRef<HTMLDivElement>(null);
    const menuCloseTimerRef = useRef<number | null>(null);
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
    const [meetings, setMeetings] = useState<{ id: string; title?: string; date: string; organizerId?: string; organizerName?: string; status?: string }[]>([]);
    const { users: activeUsers } = useUsers({ includeAdmins: true });
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDateTimeLocal, setMeetingDateTimeLocal] = useState('');
    const [meetingUserSearch, setMeetingUserSearch] = useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

    useEffect(() => {
        const m = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        const url = m?.[1];
        if (!url) return;
        const img = new Image();
        img.onload = () => {};
        img.onerror = () => {
            if (bgImage !== defaultBg) setBgImage(defaultBg);
        };
        img.src = url;
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [bgImage, defaultBg]);

    // Initial load and store synchronization
    useEffect(() => {
        if (user?.username) {
            setDesktopUsername(user.username);
            setWindowUsername(user.username);

            const dockKey = user?.id ? `symi-dock:${user.id}` : 'symi-dock:guest';
            const savedDock = localStorage.getItem(dockKey);
            if (savedDock) {
                try {
                    const parsed = JSON.parse(savedDock) as Partial<DockSettings>;
                    const next: DockSettings = {
                        ...DEFAULT_DOCK_SETTINGS,
                        ...parsed,
                        scale: typeof parsed.scale === 'number' ? Math.min(1.4, Math.max(0.8, parsed.scale)) : DEFAULT_DOCK_SETTINGS.scale,
                        magnifyScale: typeof parsed.magnifyScale === 'number' ? Math.min(1.6, Math.max(1, parsed.magnifyScale)) : DEFAULT_DOCK_SETTINGS.magnifyScale,
                        autoHide: typeof parsed.autoHide === 'boolean' ? parsed.autoHide : DEFAULT_DOCK_SETTINGS.autoHide,
                        magnifyEnabled: typeof parsed.magnifyEnabled === 'boolean' ? parsed.magnifyEnabled : DEFAULT_DOCK_SETTINGS.magnifyEnabled,
                        position: parsed.position === 'left' || parsed.position === 'right' || parsed.position === 'bottom' ? parsed.position : DEFAULT_DOCK_SETTINGS.position
                    };
                    setDockSettings(next);
                } catch {}
            }
            
            fetch(`/api/users/${user.username}/desktop-data`)
                .then(res => res.json())
                .then(data => {
                    if (data) {
                        if (data.desktopItems) fetchDesktopData(user.username); 
                        if (data.windows) setWindows(data.windows);
                        if (data.preferences?.bgImage) setBgImage(data.preferences.bgImage);
                        const dockKey = user?.id ? `symi-dock:${user.id}` : 'symi-dock:guest';
                        const fromServer = data.preferences?.dock || (typeof data.preferences?.dockScale === 'number' ? { scale: data.preferences.dockScale } : null);
                        if (fromServer) {
                            const parsed = fromServer as Partial<DockSettings>;
                            const next: DockSettings = {
                                ...DEFAULT_DOCK_SETTINGS,
                                ...parsed,
                                scale: typeof parsed.scale === 'number' ? Math.min(1.4, Math.max(0.8, parsed.scale)) : DEFAULT_DOCK_SETTINGS.scale,
                                magnifyScale: typeof parsed.magnifyScale === 'number' ? Math.min(1.6, Math.max(1, parsed.magnifyScale)) : DEFAULT_DOCK_SETTINGS.magnifyScale,
                                autoHide: typeof parsed.autoHide === 'boolean' ? parsed.autoHide : DEFAULT_DOCK_SETTINGS.autoHide,
                                magnifyEnabled: typeof parsed.magnifyEnabled === 'boolean' ? parsed.magnifyEnabled : DEFAULT_DOCK_SETTINGS.magnifyEnabled,
                                position: parsed.position === 'left' || parsed.position === 'right' || parsed.position === 'bottom' ? parsed.position : DEFAULT_DOCK_SETTINGS.position
                            };
                            setDockSettings(next);
                            localStorage.setItem(dockKey, JSON.stringify(next));
                        }
                    }
                })
                .catch(e => console.error('Failed to load initial desktop data', e));
        }
    }, [user, setDesktopUsername, setWindowUsername, fetchDesktopData, setWindows]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menubarRef.current && !menubarRef.current.contains(event.target as Node)) setActiveMenuId(null);
            if (userAreaRef.current && !userAreaRef.current.contains(event.target as Node)) {
                setIsCalOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
        };
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
        const fetchMeetings = async () => {
            try {
                const qs = user?.id ? `?userId=${encodeURIComponent(user.id)}&includePending=0` : '';
                const res = await fetch(`/api/meetings${qs}`);
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                const arr = Array.isArray(data) ? data : [];
                const normalized = arr.map((m: any) => {
                    const dt = m.date || m.startAt || m.startDate || m.when;
                    if (!dt) return null;
                    return {
                        id: String(m.id),
                        title: m.title || m.subject || m.name,
                        date: dt,
                        organizerId: m.organizerId ? String(m.organizerId) : undefined,
                        organizerName: m.organizerName,
                        status: m.status
                    };
                }).filter(Boolean) as { id: string; title?: string; date: string; organizerId?: string; organizerName?: string; status?: string }[];
                setMeetings(normalized);
            } catch {
                setMeetings([]);
            }
        };
        fetchMeetings();
        const onUpdated = () => fetchMeetings();
        window.addEventListener('symi:meetingsUpdated', onUpdated);
        return () => { cancelled = true; window.removeEventListener('symi:meetingsUpdated', onUpdated); };
    }, [isCalOpen, user?.id]);

    const meetingsByDate: Record<string, { id: string; title?: string; date: string; organizerId?: string }[]> = {};
    meetings.forEach(m => {
        try {
            const d = new Date(m.date);
            const key = format(d, 'yyyy-MM-dd');
            if (!meetingsByDate[key]) meetingsByDate[key] = [];
            meetingsByDate[key].push({ id: m.id, title: m.title, date: m.date, organizerId: m.organizerId });
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
        const name = (window.prompt('Klasör adı:', 'Yeni Klasör') || '').trim();
        if (!name) return;
        addItem({
            type: 'folder',
            name,
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

    const handleBackgroundChange = async (nextBgImage: string) => {
        setBgImage(nextBgImage);
        if (!user?.username) return;
        try {
            await fetch(`/api/users/${user.username}/desktop-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: { bgImage: nextBgImage, dock: dockSettings } })
            });
        } catch (e) {
            console.error('Failed to save background preference', e);
        }
    };

    const handleDockSettingsChange = async (next: DockSettings) => {
        setDockSettings(next);
        const dockKey = user?.id ? `symi-dock:${user.id}` : 'symi-dock:guest';
        localStorage.setItem(dockKey, JSON.stringify(next));
        if (!user?.username) return;
        try {
            await fetch(`/api/users/${user.username}/desktop-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: { bgImage, dock: next } })
            });
        } catch (e) {
            console.error('Failed to save dock preference', e);
        }
    };

    const handleDockReset = () => {
        const next = DEFAULT_DOCK_SETTINGS;
        handleDockSettingsChange(next);
    };

    const openMeetingPlanner = () => {
        const base = format(selectedDate || new Date(), 'yyyy-MM-dd');
        setMeetingDateTimeLocal(`${base}T09:00`);
        setMeetingTitle('');
        setMeetingUserSearch('');
        setSelectedParticipantIds([]);
        setEditingMeetingId(null);
        setIsMeetingModalOpen(true);
    };

    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

    const openMeetingEditor = async (meetingId: string) => {
        if (!user?.id) return;
        try {
            const res = await fetch(`/api/meetings/${meetingId}?userId=${encodeURIComponent(user.id)}`);
            if (!res.ok) throw new Error('not ok');
            const m = await res.json();
            setEditingMeetingId(meetingId);
            setMeetingTitle(String(m.title || ''));
            const iso = String(m.scheduledAt || '');
            const d = iso ? new Date(iso) : new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setMeetingDateTimeLocal(local);
            const p = Array.isArray(m.participants) ? m.participants : [];
            setSelectedParticipantIds(
                p
                    .map((x: any) => x && x.userId)
                    .filter(Boolean)
                    .map((x: any) => String(x))
                    .filter((id: string) => id !== String(user.id))
            );
            setMeetingUserSearch('');
            setIsMeetingModalOpen(true);
        } catch {
            alert('Toplantı bilgileri alınamadı.');
        }
    };

    const handleSaveMeeting = async () => {
        if (!user?.id) return;
        const title = meetingTitle.trim();
        const dt = meetingDateTimeLocal.trim();
        if (!title || !dt) return;
        const scheduledAt = new Date(dt).toISOString();
        try {
            const isEdit = !!editingMeetingId;
            const res = await fetch(isEdit ? `/api/meetings/${editingMeetingId}` : '/api/meetings', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizerId: user.id,
                    scheduledAt,
                    title,
                    participantIds: selectedParticipantIds
                })
            });
            if (!res.ok) throw new Error('Toplantı planlanamadı');
            setIsMeetingModalOpen(false);
            setEditingMeetingId(null);
            window.dispatchEvent(new Event('symi:meetingsUpdated'));
        } catch (e) {
            alert('Toplantı kaydedilirken hata oluştu.');
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        if (!user?.id) return;
        const ok = window.confirm('Toplantı silinsin mi?');
        if (!ok) return;
        try {
            const res = await fetch(`/api/meetings/${meetingId}?organizerId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('not ok');
            window.dispatchEvent(new Event('symi:meetingsUpdated'));
        } catch {
            alert('Toplantı silinemedi.');
        }
    };

    type SubmenuItem = { label: string; onClick: () => void };

    const menuItems: string[] = appsConfig
        .filter((a) => a.id !== 'preview')
        .filter((a) => !a.permission || hasPermission(a.permission))
        .map((a) => a.id);

    const openApp = (id: string) => {
        const app = appsConfig.find((a) => a.id === id);
        if (!app) return;
        openWindow(app.id, app.title);
        setActiveMenuId(null);
    };

    const fireShortcut = (eventName: string) => {
        try {
            sessionStorage.setItem(`symi:shortcut:${eventName}`, String(Date.now()));
        } catch {}
        window.setTimeout(() => window.dispatchEvent(new Event(eventName)), 0);
    };

    const triggerAndOpen = (id: string, eventName: string) => {
        fireShortcut(eventName);
        openApp(id);
    };

    const getSubmenu = (id: string): SubmenuItem[] => {
        if (id === 'orders') {
            return [
                { label: 'Mevcut Siparişler', onClick: () => openApp('orders') },
                { label: 'Yeni Sipariş Oluştur', onClick: () => triggerAndOpen('orders', 'symi:orders:create') },
            ];
        }
        if (id === 'customers') {
            return [
                { label: 'Mevcut Müşteriler', onClick: () => openApp('customers') },
                { label: 'Yeni Müşteri Ekle', onClick: () => triggerAndOpen('customers', 'symi:customers:create') },
            ];
        }
        if (id === 'products') {
            return [
                { label: 'Mevcut Ürünler', onClick: () => openApp('products') },
                { label: 'Yeni Ürün Ekle', onClick: () => triggerAndOpen('products', 'symi:products:create') },
            ];
        }
        if (id === 'notes') {
            return [
                { label: 'Notlar', onClick: () => openApp('notes') },
                { label: 'Yeni Not', onClick: () => triggerAndOpen('notes', 'symi:notes:create') },
            ];
        }
        const app = appsConfig.find((a) => a.id === id);
        return [{ label: app?.title || 'Aç', onClick: () => openApp(id) }];
    };

    return (
        <div
            className="fixed inset-0 w-full h-full overflow-hidden bg-cover bg-center bg-no-repeat bg-slate-900 transition-all duration-1000"
            style={{ backgroundImage: bgImage }}
            onContextMenu={handleContextMenu}
            onClick={() => setContextMenu(null)}
        >
            {/* Menubar */}
            <Modal
                isOpen={isMeetingModalOpen}
                onClose={() => setIsMeetingModalOpen(false)}
                title="Toplantı Planla"
                size="lg"
                theme="minimal"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Tarih & Saat</div>
                            <input
                                type="datetime-local"
                                value={meetingDateTimeLocal}
                                onChange={(e) => setMeetingDateTimeLocal(e.target.value)}
                                aria-label="Tarih ve saat"
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                            />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Konu</div>
                            <input
                                value={meetingTitle}
                                onChange={(e) => setMeetingTitle(e.target.value)}
                                placeholder="Toplantı konusu..."
                                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Katılımcılar</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{selectedParticipantIds.length} kişi</div>
                        </div>
                        <input
                            value={meetingUserSearch}
                            onChange={(e) => setMeetingUserSearch(e.target.value)}
                            placeholder="Kişi ara..."
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none mb-2"
                        />
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                            {activeUsers
                                .filter(u => u.id !== user?.id)
                                .filter(u => {
                                    const q = meetingUserSearch.trim().toLowerCase();
                                    if (!q) return true;
                                    return (
                                        (u.fullName || '').toLowerCase().includes(q) ||
                                        (u.username || '').toLowerCase().includes(q) ||
                                        (u.roleName || '').toLowerCase().includes(q)
                                    );
                                })
                                .map(u => {
                                    const checked = selectedParticipantIds.includes(u.id);
                                    return (
                                        <label key={u.id} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    setSelectedParticipantIds(prev => {
                                                        if (e.target.checked) return Array.from(new Set([...prev, u.id]));
                                                        return prev.filter(x => x !== u.id);
                                                    });
                                                }}
                                            />
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-[var(--text-main)] truncate">{u.fullName}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] truncate">{u.roleName} • {u.username}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsMeetingModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-slate-50 text-sm"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveMeeting}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                            {editingMeetingId ? 'Kaydet' : 'Planla'}
                        </button>
                    </div>
                </div>
            </Modal>
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
                    <div
                        className="flex items-center gap-2 relative"
                        ref={menubarRef}
                        onMouseLeave={() => {
                            if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
                            menuCloseTimerRef.current = window.setTimeout(() => setActiveMenuId(null), 240);
                        }}
                    >
                        <button
                            type="button"
                            className={`px-2 py-0.5 rounded cursor-default transition-colors ${activeMenuId === 'shortcuts' ? 'bg-white/20' : 'hover:bg-white/20'}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => {
                                if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
                            }}
                            onClick={() => {
                                setActiveMenuId((prev) => (prev === 'shortcuts' ? null : 'shortcuts'));
                                const first = menuItems[0] || null;
                                setActiveShortcutAppId((p) => p || first);
                            }}
                            title="Kısayollar"
                        >
                            Kısayollar
                        </button>

                        {activeMenuId === 'shortcuts' && (
                            <div
                                className="absolute top-full left-0 mt-1.5 bg-slate-800/90 backdrop-blur-3xl border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200 flex"
                                onMouseEnter={() => {
                                    if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
                                    if (!activeShortcutAppId) setActiveShortcutAppId(menuItems[0] || null);
                                }}
                            >
                                <div className="w-64 py-1">
                                    {menuItems.map((id: string) => {
                                        const app = appsConfig.find((a) => a.id === id);
                                        const active = activeShortcutAppId === id;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${active ? 'bg-white/10 text-white' : 'hover:bg-blue-500 hover:text-white'}`}
                                                onMouseEnter={() => setActiveShortcutAppId(id)}
                                                onClick={() => openApp(id)}
                                                title={app?.title}
                                            >
                                                <span className="truncate pr-3">{app?.title || id}</span>
                                                <ChevronRight size={14} className="opacity-70" />
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="w-px bg-white/10 my-1" />
                                <div className="w-72 py-1">
                                    {getSubmenu(activeShortcutAppId || menuItems[0]).map((it: SubmenuItem) => (
                                        <button
                                            key={it.label}
                                            type="button"
                                            onClick={it.onClick}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors"
                                        >
                                            {it.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <BackgroundSwitcher value={bgImage} onChange={handleBackgroundChange} />
                    <DarkModeToggle />
                    <Messaging variant="desktop" />
                    <DepartmentTasks variant="desktop" />
                    <Notifications variant="desktop" />

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
                                        <button className="px-2 py-1 text-[10px] rounded border border-slate-200 hover:bg-white" onClick={openMeetingPlanner} title="Toplantı Planla">Toplantı Planla</button>
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
                                            {showMeetings && (meetingsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((m, i) => {
                                                const canEdit = user?.id && m.organizerId && String(m.organizerId) === String(user.id);
                                                const time = (() => {
                                                    try {
                                                        const d = new Date(m.date);
                                                        if (isNaN(d.getTime())) return '';
                                                        const hh = String(d.getHours()).padStart(2, '0');
                                                        const mm = String(d.getMinutes()).padStart(2, '0');
                                                        return `${hh}:${mm}`;
                                                    } catch {
                                                        return '';
                                                    }
                                                })();
                                                return (
                                                    <div key={`m${i}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-slate-200 bg-white hover:bg-blue-50 transition-colors">
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-medium truncate">{m.title || 'Toplantı'}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">{time || 'TOPLANTI'}</div>
                                                        </div>
                                                        {canEdit && (
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openMeetingEditor(m.id)}
                                                                    className="px-2 py-1 text-[10px] rounded border border-slate-200 hover:bg-white"
                                                                    title="Düzenle"
                                                                >
                                                                    Düzenle
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteMeeting(m.id)}
                                                                    className="px-2 py-1 text-[10px] rounded border border-red-200 text-red-600 hover:bg-red-50"
                                                                    title="Sil"
                                                                >
                                                                    Sil
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
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

            <Dock settings={dockSettings} onSettingsChange={handleDockSettingsChange} onReset={handleDockReset} />
            <OctaviaChat />
        </div>
    );
}
