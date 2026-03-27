import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function DarkModeToggle() {
  const { theme, setTheme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => (isDark ? toggle() : setTheme('dark'))}
      className="relative p-2 rounded-full border border-white/20 bg-black/20 text-white shadow-sm hover:bg-white/10 transition-all outline-none"
      title={isDark ? 'Aydınlık moda geç' : 'Koyu moda geç'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
