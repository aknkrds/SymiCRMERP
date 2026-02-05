import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Notifications } from '../ui/Notifications';
import { DepartmentTasks } from '../ui/DepartmentTasks';
import { Messaging } from '../ui/Messaging';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { useCompanySettings } from '../../hooks/useCompanySettings';

export function Layout() {
    const { settings } = useCompanySettings();

    return (
        <div className="flex h-screen bg-[var(--bg-main)]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--border-subtle)] h-16 flex items-center justify-between px-6 sm:px-8 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-2">
                        {settings.logoUrl && (
                            <img 
                                src={settings.logoUrl} 
                                alt="Logo" 
                                className="h-8 w-auto object-contain max-w-[100px]"
                            />
                        )}
                        <h2 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight">
                            {settings.companyName}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <ThemeSwitcher />
                        <Messaging />
                        <DepartmentTasks />
                        <Notifications />
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <footer className="mt-10 sm:mt-12 pt-5 sm:pt-6 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-xs sm:text-sm text-slate-500">
                            Bu ürün fikri mülkiyet olarak korunmaktadır. Geliştirici{' '}
                            <span className="font-semibold text-slate-700">Akın KARADAŞ - Symi Tekstil Bilişim Hizmetleri Yazılım ve Danışmanlık Ltd Şti</span> – iletişim:{' '}
                            <span className="font-mono">+90 533 732 89 83</span>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
