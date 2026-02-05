import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Notifications } from '../ui/Notifications';
import { DepartmentTasks } from '../ui/DepartmentTasks';
import { Messaging } from '../ui/Messaging';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

export function Layout() {
    return (
        <div className="flex h-screen bg-[var(--bg-main)]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] h-16 flex items-center justify-between px-6 sm:px-8 shadow-sm/40">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight">
                            Symi Satış ve Üretim Takip
                        </h2>
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent-strong)] border border-[var(--border-subtle)]">
                            v9.0.1
                        </span>
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
                            <span className="font-semibold text-slate-700">Akın KARADAŞ</span> – iletişim:{' '}
                            <span className="font-mono">+90 533 732 89 83</span>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
