import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, FileText, LayoutDashboard, Menu, Users, Plus, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appsConfig } from '../../config/apps';

type QuickAction = {
  id: string;
  label: string;
  route: string;
  eventName: string;
  permission?: string;
};

const fireShortcut = (eventName: string) => {
  try {
    sessionStorage.setItem(`symi:shortcut:${eventName}`, String(Date.now()));
  } catch {}
  window.setTimeout(() => window.dispatchEvent(new Event(eventName)), 0);
};

export function MobileBottomNav({
  onOpenMenu
}: {
  onOpenMenu: () => void;
}) {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const tabs = useMemo(() => {
    const items: { id: string; label: string; route: string; icon: any; permission?: string }[] = [
      { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
      { id: 'orders', label: 'Siparişler', route: '/orders', icon: FileText, permission: 'orders' },
      { id: 'customers', label: 'Müşteriler', route: '/customers', icon: Users, permission: 'orders' },
      { id: 'planning', label: 'Planlama', route: '/planning', icon: Calendar, permission: 'planning' }
    ];

    return items.filter((t) => !t.permission || hasPermission(t.permission));
  }, [hasPermission]);

  const quickActions: QuickAction[] = useMemo(() => ([
    { id: 'new-order', label: 'Yeni Sipariş', route: '/orders', eventName: 'symi:orders:create', permission: 'orders' },
    { id: 'new-customer', label: 'Yeni Müşteri', route: '/customers', eventName: 'symi:customers:create', permission: 'orders' },
    { id: 'new-product', label: 'Yeni Ürün', route: '/products', eventName: 'symi:products:create', permission: 'products' },
    { id: 'new-note', label: 'Yeni Not', route: '/notes', eventName: 'symi:notes:create', permission: 'all_except_settings' },
    { id: 'new-meeting', label: 'Toplantı Planla', route: '/meetings', eventName: 'symi:meetings:create' }
  ]).filter((a) => !a.permission || hasPermission(a.permission)), [hasPermission]);

  const moreApps = useMemo(() => {
    return appsConfig
      .filter((a) => a.id !== 'preview')
      .filter((a) => !a.permission || hasPermission(a.permission))
      .filter((a) => !['dashboard', 'orders', 'customers', 'planning'].includes(a.id));
  }, [hasPermission]);

  const go = (route: string) => {
    setIsMoreOpen(false);
    setIsActionsOpen(false);
    if (location.pathname !== route) navigate(route);
  };

  return (
    <>
      {isMoreOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40 md:hidden" onMouseDown={() => setIsMoreOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] shadow-2xl max-h-[70vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-main)]">Menü</div>
              <button type="button" className="text-xs text-[var(--text-muted)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]" onClick={() => setIsMoreOpen(false)}>
                Kapat
              </button>
            </div>
            <div className="p-2">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left"
                onClick={() => go('/meetings')}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-indigo-600">
                  <Video size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-main)] truncate">Toplantılar</div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">Davetler ve planlama</div>
                </div>
              </button>
              {moreApps.map((a) => {
                const Icon = a.icon as any;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left"
                    onClick={() => go(`/${a.id}`)}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${a.colorClass || 'bg-slate-600'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-main)] truncate">{a.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">Aç</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isActionsOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 md:hidden" onMouseDown={() => setIsActionsOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-main)]">Hızlı İşlemler</div>
              <button type="button" className="text-xs text-[var(--text-muted)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]" onClick={() => setIsActionsOpen(false)}>
                Kapat
              </button>
            </div>
            <div className="p-2 grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="px-3 py-3 rounded-xl border border-[var(--border-subtle)] bg-white/5 hover:bg-white/10 text-left"
                  onClick={() => {
                    fireShortcut(a.eventName);
                    go(a.route);
                  }}
                >
                  <div className="text-sm font-semibold text-[var(--text-main)]">{a.label}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Oluştur</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-[70] md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="h-16 px-2 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-14 h-12 rounded-xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-white/5"
            aria-label="Menü"
            title="Menü"
          >
            <Menu size={20} />
            <span className="text-[10px] mt-1">Menü</span>
          </button>

          <div className="flex-1 flex items-center justify-center gap-1">
            {tabs.slice(0, 4).map((t) => {
              const active = location.pathname === t.route;
              const Icon = t.icon as any;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.route)}
                  className={`flex-1 max-w-[92px] h-12 rounded-xl flex flex-col items-center justify-center ${active ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                  title={t.label}
                >
                  <Icon size={18} />
                  <span className="text-[10px] mt-1 truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsActionsOpen(true)}
            className="w-14 h-12 rounded-xl flex flex-col items-center justify-center text-white bg-blue-600 hover:bg-blue-700"
            aria-label="Yeni"
            title="Yeni"
          >
            <Plus size={20} />
            <span className="text-[10px] mt-1">Yeni</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="w-14 h-12 rounded-xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-white/5"
            aria-label="Daha fazla"
            title="Daha fazla"
          >
            <span className="text-[12px] font-bold">⋯</span>
            <span className="text-[10px] mt-1">Daha</span>
          </button>
        </div>
      </nav>
    </>
  );
}
