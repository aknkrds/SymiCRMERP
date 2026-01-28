import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800">Symi Satış ve Üretim Takip</h2>
                </header>
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
