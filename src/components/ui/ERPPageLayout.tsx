import React from 'react';
import { ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  active?: boolean;
}

interface ERPPageLayoutProps {
  /** Toolbar left side: action buttons like "+ Yeni" */
  toolbar?: React.ReactNode;
  /** Breadcrumb path items */
  breadcrumbs?: BreadcrumbItem[];
  /** Right side of toolbar */
  toolbarRight?: React.ReactNode;
  children: React.ReactNode;
  /** Optional left mini-sidebar with icon shortcuts */
  sidebarIcons?: React.ReactNode;
}

export function ERPPageLayout({
  toolbar,
  breadcrumbs,
  toolbarRight,
  children,
  sidebarIcons,
}: ERPPageLayoutProps) {
  return (
    <div className="flex h-full min-h-0 bg-[var(--bg-surface)] font-sans">
      {/* Left Mini-Sidebar */}
      {sidebarIcons && (
        <div className="w-11 flex-shrink-0 bg-slate-100 border-r border-[var(--border-subtle)] flex flex-col items-center py-2 gap-1">
          {sidebarIcons}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Breadcrumb + Nav */}
        {(breadcrumbs || toolbar || toolbarRight) && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] select-none">
              {breadcrumbs?.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                  <span className={b.active ? 'text-blue-600 font-medium' : 'hover:text-[var(--text-main)] cursor-default'}>
                    {b.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Geri">
                <ArrowLeft size={14} />
              </button>
              <button className="p-1 hover:bg-slate-100 rounded text-slate-400" title="İleri">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {(toolbar || toolbarRight) && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)] bg-slate-50/50 shrink-0 gap-2">
            <div className="flex items-center gap-1">{toolbar}</div>
            <div className="flex items-center gap-2">{toolbarRight}</div>
          </div>
        )}

        {/* Page Content body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Reusable ERP Table component styled like the reference
interface ERPTableProps {
  columns: { key: string; label: string; width?: string }[];
  rows: React.ReactNode[];
  emptyText?: string;
}

export function ERPTable({ columns, rows, emptyText = 'Kayıt bulunamadı.' }: ERPTableProps) {
  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
          <th className="w-8 px-2 py-2 text-center border-r border-slate-200">
            <span className="inline-block w-4 h-4 border border-slate-300 rounded-sm bg-white" />
          </th>
          {columns.map((col) => (
            <th
              key={col.key}
              className="px-3 py-2 border-r border-slate-200 last:border-r-0 whitespace-nowrap font-semibold tracking-wide text-[11px] uppercase"
              style={col.width ? { width: col.width } : {}}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows
        )}
      </tbody>
    </table>
  );
}

// Reusable Status Badge
interface StatusBadgeProps {
  label: string;
  color?: string; // e.g. 'blue', 'green', 'amber', 'red'
  dot?: boolean;
}

export function StatusBadge({ label, color = 'slate', dot = true }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  const dotColorMap: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
    purple: 'bg-purple-500', slate: 'bg-slate-400', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    orange: 'bg-orange-500', cyan: 'bg-cyan-500',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorMap[color] || colorMap.slate}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[color] || dotColorMap.slate}`} />}
      {label}
    </span>
  );
}

// Reusable Toolbar Button
interface ToolbarBtnProps {
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  variant?: 'primary' | 'default' | 'danger';
  title?: string;
}

export function ToolbarBtn({ icon, label, onClick, variant = 'default', title }: ToolbarBtnProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer select-none';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    default: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} title={title}>
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
