'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { FileText, UserCheck, Building2, BookOpen, Settings, Baby, BarChart3, Timer, Activity, ShieldCheck } from 'lucide-react';
import DashboardNavCard from './ui/DashboardNavCard';
import DashboardMetricCard, { DashboardMetricCardSkeleton } from './ui/DashboardMetricCard';
import DashboardHeader from './ui/DashboardHeader';

export default function AdminDashboard() {
  const { user, perfil } = useAuth();
  const router = useRouter();

  const { data: metricas = {
    totalNinos: 0,
    totalSesiones: 0,
    totalVoluntarios: 0,
    totalEquipos: 0,
    sesionesEsteMes: 0,
    ninosSinSesiones: 0,
  }} = useQuery({
    queryKey: ['admin-metricas'],
    queryFn: async () => {
      // Total niños
      const { count: countNinos } = await supabase
        .from('ninos')
        .select('*', { count: 'exact', head: true });

      // Total sesiones
      const { count: countSesiones } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true });

      // Sesiones este mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: countSesionesMes } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', inicioMes.toISOString());

      // Total usuarios
      const { count: countVoluntarios } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true });

      // Total equipos
      const { count: countEquipos } = await supabase
        .from('zonas')
        .select('*', { count: 'exact', head: true });

      // Niños sin sesiones — UNA SOLA QUERY en vez del loop N+1
      const { data: ninosConSesiones } = await supabase
        .from('sesiones')
        .select('nino_id');

      const ninosConSesionesSet = new Set(
        (ninosConSesiones || []).map((s: any) => s.nino_id)
      );
      const ninosSinSesiones = (countNinos || 0) - ninosConSesionesSet.size;

      return {
        totalNinos: countNinos || 0,
        totalSesiones: countSesiones || 0,
        totalVoluntarios: countVoluntarios || 0,
        totalEquipos: countEquipos || 0,
        sesionesEsteMes: countSesionesMes || 0,
        ninosSinSesiones: Math.max(0, ninosSinSesiones),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  // ─── Sesiones activas hoy (concurrentes) ──────────────────────────────────
  const { data: sesionesHoy = [], refetch: refetchSesionesHoy } = useQuery({
    queryKey: ['admin-sesiones-hoy'],
    queryFn: async () => {
      const hoyInicio = new Date();
      hoyInicio.setHours(0, 0, 0, 0);
      const hoyFin = new Date();
      hoyFin.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('sesiones')
        .select(`
          id,
          fecha,
          duracion_minutos,
          ninos!sesiones_nino_id_fkey(alias, rango_etario)
        `)
        .gte('fecha', hoyInicio.toISOString())
        .lte('fecha', hoyFin.toISOString())
        .order('fecha', { ascending: false });

      if (error) {
        console.warn('Error cargando sesiones de hoy:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 30, // Refrescar cada 30 segundos
    refetchInterval: 1000 * 30,
  });

  return (
    <div>
      <DashboardHeader
        title="Panel de Administración"
        subtitle="Gestión integral del programa APA"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <DashboardMetricCard
          icon={Baby}
          value={metricas.totalNinos}
          label="Niños Activos"
          sublabel={`${metricas.ninosSinSesiones} sin sesiones`}
          colorClass="impulso"
        />
        <DashboardMetricCard
          icon={FileText}
          value={metricas.totalSesiones}
          label="Sesiones Totales"
          sublabel={`${metricas.sesionesEsteMes} este mes`}
          colorClass="sol"
        />
        <DashboardMetricCard
          icon={UserCheck}
          value={metricas.totalVoluntarios}
          label="Usuarios Totales"
          colorClass="crecimiento"
        />
        <DashboardMetricCard
          icon={Building2}
          value={metricas.totalEquipos}
          label="Equipos/Zonas"
          colorClass="teal"
        />
      </div>

      {/* ─── Sesiones activas hoy ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-crecimiento-50 flex items-center justify-center text-crecimiento-600">
              <Activity className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-quicksand font-bold text-neutro-carbon text-lg leading-tight">
                Sesiones de hoy
              </h2>
              <p className="font-outfit text-xs text-neutro-piedra">
                Actualiza cada 30 segundos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-quicksand font-bold text-2xl text-neutro-carbon">
              {sesionesHoy.length}
            </span>
            <button
              onClick={() => refetchSesionesHoy()}
              className="p-2 rounded-xl hover:bg-white/60 transition-colors text-neutro-piedra hover:text-neutro-carbon"
              title="Actualizar"
            >
              <Timer className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {sesionesHoy.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 p-6 text-center shadow-sm">
            <div className="h-10 w-10 rounded-2xl bg-neutro-piedra/10 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-neutro-piedra" strokeWidth={2} />
            </div>
            <p className="font-outfit text-neutro-piedra text-sm">No hay sesiones registradas hoy</p>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 overflow-hidden shadow-[0_8px_32px_-8px_rgba(164,198,57,0.12)]">
            {/* Barra de resumen */}
            <div className="px-5 py-3 bg-crecimiento-50/60 border-b border-white/60 flex items-center gap-4 flex-wrap">
              {(['individual', 'con_padres', 'grupal'] as const).map(tipo => {
                const count = sesionesHoy.filter((s: any) => (s.tipo_sesion || 'individual') === tipo).length;
                if (count === 0) return null;
                const labels = { individual: '🧒 Individual', con_padres: '👨‍👩‍👧 Con familia', grupal: '👥 Grupal' };
                return (
                  <span key={tipo} className="font-outfit text-xs font-semibold text-neutro-carbon bg-white/70 px-3 py-1 rounded-full border border-white/60">
                    {labels[tipo]}: <span className="text-crecimiento-700">{count}</span>
                  </span>
                );
              })}
              <span className="ml-auto font-outfit text-xs text-neutro-piedra">
                {sesionesHoy.reduce((acc: number, s: any) => acc + (s.duracion_minutos || 0), 0)} min totales
              </span>
            </div>

            {/* Lista de sesiones */}
            <div className="divide-y divide-white/60 max-h-72 overflow-y-auto">
              {sesionesHoy.map((sesion: any) => {
                const nino = Array.isArray(sesion.ninos) ? sesion.ninos[0] : sesion.ninos;
                const prof = Array.isArray(sesion.perfiles) ? sesion.perfiles[0] : sesion.perfiles;
                const tipo = sesion.tipo_sesion || 'individual';
                const tipoEmoji = tipo === 'con_padres' ? '👨‍👩‍👧' : tipo === 'grupal' ? '👥' : '🧒';
                const hora = new Date(sesion.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={sesion.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/40 transition-colors">
                    <span className="text-xl flex-shrink-0">{tipoEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-outfit font-semibold text-neutro-carbon text-sm truncate">
                        {nino?.alias || '—'}
                        {nino?.rango_etario && (
                          <span className="ml-1.5 text-xs font-normal text-neutro-piedra">
                            ({nino.rango_etario})
                          </span>
                        )}
                      </p>
                      <p className="font-outfit text-xs text-neutro-piedra truncate">
                        {prof ? `${prof.nombre || ''} ${prof.apellido || ''}`.trim() : '—'}
                        {prof?.rol && (
                          <span className="ml-1.5 opacity-70">· {prof.rol}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-outfit text-xs font-semibold text-neutro-carbon">{hora}</p>
                      {sesion.duracion_minutos > 0 && (
                        <p className="font-outfit text-[10px] text-neutro-piedra">{sesion.duracion_minutos} min</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Menú de opciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardNavCard href="/dashboard/ninos" icon={Baby} title="Gestionar Niños" description="Perfiles, evaluaciones y planes de intervención" colorClass="impulso" />
        <DashboardNavCard href="/dashboard/sesiones" icon={FileText} title="Historial de Sesiones" description="Ver y analizar todas las sesiones registradas" colorClass="sol" />
        <DashboardNavCard href="/dashboard/usuarios" icon={UserCheck} title="Gestión de Usuarios" description="Crear, editar y asignar roles a usuarios" colorClass="crecimiento" />
        <DashboardNavCard href="/dashboard/equipos" icon={Building2} title="Equipos/Zonas" description="Gestionar equipos y asignaciones" colorClass="crecimiento" />
        <DashboardNavCard href="/dashboard/biblioteca" icon={BookOpen} title="Biblioteca" description="Documentos psicopedagógicos y sistema RAG" colorClass="sol" />
        <DashboardNavCard href="/dashboard/configuracion" icon={Settings} title="Configuración" description="Ajustes del sistema y preferencias" colorClass="neutral" />
        <DashboardNavCard href="/dashboard/metricas" icon={BarChart3} title="Métricas Generales" description="Estadísticas globales de toda la plataforma" colorClass="teal" />
        <DashboardNavCard href="/dashboard/audit-log" icon={ShieldCheck} title="Log de Auditoría" description="Quién cambió qué y cuándo en el sistema" colorClass="neutral" />
      </div>
    </div>
  );
}
