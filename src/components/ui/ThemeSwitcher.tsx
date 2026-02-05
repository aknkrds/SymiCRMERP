import React, { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { useTheme, ThemeId } from '../../context/ThemeContext';

type ThemeOption = {
  id: ThemeId;
  label: string;
  previewClass: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'candy', label: 'Şeker', previewClass: 'from-pink-400 to-fuchsia-500' },
  { id: 'sunset', label: 'Gün Batımı', previewClass: 'from-orange-400 to-rose-500' },
  { id: 'forest', label: 'Orman', previewClass: 'from-emerald-400 to-teal-500' },
  { id: 'light', label: 'Klasik', previewClass: 'from-sky-400 to-indigo-500' },
  { id: 'dark', label: 'Gece', previewClass: 'from-slate-700 to-slate-900' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full border border-slate-200 bg-[var(--bg-surface)] text-slate-600 shadow-sm hover:shadow-md hover:border-[var(--accent)] hover:text-[var(--accent-strong)] transition-all outline-none"
        title="Renk paleti"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl p-3 z-50">
          <p className="text-xs font-semibold text-slate-500 mb-2 px-1">
            Arayüz rengini seç
          </p>
          <div className="flex flex-col gap-1.5">
            {THEME_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                  theme === option.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${option.previewClass} shadow-sm`}
                  />
                  <span className="font-medium">{option.label}</span>
                </span>
                {theme === option.id && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
                    Aktif
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

