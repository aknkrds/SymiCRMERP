import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Notifications } from '../ui/Notifications';
import { DepartmentTasks } from '../ui/DepartmentTasks';
import { Messaging } from '../ui/Messaging';

export function Layout() {
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800">Symi Satış ve Üretim Takip</h2>
                    <div className="flex items-center gap-4">
                        <Messaging />
                        <DepartmentTasks />
                        <Notifications />
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
                        <p className="text-sm text-slate-500">
                            bu ürün fikri mülkiyet olarak koruma altındadır. Yapımcı Akın KARADAŞ, 533 732 89 83 numarasından ulaşabilirsiniz.
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
