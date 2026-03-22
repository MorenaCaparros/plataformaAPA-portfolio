'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;           // preferencia guardada ('light' | 'dark' | 'system')
  resolvedTheme: 'light' | 'dark'; // el que realmente se aplica
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Al montar: leer preferencia guardada (default: 'light' si no hay preferencia)
  useEffect(() => {
    const saved = localStorage.getItem('apa-theme') as Theme | null;
    if (saved && (saved === 'light' || saved === 'dark')) {
      setThemeState(saved);
    }
    // Si saved === 'system' o es null, queda 'light' por defecto
  }, []);

  // Aplicar el tema al <html> y calcular resolvedTheme
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      let isDark: boolean;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        // 'system'
        isDark = mediaQuery.matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setResolvedTheme(isDark ? 'dark' : 'light');
    };

    apply();

    // Si está en 'system', escuchar cambios del OS
    if (theme === 'system') {
      mediaQuery.addEventListener('change', apply);
      return () => mediaQuery.removeEventListener('change', apply);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('apa-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
