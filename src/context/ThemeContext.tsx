import { createContext, useContext, useEffect, useState } from 'react';
import type React from 'react';
import { useAuth } from './AuthContext';

export type ThemeId = 'light' | 'dark' | 'candy' | 'sunset' | 'forest';

type ThemeContextType = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  /** Basitçe temalar arasında geçiş için, şimdilik light/dark odaklı bırakıyoruz */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_PREFIX = 'symi-theme:';

const isValidTheme = (value: string | null): value is ThemeId => {
  return value === 'light' || value === 'dark' || value === 'candy' || value === 'sunset' || value === 'forest';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>('candy');

  // Kullanıcı değiştiğinde o kullanıcıya özel tema tercihini yükle
  useEffect(() => {
    const key = `${THEME_STORAGE_PREFIX}${user?.id ?? 'guest'}`;
    const saved = localStorage.getItem(key);
    if (isValidTheme(saved)) {
      setThemeState(saved);
      return;
    }

    // Eski tekil theme kaydını (light/dark) geriye dönük destekle
    const legacy = localStorage.getItem('theme');
    if (isValidTheme(legacy)) {
      setThemeState(legacy);
    }
  }, [user?.id]);

  // Tema değiştiğinde hem DOM'a hem localStorage'a yaz
  useEffect(() => {
    const root = document.documentElement;

    // data-theme attribute'u ile CSS değişkenlerini kontrol edeceğiz
    root.dataset.theme = theme;

    // Mevcut dark sınıfını da koruyalım (dark mod Tailwind için)
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const key = `${THEME_STORAGE_PREFIX}${user?.id ?? 'guest'}`;
    localStorage.setItem(key, theme);
  }, [theme, user?.id]);

  const setTheme = (t: ThemeId) => setThemeState(t);
  const toggle = () =>
    setThemeState(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      // Diğer temalarda toggle çağrılırsa basitçe dark'a geçsin
      return 'dark';
    });

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
