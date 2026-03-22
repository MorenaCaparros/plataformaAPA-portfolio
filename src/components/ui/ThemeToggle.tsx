'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface Props {
  collapsed?: boolean; // sidebar colapsado → solo icono
  mini?: boolean;      // botón compacto flotante
}

export default function ThemeToggle({ collapsed = false, mini = false }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  if (mini) {
    return (
      <button
        onClick={toggle}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/70 dark:bg-dark-elevated/80 border border-white/60 dark:border-dark-border shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200 active:scale-95"
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark
          ? <SunIcon className="w-4 h-4 text-sol-500" />
          : <MoonIcon className="w-4 h-4 text-neutro-piedra" />
        }
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl
        text-neutro-piedra hover:bg-sol-400/10 dark:hover:bg-sol-400/8
        border border-transparent hover:border-sol-400/20
        transition-all duration-200 active:scale-95 min-h-[44px]
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      {isDark
        ? <SunIcon  className="w-5 h-5 flex-shrink-0 text-sol-500" />
        : <MoonIcon className="w-5 h-5 flex-shrink-0 text-neutro-piedra dark:text-dark-muted" />
      }
      {!collapsed && (
        <span className="font-outfit font-medium text-sm text-neutro-piedra dark:text-dark-muted">
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </span>
      )}
    </button>
  );
}
