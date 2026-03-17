'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface Props {
  collapsed?: boolean; // sidebar colapsado → solo icono
}

export default function ThemeToggle({ collapsed = false }: Props) {
  const { theme, setTheme } = useTheme();

  // Ciclar: light → dark → system → light
  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const icons = {
    light:  <SunIcon  className="w-5 h-5 flex-shrink-0 text-sol-500" />,
    dark:   <MoonIcon className="w-5 h-5 flex-shrink-0 text-crecimiento-400" />,
    system: <ComputerDesktopIcon className="w-5 h-5 flex-shrink-0 text-neutro-piedra dark:text-dark-muted" />,
  };

  const labels = {
    light:  'Modo claro',
    dark:   'Modo oscuro',
    system: 'Seguir sistema',
  };

  return (
    <button
      onClick={cycle}
      title={labels[theme]}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl
        text-neutro-piedra hover:bg-sol-400/10 dark:hover:bg-sol-400/8
        border border-transparent hover:border-sol-400/20
        transition-all duration-200 active:scale-95 min-h-[44px]
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      {icons[theme]}
      {!collapsed && (
        <span className="font-outfit font-medium text-sm text-neutro-piedra dark:text-dark-muted">
          {labels[theme]}
        </span>
      )}
    </button>
  );
}
