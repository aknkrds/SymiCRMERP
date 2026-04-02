import React from 'react';
import { LayoutDashboard, Users, Package, FileText, Palette, ShoppingCart, Calendar, Factory, Calculator, Truck, CheckCircle, BarChart2 } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import Customers from '../pages/Customers';
import Products from '../pages/Products';
import Orders from '../pages/Orders';
import Design from '../pages/Design';
import Procurement from '../pages/Procurement';
import Planning from '../pages/Planning';
import Production from '../pages/Production';
import Accounting from '../pages/Accounting';
import Logistics from '../pages/Logistics';
import Approvals from '../pages/Approvals';
import Stock from '../pages/Stock';
import HumanResources from '../pages/HumanResources';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import NotesApp from '../components/apps/NotesApp';
import ShortcutManager from '../components/apps/ShortcutManager';
import PreviewWindow from '../components/apps/PreviewWindow';
import { Settings as SettingsIcon, StickyNote, Link as LinkIcon, FileSearch } from 'lucide-react';

export const appsConfig = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, component: <Dashboard />, permission: 'dashboard', colorClass: 'bg-indigo-500' },
    { id: 'customers', title: 'Müşteriler', icon: Users, component: <Customers />, permission: 'orders', colorClass: 'bg-blue-500' },
    { id: 'products', title: 'Ürünler', icon: Package, component: <Products />, permission: 'products', colorClass: 'bg-emerald-500' },
    { id: 'orders', title: 'Siparişler', icon: FileText, component: <Orders />, permission: 'orders', colorClass: 'bg-amber-500' },
    { id: 'design', title: 'Tasarım', icon: Palette, component: <Design />, permission: 'design', colorClass: 'bg-pink-500' },
    { id: 'procurement', title: 'Satın Alma', icon: ShoppingCart, component: <Procurement />, permission: 'procurement', colorClass: 'bg-cyan-500' },
    { id: 'planning', title: 'Planlama', icon: Calendar, component: <Planning />, permission: 'planning', colorClass: 'bg-violet-500' },
    { id: 'production', title: 'Üretim', icon: Factory, component: <Production />, permission: 'production', colorClass: 'bg-orange-500' },
    { id: 'accounting', title: 'Muhasebe', icon: Calculator, component: <Accounting />, permission: 'accounting', colorClass: 'bg-teal-500' },
    { id: 'logistics', title: 'Sevkiyat', icon: Truck, component: <Logistics />, permission: 'logistics', colorClass: 'bg-sky-500' },
    { id: 'approvals', title: 'Onaylar', icon: CheckCircle, component: <Approvals />, permission: 'all_except_settings', colorClass: 'bg-green-600' },
    { id: 'stock', title: 'Stok', icon: Package, component: <Stock />, permission: 'all_except_settings', colorClass: 'bg-slate-600' },
    { id: 'hr', title: 'İnsan Kaynakları', icon: Users, component: <HumanResources />, permission: 'all_except_settings', colorClass: 'bg-rose-500' },
    { id: 'reports', title: 'Raporlar', icon: BarChart2, component: <Reports />, permission: 'all_except_settings', colorClass: 'bg-fuchsia-500' },
    { id: 'settings', title: 'Ayarlar', icon: SettingsIcon, component: <Settings />, permission: 'settings', colorClass: 'bg-slate-800' },
    { id: 'notes', title: 'Notlar', icon: StickyNote, component: <NotesApp />, permission: 'all_except_settings', colorClass: 'bg-amber-400' },
    { id: 'shortcuts', title: 'Kısayol Yöneticisi', icon: LinkIcon, component: <ShortcutManager />, permission: 'all_except_settings', colorClass: 'bg-indigo-600' },
    { id: 'preview', title: 'Önizleme', icon: FileSearch, component: <PreviewWindow />, permission: 'all_except_settings', colorClass: 'bg-sky-500' },
];
