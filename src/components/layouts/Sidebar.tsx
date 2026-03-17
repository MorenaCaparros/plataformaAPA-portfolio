'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  HomeIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  AcademicCapIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
  { name: 'Niños', href: '/dashboard/ninos', icon: UsersIcon, roles: ['coordinador', 'psicopedagogia', 'trabajadora_social', 'equipo_profesional', 'director', 'admin', 'voluntario'] },
  { name: 'Sesiones', href: '/dashboard/sesiones', icon: DocumentTextIcon },
  { name: 'Asistencia', href: '/dashboard/asistencia', icon: ClipboardDocumentCheckIcon },
  { name: 'Autoevaluaciones', href: '/dashboard/autoevaluaciones', icon: AcademicCapIcon },
  { name: 'Biblioteca', href: '/dashboard/biblioteca/drive', icon: BookOpenIcon },
  { name: 'Módulo IA', href: '/dashboard/ia', icon: SparklesIcon, roles: ['director', 'psicopedagogia', 'coordinador', 'equipo_profesional'] },
  { name: 'Usuarios', href: '/dashboard/usuarios', icon: UserGroupIcon, roles: ['director', 'admin', 'psicopedagogia', 'coordinador', 'equipo_profesional'] },
  { name: 'Zonas', href: '/dashboard/equipos', icon: MapPinIcon, roles: ['director', 'admin', 'coordinador', 'psicopedagogia', 'equipo_profesional'] },
  { name: 'Mi Perfil', href: '/dashboard/mi-perfil', icon: UserCircleIcon },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: Cog6ToothIcon, roles: ['director', 'admin'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { user, perfil, signOut } = useAuth();

  const handleSignOut = async () => {
    // signOut() ya maneja la redirección con window.location.href
    await signOut();
  };

  // Mapeo de roles para mostrar
  const rolesLabels: Record<string, string> = {
    voluntario: 'Voluntario',
    coordinador: 'Coordinador',
    psicopedagogia: 'Profesional',
    equipo_profesional: 'Equipo Profesional',
    director: 'Director',
    trabajador_social: 'Trabajador Social'
  };

  const rolDisplay = perfil?.rol ? rolesLabels[perfil.rol] || perfil.rol : 'Usuario';

  // Cerrar menú mobile al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Detectar si es móvil
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      {/* Mobile: Toggle Button - ARRIBA A LA IZQUIERDA */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-4 bg-white/90 backdrop-blur-xl rounded-2xl border border-sol-400/30 shadow-[0_4px_16px_rgba(242,201,76,0.2)] active:scale-95 transition-transform"
      >
        {mobileOpen ? (
          <XMarkIcon className="w-6 h-6 text-neutro-carbon" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-neutro-carbon" />
        )}
      </button>

      {/* Mobile: Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-neutro-carbon/30 backdrop-blur-sm z-[45] animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: Desktop Flotante / Mobile Full Width */}
      <aside
        className={`
          fixed z-50
          bg-white/95 backdrop-blur-xl 
          border shadow-[0_8px_32px_rgba(242,201,76,0.15)]
          transition-all duration-300 ease-out
          
          /* Desktop: Flotante con márgenes */
          lg:left-6 lg:top-6 lg:bottom-6 lg:rounded-3xl lg:border-white/60
          ${collapsed ? 'lg:w-20' : 'lg:w-[280px]'}
          
          /* Mobile: Full height drawer desde la izquierda - SIEMPRE ANCHO COMPLETO */
          ${mobileOpen ? 'left-0 top-0 bottom-0 w-[280px] rounded-r-3xl border-r-white/60' : '-left-full w-[280px] pointer-events-none lg:pointer-events-auto'}
        `}
      >
        <div className="flex flex-col h-full p-4 lg:p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              {/* Logo placeholder - reemplazar con imagen real */}
              <div className="w-12 h-12 lg:w-10 lg:h-10 rounded-2xl bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center shadow-glow-sol">
                <span className="text-white font-quicksand font-bold text-2xl lg:text-xl">A</span>
              </div>
              {/* En mobile SIEMPRE mostrar nombre, en desktop solo si no está collapsed */}
              {(isMobile || !collapsed) && (
                <span className="font-quicksand font-bold text-2xl lg:text-xl text-neutro-carbon">
                  Adelante
                </span>
              )}
            </Link>

            {/* Close/Collapse button */}
            <button
              onClick={() => {
                if (isMobile) {
                  setMobileOpen(false);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              className="flex p-2 hover:bg-sol-400/10 rounded-xl transition-colors active:scale-95"
            >
              {isMobile ? (
                <XMarkIcon className="w-7 h-7 text-neutro-piedra" />
              ) : (
                <ChevronLeftIcon
                  className={`w-5 h-5 text-neutro-piedra transition-transform ${
                    collapsed ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-3 overflow-y-auto">
            {navigation
              .filter((item) => {
                // If item has roles restriction, check user role
                if (item.roles && perfil?.rol) {
                  return item.roles.includes(perfil.rol);
                }
                // No restriction = show to all
                return !item.roles;
              })
              .map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== '/dashboard');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-4 px-4 py-4 lg:px-3 lg:py-3 rounded-2xl
                    transition-all duration-200 min-h-[56px] lg:min-h-[48px]
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white shadow-glow-crecimiento'
                        : 'text-neutro-piedra hover:bg-sol-400/10 hover:text-neutro-carbon active:scale-95'
                    }
                    ${collapsed && !isMobile ? 'lg:justify-center' : ''}
                  `}
                  title={(collapsed && !isMobile) ? item.name : undefined}
                >
                  <Icon className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
                  {/* En mobile SIEMPRE mostrar nombre, en desktop solo si no está collapsed */}
                  {(isMobile || !collapsed) && (
                    <span className="font-outfit font-medium text-base lg:text-sm">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="mt-4 space-y-2">
            <Link
              href="/dashboard/mi-perfil"
              className={`
                p-4 lg:p-3 rounded-2xl bg-sol-400/10 border border-sol-400/20
                hover:bg-sol-400/20 transition-colors cursor-pointer block
                ${collapsed && !isMobile ? 'lg:text-center' : ''}
              `}
            >
              {(isMobile || !collapsed) ? (
                <div>
                  <p className="text-base lg:text-sm font-medium text-neutro-carbon truncate">
                    {(perfil as any)?.nombre || user?.email || 'Usuario'}
                  </p>
                  <p className="text-sm lg:text-xs text-neutro-piedra font-semibold">
                    {rolDisplay}
                  </p>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sol-400 to-crecimiento-400 mx-auto" />
              )}
            </Link>

            <ThemeToggle collapsed={collapsed && !isMobile} />

            <button
              onClick={handleSignOut}
              className={`
                w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2.5 rounded-2xl
                text-impulso-600 hover:bg-impulso-50 dark:hover:bg-impulso-900/20 border border-impulso-200/50
                transition-colors active:scale-95 min-h-[44px]
                ${collapsed && !isMobile ? 'lg:justify-center' : ''}
              `}
              title={(collapsed && !isMobile) ? 'Cerrar sesión' : undefined}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
              {(isMobile || !collapsed) && (
                <span className="font-outfit font-medium text-sm">Cerrar sesión</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer para desktop (evita que el contenido quede debajo del sidebar) */}
      {/* En mobile no se usa spacer porque el sidebar es overlay */}
      <div className={`hidden lg:block transition-all duration-300 ${collapsed && !isMobile ? 'lg:w-28' : 'lg:w-[304px]'}`} />
    </div>
  );
}
