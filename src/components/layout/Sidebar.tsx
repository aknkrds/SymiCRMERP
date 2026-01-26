import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Settings, Menu, Palette, ShoppingCart, Factory, Calculator, Truck, CheckCircle, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
    const [isOpen, setIsOpen] = React.useState(true);
    const { hasPermission, logout, user } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/', permission: 'dashboard' },
        { icon: Users, label: 'Müşteriler', to: '/customers', permission: 'orders' },
        { icon: Package, label: 'Ürünler & Reçeteler', to: '/products', permission: 'products' },
        { icon: FileText, label: 'Siparişler', to: '/orders', permission: 'orders' },
        { icon: Palette, label: 'Tasarım', to: '/design', permission: 'design' },
        { icon: ShoppingCart, label: 'Tedarik', to: '/procurement', permission: 'procurement' },
        { icon: Factory, label: 'Üretim', to: '/production', permission: 'production' },
        { icon: Calculator, label: 'Muhasebe', to: '/accounting', permission: 'accounting' },
        { icon: Truck, label: 'Sevkiyat', to: '/logistics', permission: 'logistics' },
        { icon: CheckCircle, label: 'Onaylar', to: '/approvals', permission: 'all_except_settings' },
    ];

    return (
        <aside className={cn(
            "bg-slate-900 text-white transition-all duration-300 min-h-screen flex flex-col",
            isOpen ? "w-64" : "w-20"
        )}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
                {isOpen && <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Symi</h1>}
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-slate-800 rounded-lg">
                    <Menu size={20} />
                </button>
            </div>

            <div className="p-4 border-b border-slate-700">
                {isOpen ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.fullName}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.roleName}</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold mx-auto">
                         {user?.fullName?.charAt(0) || 'U'}
                    </div>
                )}
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-2 px-2">
                    {navItems.map((item) => {
                        if (!hasPermission(item.permission)) return null;
                        
                        return (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                                        isActive
                                            ? "bg-indigo-600 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon size={20} />
                                    {isOpen && <span className="font-medium">{item.label}</span>}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-700 space-y-2">
                {hasPermission('settings') && (
                    <NavLink 
                        to="/settings"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors",
                            isActive
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-800",
                            !isOpen && "justify-center"
                        )}
                    >
                        <Settings size={20} />
                        {isOpen && <span>Ayarlar</span>}
                    </NavLink>
                )}
                
                <button 
                    onClick={logout}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors",
                        !isOpen && "justify-center"
                    )}
                >
                    <LogOut size={20} />
                    {isOpen && <span>Çıkış Yap</span>}
                </button>
            </div>
        </aside>
    );
}
