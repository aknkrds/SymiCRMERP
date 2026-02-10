import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    FileText,
    Settings,
    Menu,
    Palette,
    ShoppingCart,
    Factory,
    Calculator,
    Truck,
    CheckCircle,
    LogOut,
    BarChart2,
    Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useCompanySettings } from '../../hooks/useCompanySettings';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (value: boolean) => void }) {
    const { hasPermission, logout, user } = useAuth();
    const { settings } = useCompanySettings();
    const navigate = useNavigate();

    // Mobil ekranda linke tıklanınca menüyü kapat
    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/', permission: 'dashboard' },
        { icon: Users, label: 'Müşteriler', to: '/customers', permission: 'orders' },
        { icon: Package, label: 'Ürünler & Reçeteler', to: '/products', permission: 'products' },
        { icon: FileText, label: 'Siparişler', to: '/orders', permission: 'orders' },
        { icon: Palette, label: 'Tasarım', to: '/design', permission: 'design' },
        { icon: ShoppingCart, label: 'Tedarik', to: '/procurement', permission: 'procurement' },
        { icon: Calendar, label: 'Planlama', to: '/planning', permission: 'planning' },
        { icon: Factory, label: 'Üretim', to: '/production', permission: 'production' },
        { icon: Calculator, label: 'Muhasebe', to: '/accounting', permission: 'accounting' },
        { icon: Truck, label: 'Sevkiyat', to: '/logistics', permission: 'logistics' },
        { icon: CheckCircle, label: 'Onaylar', to: '/approvals', permission: 'all_except_settings' },
        { icon: Package, label: 'Stok', to: '/stock', permission: 'all_except_settings' },
        { icon: BarChart2, label: 'Raporlar', to: '/reports', permission: 'all_except_settings' },
    ];

    return (
        <>
            {/* Mobil Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'bg-slate-900 text-white transition-all duration-300 h-screen flex flex-col shadow-xl shadow-slate-900/40',
                    'fixed md:sticky top-0 left-0 z-50', // Mobile: fixed, Desktop: sticky
                    isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0 md:w-20'
                )}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/70">
                    {/* Logo her zaman görünsün, kapalıyken sadece icon */}
                    <div className={cn("flex items-center gap-2", !isOpen && "justify-center w-full md:w-auto")}>
                        <img 
                            src="/symi.png" 
                            alt="Symi CRM" 
                            className="w-8 h-8 object-contain rounded-md bg-white/10"
                        />
                        {isOpen && (
                            <div className="leading-tight">
                                <p className="text-sm font-semibold tracking-tight">Symi CRM</p>
                                <p className="text-[10px] text-slate-400">Satış & Üretim Asistanı</p>
                            </div>
                        )}
                    </div>
                    
                    {isOpen && (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 hover:bg-slate-800/80 rounded-lg transition-colors md:flex hidden"
                            title="Menüyü daralt"
                        >
                            <Menu size={20} />
                        </button>
                    )}
                    
                    {/* Mobil için kapatma butonu */}
                     {isOpen && (
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-800/80 rounded-lg transition-colors md:hidden"
                            title="Menüyü kapat"
                        >
                            <Menu size={20} />
                        </button>
                    )}
                </div>

                <div className="p-4 border-b border-slate-800/70">
                    {isOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center font-bold shadow-md">
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                                <p className="text-[11px] text-slate-400 truncate">{user?.roleName}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center font-bold mx-auto shadow-md">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1.5 px-2">
                        {navItems.map(item => {
                            if (!hasPermission(item.permission)) return null;

                            return (
                                <li key={item.to}>
                                    <NavLink
                                        to={item.to}
                                        onClick={handleLinkClick}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-sm',
                                                isActive
                                                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/40'
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
                                                !isOpen && 'justify-center'
                                            )
                                        }
                                    >
                                        <item.icon size={20} className="shrink-0" />
                                        {isOpen && <span className="font-medium truncate">{item.label}</span>}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-slate-800/70 space-y-2">
                    {hasPermission('settings') && (
                        <NavLink
                            to="/settings"
                            onClick={handleLinkClick}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors text-sm',
                                    isActive
                                        ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/40'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
                                    !isOpen && 'justify-center'
                                )
                            }
                        >
                            <Settings size={20} />
                            {isOpen && <span>Ayarlar</span>}
                        </NavLink>
                    )}

                    <button
                        onClick={logout}
                        className={cn(
                            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-300 hover:text-red-200 hover:bg-slate-800/80 transition-colors',
                            !isOpen && 'justify-center'
                        )}
                    >
                        <LogOut size={20} />
                        {isOpen && <span>Çıkış Yap</span>}
                    </button>

                    {isOpen && (
                        <div className="px-3 py-2 mt-4 text-[11px] text-slate-500 text-center border-t border-slate-800/80 pt-3">
                            <p className="font-medium">Symi CRM v.0.9.5.1</p>
                            <p className="text-[10px] mt-0.5 text-slate-500">
                                Tasarım & Geliştirme:{' '}
                                <span className="font-semibold text-slate-200">Akın KARADAŞ - Symi Tekstil Bilişim Hizmetleri Yazılım ve Danışmanlık Ltd Şti</span>
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
