import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Settings, Menu, Palette, ShoppingCart, Factory, Calculator, Truck, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
    const [isOpen, setIsOpen] = React.useState(true);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
        { icon: Users, label: 'Müşteriler', to: '/customers' },
        { icon: Package, label: 'Ürünler & Reçeteler', to: '/products' },
        { icon: FileText, label: 'Siparişler', to: '/orders' },
        { icon: Palette, label: 'Tasarım', to: '/design' },
        { icon: ShoppingCart, label: 'Tedarik', to: '/procurement' },
        { icon: Factory, label: 'Üretim', to: '/production' },
        { icon: Calculator, label: 'Muhasebe', to: '/accounting' },
        { icon: Truck, label: 'Sevkiyat', to: '/logistics' },
        { icon: CheckCircle, label: 'Onaylar', to: '/approvals' },
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

            <nav className="flex-1 py-4">
                <ul className="space-y-2 px-2">
                    {navItems.map((item) => (
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
                                {/* Tooltip for collapsed state could go here */}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-700">
                <button className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors",
                    !isOpen && "justify-center"
                )}>
                    <Settings size={20} />
                    {isOpen && <span>Ayarlar</span>}
                </button>
            </div>
        </aside>
    );
}
