import { createContext, useContext, useEffect, useState } from 'react';
import type React from 'react';
import { useAuth } from './AuthContext';

export type ThemeId = 'light' | 'candy' | 'sunset' | 'forest';

type ThemeContextType = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_PREFIX = 'symi-theme:';

const isValidTheme = (value: string | null): value is ThemeId => {
  return value === 'light' || value === 'candy' || value === 'sunset' || value === 'forest';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>('candy');
  const [isLoaded, setIsLoaded] = useState(false);

  // Kullanıcı değiştiğinde o kullanıcıya özel tema tercihini yükle
  useEffect(() => {
    setIsLoaded(false);
    const key = `${THEME_STORAGE_PREFIX}${user?.id ?? 'guest'}`;
    const saved = localStorage.getItem(key);
    if (isValidTheme(saved)) {
      setThemeState(saved);
    }
    setIsLoaded(true);
  }, [user?.id]);

  // Tema değiştiğinde hem DOM'a hem localStorage'a yaz
  useEffect(() => {
    // Yükleme tamamlanmadan kaydetme işlemi yapma (Initial overwrite koruması)
    if (!isLoaded) return;

    const root = document.documentElement;

    // Sadece data-theme ile çalışıyoruz, Tailwind'in .dark sınıfını kullanmıyoruz
    root.dataset.theme = theme;
    root.classList.remove('dark');

    const key = `${THEME_STORAGE_PREFIX}${user?.id ?? 'guest'}`;
    localStorage.setItem(key, theme);
  }, [theme, user?.id, isLoaded]);

  const setTheme = (t: ThemeId) => setThemeState(t);

  // Basit bir toggle: candy <-> light arasında geçiş
  const toggle = () =>
    setThemeState(prev => {
      if (prev === 'candy') return 'light';
      if (prev === 'light') return 'candy';
      return 'candy';
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
