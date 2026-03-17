'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatearEdad } from '@/lib/utils/date-helpers';
import Link from 'next/link';
import { Users, CalendarDays, Clock, BookOpen, ClipboardList, CheckSquare, LibraryBig, GraduationCap, BarChart3 } from 'lucide-react';
import { DashboardMetricCard, DashboardMetricCardSkeleton, DashboardHeader, DashboardNavCard } from './ui';

interface NinoAsignado {
  id: string;
  alias: string;
  rango_etario: string;
  fecha_nacimiento: string | null;
  nivel_alfabetizacion: string;
  total_sesiones: number;
  ultima_sesion: string | null;
  mis_sesiones: number;
}

interface UltimaSesion {
  id: string;
  nino_alias: string;
  fecha: string;
  duracion_minutos: number;
}

interface EstadisticasVoluntario {
  total_ninos: number;
  sesiones_este_mes: number;
  horas_este_mes: number;
  ultima_sesion: UltimaSesion | null;
}

interface VoluntarioDashboardProps {
  userId: string;
}

interface TrainingStatus {
  necesitaCapacitacion: boolean;
  areasPendientes: string[];
  autoevaluacionesPendientes: number;
  haCompletadoAlgunaAutoeval: boolean;
  autoevalPuntaje: number | null; // 0..10 score from autoevaluación
  autoevalPorcentaje: number | null; // 0..100
  scoresPorArea: { area: string; score_final: number; necesita_capacitacion: boolean }[];
}

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  created_at: string;
}

const AREA_LABELS: Record<string, string> = {
  lenguaje: 'Lenguaje y Vocabulario',
  lenguaje_vocabulario: 'Lenguaje y Vocabulario',
  grafismo: 'Grafismo y Motricidad Fina',
  grafismo_motricidad: 'Grafismo y Motricidad Fina',
  lectura_escritura: 'Lectura y Escritura',
  nociones_matematicas: 'Nociones Matemáticas',
  matematicas: 'Nociones Matemáticas',
};

export default function VoluntarioDashboard({ userId }: VoluntarioDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeSession, setActiveSession] = useState<{ ninoId: string; alias: string; minutes: number; isStale?: boolean } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['voluntario-dashboard', userId],
    queryFn: async () => {
      // 1. Traer asignaciones con datos del niño via API route (service_role bypasa RLS).
      // No usamos supabase client directo porque RLS en 'ninos' bloquea .in('id',[...])
      // y el join embebido también puede fallar si la FK no está configurada.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sin sesión activa');

      const res = await fetch(`/api/asignaciones?voluntario_id=${userId}&activo=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error API asignaciones: ${res.status}`);
      const { asignaciones: asignData } = await res.json();

      // Mapa de niños asignados
      const ninosMap = new Map<string, any>();

      (asignData || []).forEach((asig: any) => {
        const nino = asig.nino; // la API devuelve 'nino' (singular) no 'ninos'
        if (nino && !ninosMap.has(nino.id)) {
          ninosMap.set(nino.id, {
            id: nino.id,
            alias: nino.alias,
            rango_etario: nino.rango_etario,
            fecha_nacimiento: nino.fecha_nacimiento ?? null,
            nivel_alfabetizacion: nino.nivel_alfabetizacion ?? '',
            mis_sesiones: 0,
            total_sesiones: 0,
            ultima_sesion: null,
          });
        }
      });

      // 2. Traer TODAS las sesiones del voluntario
      // Nota: NO usamos !inner ni join con ninos para evitar problemas de RLS en tabla ninos.
      // Los niños ya están en ninosMap desde la API route.
      const { data: misSesiones, error: sesionesError } = await supabase
        .from('sesiones')
        .select('id, nino_id, fecha, duracion_minutos')
        .eq('voluntario_id', userId)
        .order('fecha', { ascending: false });

      // Si falla sesiones (ej RLS), no interrumpimos — el niño ya está en el map
      if (sesionesError) {
        console.warn('[WARN] Error al traer sesiones, continuando sin ellas:', sesionesError.message);
      }

      // 3. Merge session data into niños map
      (misSesiones || []).forEach((sesion: any) => {
        const ninoId = sesion.nino_id;
        if (!ninosMap.has(ninoId)) {
          // Sesión de niño sin asignación activa (edge case) — igualmente contar
          ninosMap.set(ninoId, {
            id: ninoId,
            alias: 'Desconocido',
            rango_etario: '',
            fecha_nacimiento: null,
            nivel_alfabetizacion: '',
            mis_sesiones: 0,
            total_sesiones: 0,
            ultima_sesion: null,
          });
        }
        const entry = ninosMap.get(ninoId);
        entry.mis_sesiones++;
        if (!entry.ultima_sesion) {
          entry.ultima_sesion = sesion.fecha;
        }
      });

      // 4. Get total session counts (all volunteers) for relevant niños
      const todosNinoIds = Array.from(ninosMap.keys());
      let totalSesionesPorNino: Record<string, number> = {};
      
      if (todosNinoIds.length > 0) {
        const { data: todasSesiones } = await supabase
          .from('sesiones')
          .select('nino_id')
          .in('nino_id', todosNinoIds);

        (todasSesiones || []).forEach((s: any) => {
          totalSesionesPorNino[s.nino_id] = (totalSesionesPorNino[s.nino_id] || 0) + 1;
        });
      }

      const ninosArray: NinoAsignado[] = Array.from(ninosMap.values()).map((nino) => ({
        ...nino,
        total_sesiones: totalSesionesPorNino[nino.id] || nino.total_sesiones,
      }));

      // 5. Estadísticas del mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const sesionesMes = (misSesiones || []).filter(
        (s: any) => new Date(s.fecha) >= inicioMes
      );

      const horasTotales = sesionesMes.reduce(
        (acc: number, s: any) => acc + (s.duracion_minutos || 0),
        0
      );

      const estadisticas: EstadisticasVoluntario = {
        total_ninos: ninosArray.length,
        sesiones_este_mes: sesionesMes.length,
        horas_este_mes: Math.round(horasTotales / 60 * 10) / 10,
        ultima_sesion: misSesiones?.[0]
          ? {
              id: misSesiones[0].id,
              nino_alias: ninosMap.get(misSesiones[0].nino_id)?.alias ?? 'Niño',
              fecha: misSesiones[0].fecha,
              duracion_minutos: (misSesiones[0] as any).duracion_minutos || 0
            }
          : null
      };

      return { ninos: ninosArray, estadisticas };
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 segundos de caché
  });

  // Training status query
  const { data: trainingStatus } = useQuery<TrainingStatus>({
    queryKey: ['voluntario-training-status', userId],
    queryFn: async () => {
      // 1. Check scores per area for necesita_capacitacion
      const { data: scores } = await supabase
        .from('scores_voluntarios_por_area')
        .select('area, necesita_capacitacion, score_final')
        .eq('voluntario_id', userId);

      const areasPendientes = (scores || [])
        .filter((s: any) => s.necesita_capacitacion)
        .map((s: any) => s.area);

      // 2. Check how many autoevaluaciones exist that volunteer hasn't completed
      const { data: autoevals } = await supabase
        .from('capacitaciones')
        .select('id')
        .eq('tipo', 'autoevaluacion')
        .eq('activa', true);

      const { data: completadas } = await supabase
        .from('voluntarios_capacitaciones')
        .select('capacitacion_id, estado')
        .eq('voluntario_id', userId)
        .in('estado', ['completada', 'aprobada', 'reprobada']);

      const completadasIds = new Set((completadas || []).map((c: any) => c.capacitacion_id));
      const pendientes = (autoevals || []).filter((a: any) => !completadasIds.has(a.id));

      const haCompletadoAlgunaAutoeval = (completadas || []).length > 0;

      // 3. Get autoevaluación puntaje (best score across all attempts)
      const { data: volCaps } = await supabase
        .from('voluntarios_capacitaciones')
        .select('puntaje_final, puntaje_maximo, porcentaje, capacitacion_id')
        .eq('voluntario_id', userId)
        .in('estado', ['completada', 'aprobada', 'reprobada'])
        .order('porcentaje', { ascending: false })
        .limit(1);

      const autoevalResult = volCaps?.[0] || null;

      // 4. Build per-area score map
      const scoresPorArea = (scores || []).map((s: any) => ({
        area: s.area as string,
        score_final: s.score_final as number,
        necesita_capacitacion: s.necesita_capacitacion as boolean,
      }));

      return {
        necesitaCapacitacion: areasPendientes.length > 0,
        areasPendientes,
        autoevaluacionesPendientes: pendientes.length,
        haCompletadoAlgunaAutoeval,
        autoevalPuntaje: autoevalResult ? autoevalResult.puntaje_final : null,
        autoevalPorcentaje: autoevalResult ? autoevalResult.porcentaje : null,
        scoresPorArea,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Notifications query
  const { data: notificaciones = [] } = useQuery<Notificacion[]>({
    queryKey: ['voluntario-notificaciones', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error al cargar notificaciones:', error);
        return [];
      }
      return (data || []) as Notificacion[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  // Trigger notification generation on dashboard load (if volunteer has pending capacitaciones)
  useEffect(() => {
    if (!userId || !trainingStatus?.necesitaCapacitacion) return;

    const generateNotification = async () => {
      try {
        await fetch('/api/notificaciones/generar', { method: 'POST' });
        // Refresh notifications after potential creation
        queryClient.invalidateQueries({ queryKey: ['voluntario-notificaciones', userId] });
      } catch (e) {
        // Silently fail — notifications are non-critical
        console.error('Error generando notificación:', e);
      }
    };

    // Small delay to avoid blocking initial render
    const timer = setTimeout(generateNotification, 2000);
    return () => clearTimeout(timer);
  }, [userId, trainingStatus?.necesitaCapacitacion, queryClient]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const marcarLeida = async (notifId: string) => {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notifId);
    queryClient.invalidateQueries({ queryKey: ['voluntario-notificaciones', userId] });
  };

  const marcarTodasLeidas = async () => {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', userId)
      .eq('leida', false);
    queryClient.invalidateQueries({ queryKey: ['voluntario-notificaciones', userId] });
  };

  const formatearFechaNotif = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    if (diffDias < 7) return `Hace ${diffDias}d`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const ninos = data?.ninos || [];
  const estadisticas = data?.estadisticas || {
    total_ninos: 0,
    sesiones_este_mes: 0,
    horas_este_mes: 0,
    ultima_sesion: null
  };

  // Capacitación is OPTIONAL — volunteer is NOT blocked from operating.
  // They can still register sessions even if they didn't score 100%.
  // The only real block: they haven't completed ANY autoevaluación yet.
  const operacionBloqueada = false;
  
  // Areas where score < 100% → suggest (not require) capacitación  
  const tieneCapacitacionesSugeridas = !!(trainingStatus?.necesitaCapacitacion && trainingStatus.haCompletadoAlgunaAutoeval);

  // Check for active session timer (runs after data is available)
  useEffect(() => {
    const checkActiveSession = () => {
      const activeNinoId = localStorage.getItem('sesion_timer_active');
      if (!activeNinoId) {
        setActiveSession(null);
        return;
      }
      const start = localStorage.getItem(`sesion_timer_${activeNinoId}_start`);
      if (!start) {
        // Key missing — stale marker, clean up
        localStorage.removeItem('sesion_timer_active');
        setActiveSession(null);
        return;
      }
      const paused = parseInt(localStorage.getItem(`sesion_timer_${activeNinoId}_paused`) || '0', 10);
      const pauseAt = localStorage.getItem(`sesion_timer_${activeNinoId}_pauseAt`);
      let totalPaused = paused;
      if (pauseAt) totalPaused += Date.now() - parseInt(pauseAt, 10);
      const elapsed = Math.max(0, Date.now() - parseInt(start, 10) - totalPaused);
      const minutes = Math.round(elapsed / 60000);

      // Sessions older than 12 hours are considered "ghost" — show a stale warning
      const isStale = minutes > 720;

      // Alias: use loaded ninos list; fall back to stored alias from localStorage
      const ninoData = ninos.find((n) => n.id === activeNinoId);
      const storedAlias = localStorage.getItem(`sesion_timer_${activeNinoId}_alias`) || 'Niño';
      const alias = ninoData?.alias || storedAlias;

      // Persist alias so it survives page reloads before ninos loads
      if (ninoData?.alias) {
        localStorage.setItem(`sesion_timer_${activeNinoId}_alias`, ninoData.alias);
      }

      setActiveSession({ ninoId: activeNinoId, alias, minutes, isStale });
    };

    checkActiveSession();
    const interval = setInterval(checkActiveSession, 30000);
    return () => clearInterval(interval);
  }, [ninos]);

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'Nunca';
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardHeader title="Mi Dashboard" subtitle="Cargando tu información..." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[...Array(4)].map((_, i) => <DashboardMetricCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <DashboardMetricCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <DashboardHeader
        title="Mi Dashboard"
        subtitle="Bienvenido/a a tu panel de voluntario APA"
        action={
          <div className="relative" ref={notifPanelRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Notificaciones"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 bg-impulso-500 text-white text-[11px] font-bold rounded-full shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/60 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 bg-sol-50/60 border-b border-white/60 flex items-center justify-between">
                <h3 className="font-quicksand font-bold text-neutro-carbon text-sm">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={marcarTodasLeidas}
                    className="font-outfit text-xs text-crecimiento-600 hover:text-crecimiento-700 font-medium transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-white/60">
                {notificaciones.length === 0 ? (
                  <div className="py-8 text-center">
                    <span className="text-3xl mb-2 block">🔕</span>
                    <p className="font-outfit text-sm text-neutro-piedra">Sin notificaciones</p>
                  </div>
                ) : (
                  notificaciones.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (!notif.leida) marcarLeida(notif.id);
                        if (notif.enlace) {
                          setShowNotifications(false);
                          router.push(notif.enlace);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/40 transition-colors ${
                        !notif.leida ? 'bg-crecimiento-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notif.leida && (
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-crecimiento-500 flex-shrink-0"></span>
                        )}
                        <div className={`flex-1 min-w-0 ${notif.leida ? 'ml-5' : ''}`}>
                          <p className={`font-outfit text-sm ${!notif.leida ? 'font-semibold text-neutro-carbon' : 'text-neutro-carbon/80'}`}>
                            {notif.titulo}
                          </p>
                          <p className="font-outfit text-xs text-neutro-piedra mt-0.5 line-clamp-2">
                            {notif.mensaje}
                          </p>
                          <p className="font-outfit text-[10px] text-neutro-piedra/60 mt-1">
                            {formatearFechaNotif(notif.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        }
      />

      {/* 🔴 Active Session Banner */}
      {activeSession && (
        activeSession.isStale ? (
          /* Sesión "fantasma" — hace más de 12 horas */
          <div className="w-full bg-gradient-to-r from-neutro-nube to-white border border-neutro-piedra/30 rounded-xl p-4 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="font-bold text-neutro-carbon text-sm sm:text-base">
                    Sesión sin cerrar con {activeSession.alias}
                  </p>
                  <p className="text-xs sm:text-sm text-neutro-piedra mt-0.5">
                    Hay un cronómetro activo de hace{' '}
                    {activeSession.minutes >= 1440
                      ? `${Math.floor(activeSession.minutes / 1440)} día${Math.floor(activeSession.minutes / 1440) !== 1 ? 's' : ''}`
                      : `${Math.floor(activeSession.minutes / 60)}h ${activeSession.minutes % 60}min`
                    }. ¿Qué querés hacer?
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => router.push(`/dashboard/sesiones/nueva/${activeSession.ninoId}`)}
                      className="px-4 py-2 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
                    >
                      📝 Retomar y guardar
                    </button>
                    <button
                      onClick={() => {
                        const id = activeSession.ninoId;
                        localStorage.removeItem(`sesion_timer_${id}_start`);
                        localStorage.removeItem(`sesion_timer_${id}_paused`);
                        localStorage.removeItem(`sesion_timer_${id}_pauseAt`);
                        localStorage.removeItem(`sesion_timer_${id}_alias`);
                        localStorage.removeItem('sesion_timer_active');
                        localStorage.removeItem(`draft_sesion_${id}`);
                        setActiveSession(null);
                      }}
                      className="px-4 py-2 bg-white border border-neutro-piedra/30 text-neutro-piedra rounded-xl text-xs font-semibold transition-all active:scale-95"
                    >
                      🗑️ Descartar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sesión activa normal */
          <button
            onClick={() => router.push(`/dashboard/sesiones/nueva/${activeSession.ninoId}`)}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] animate-pulse-slow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div className="text-left">
                  <p className="font-bold text-sm sm:text-base">Sesión en curso con {activeSession.alias}</p>
                  <p className="text-xs sm:text-sm opacity-90">
                    {activeSession.minutes} min transcurridos — Tocá para volver
                  </p>
                </div>
              </div>
              <span className="text-2xl">→</span>
            </div>
          </button>
        )
      )}

      {/* 🟡 Training Gate — Autoevaluaciones pendientes */}
      {(trainingStatus?.autoevaluacionesPendientes ?? 0) > 0 && (
        <Link
          href="/dashboard/autoevaluaciones"
          className="block w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📋</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm sm:text-base">
                {trainingStatus!.autoevaluacionesPendientes === 1
                  ? 'Tenés 1 autoevaluación pendiente'
                  : `Tenés ${trainingStatus!.autoevaluacionesPendientes} autoevaluaciones pendientes`}
              </p>
              <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                Completá tus autoevaluaciones para que podamos asignarte niños según tus fortalezas.
              </p>
            </div>
            <span className="text-amber-600 text-lg flex-shrink-0">→</span>
          </div>
        </Link>
      )}

      {/* 💡 Training Suggestion — Capacitaciones opcionales para áreas < 100% */}
      {tieneCapacitacionesSugeridas && (
        <div className="w-full bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 border border-amber-200">
              <span className="text-2xl">📚</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-base sm:text-lg">
                Capacitaciones sugeridas
              </p>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                Tu puntaje en las siguientes áreas no fue perfecto en la autoevaluación. 
                Podés completar capacitaciones opcionales para mejorar tus habilidades.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {trainingStatus!.areasPendientes.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/60"
                  >
                    💡 {AREA_LABELS[area] || area}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/capacitaciones"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-md hover:shadow-lg"
                >
                  📚 Ver Capacitaciones
                </Link>
                <Link
                  href="/dashboard/autoevaluaciones"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold text-sm transition-all active:scale-95"
                >
                  📋 Reintentar Autoevaluación
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Puntaje Autoevaluación + Capacitaciones por Área */}
      {trainingStatus?.haCompletadoAlgunaAutoeval && (
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 overflow-hidden shadow-[0_8px_32px_-8px_rgba(242,201,76,0.12)]">
          <div className="px-6 py-5 border-b border-white/60">
            <h2 className="font-quicksand font-bold text-xl text-neutro-carbon">
              Mi Progreso
            </h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Autoevaluación score — 5 stars */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-sol-50/60 rounded-2xl p-4 border border-sol-200/40">
              <div className="text-center sm:text-left flex-1">
                <p className="font-outfit font-semibold text-neutro-carbon text-sm mb-1">Autoevaluación</p>
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const porcentaje = trainingStatus.autoevalPorcentaje ?? 0;
                    const starsEarned = (porcentaje / 100) * 5;
                    const filled = star <= Math.round(starsEarned);
                    return (
                      <span key={star} className={`text-2xl sm:text-3xl ${filled ? 'text-sol-500' : 'text-neutro-piedra/30'}`}>
                        ★
                      </span>
                    );
                  })}
                </div>
                <p className="font-outfit text-xs text-neutro-piedra mt-1">
                  {trainingStatus.autoevalPorcentaje != null
                    ? `${trainingStatus.autoevalPorcentaje}% de puntaje`
                    : 'Sin puntaje aún'}
                </p>
              </div>
            </div>

            {/* Capacitaciones por Área */}
            <div>
              <p className="font-outfit font-semibold text-neutro-carbon text-sm mb-3">Capacitaciones por Área</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['lenguaje', 'grafismo', 'lectura_escritura', 'nociones_matematicas'] as const).map((areaKey) => {
                  const areaScore = trainingStatus.scoresPorArea.find(
                    (s) => s.area === areaKey || s.area === areaKey.replace('nociones_matematicas', 'matematicas')
                  );
                  const score = areaScore?.score_final ?? 0;
                  const necesita = areaScore?.necesita_capacitacion ?? (trainingStatus.autoevalPorcentaje != null && trainingStatus.autoevalPorcentaje < 100);
                  const starsEarned = (score / 100) * 5;

                  const areaColorMap: Record<string, { bg: string; border: string; text: string }> = {
                    lenguaje:           { bg: 'bg-teal-50/80',    border: 'border-teal-200/50',    text: 'text-teal-700'    },
                    grafismo:           { bg: 'bg-crecimiento-50/80', border: 'border-crecimiento-200/50', text: 'text-crecimiento-700' },
                    lectura_escritura:  { bg: 'bg-purple-50/80',  border: 'border-purple-200/50',  text: 'text-purple-700'  },
                    nociones_matematicas: { bg: 'bg-sol-50/80',   border: 'border-sol-200/50',     text: 'text-sol-700'     },
                  };
                  const colors = areaColorMap[areaKey] || areaColorMap.lenguaje;
                  const starFilledColor = score > 0 ? (necesita ? 'text-impulso-400' : 'text-sol-500') : 'text-neutro-piedra/30';

                  return (
                    <div key={areaKey} className={`${colors.bg} ${colors.border} border rounded-2xl p-3`}>
                      <p className={`font-outfit text-xs font-semibold ${colors.text} mb-1.5 truncate`}>
                        {AREA_LABELS[areaKey] || areaKey}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= Math.round(starsEarned);
                          return (
                            <span key={star} className={`text-lg ${filled ? starFilledColor : 'text-neutro-piedra/30'}`}>★</span>
                          );
                        })}
                        <span className="ml-2 font-outfit text-xs text-neutro-piedra">
                          {score > 0 ? `${score}%` : '—'}
                        </span>
                      </div>
                      {necesita && (
                        <p className="font-outfit text-[10px] text-impulso-600 mt-1 font-medium">
                          Capacitación sugerida
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <DashboardMetricCard
          icon={Users}
          value={estadisticas.total_ninos}
          label="Niños Asignados"
          colorClass="crecimiento"
        />
        <DashboardMetricCard
          icon={CalendarDays}
          value={estadisticas.sesiones_este_mes}
          label="Sesiones este mes"
          colorClass="teal"
        />
        <DashboardMetricCard
          icon={Clock}
          value={estadisticas.horas_este_mes}
          label="Horas este mes"
          colorClass="impulso"
        />
        <DashboardMetricCard
          icon={BookOpen}
          value={estadisticas.ultima_sesion ? formatearFecha(estadisticas.ultima_sesion.fecha) : 'Ninguna'}
          label="Última Sesión"
          colorClass="sol"
        />
      </div>

      {/* Lista de Niños Asignados */}
      <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 overflow-hidden shadow-[0_8px_32px_-8px_rgba(164,198,57,0.12)]">
        <div className="px-6 py-5 border-b border-white/60 flex items-center justify-between">
          <div>
            <h2 className="font-quicksand font-bold text-xl text-neutro-carbon">
              Mis Niños Asignados
            </h2>
            <p className="font-outfit text-sm text-neutro-piedra mt-0.5">
              Tocá en un niño para ver su perfil o registrar una sesión
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-crecimiento-50 flex items-center justify-center text-crecimiento-500">
            <Users className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </div>

        {ninos.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-neutro-piedra/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-neutro-piedra" strokeWidth={1.5} />
            </div>
            <p className="font-outfit font-medium text-neutro-carbon mb-1">Aún no tenés niños asignados</p>
            <p className="font-outfit text-sm text-neutro-piedra">
              Cuando empieces a registrar sesiones, aparecerán acá
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/60">
            {ninos.map((nino) => (
              <div
                key={nino.id}
                className="p-5 sm:p-6 hover:bg-white/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Nombre */}
                    <h3 className="font-quicksand font-bold text-lg text-neutro-carbon mb-1.5 truncate">
                      {nino.alias}
                    </h3>

                    {/* Info secundaria */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sol-50 text-sol-700 text-xs font-medium border border-sol-200/50">
                        {formatearEdad(nino.fecha_nacimiento, nino.rango_etario)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-neutro-piedra/10 text-neutro-carbon text-xs font-medium">
                        {nino.nivel_alfabetizacion || 'Sin nivel'}
                      </span>
                    </div>

                    {/* Estadísticas del niño */}
                    <div className="flex flex-wrap items-center gap-3 font-outfit text-xs text-neutro-piedra">
                      <span>
                        <span className="font-semibold text-neutro-carbon">{nino.mis_sesiones}</span> sesiones tuyas
                      </span>
                      <span className="text-neutro-piedra/40">•</span>
                      <span>
                        <span className="font-semibold text-neutro-carbon">{nino.total_sesiones}</span> en total
                      </span>
                      <span className="text-neutro-piedra/40">•</span>
                      <span>Última: {formatearFecha(nino.ultima_sesion)}</span>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => !operacionBloqueada && router.push(`/dashboard/sesiones/nueva/${nino.id}`)}
                      disabled={operacionBloqueada}
                      className={`px-4 py-2.5 rounded-xl font-outfit font-semibold text-sm transition-all touch-manipulation min-w-[120px] shadow-sm ${
                        operacionBloqueada
                          ? 'bg-neutro-piedra/20 text-neutro-piedra cursor-not-allowed shadow-none'
                          : 'bg-crecimiento-500 hover:bg-crecimiento-600 active:bg-crecimiento-700 text-white hover:shadow-md active:scale-95'
                      }`}
                      style={{ minHeight: '44px' }}
                      title={operacionBloqueada ? 'Debés completar las capacitaciones pendientes antes de registrar sesiones' : ''}
                    >
                      {operacionBloqueada ? '🔒 Bloqueado' : '📝 Nueva Sesión'}
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/ninos/${nino.id}`)}
                      className="px-4 py-2.5 bg-white/70 hover:bg-white border border-white/60 text-neutro-carbon rounded-xl font-outfit font-medium text-sm transition-all touch-manipulation min-w-[120px] hover:shadow-sm active:scale-95"
                      style={{ minHeight: '44px' }}
                    >
                      👁️ Ver Perfil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones Rápidas */}
      <div>
        <h2 className="font-quicksand font-bold text-xl text-neutro-carbon mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardNavCard
            href="/dashboard/sesiones"
            icon={ClipboardList}
            title="Mis Sesiones"
            description="Historial completo de todas tus sesiones registradas"
            colorClass="crecimiento"
          />
          <DashboardNavCard
            href="/dashboard/asistencia"
            icon={CheckSquare}
            title="Asistencia"
            description="Registrar y consultar asistencia de los niños"
            colorClass="teal"
          />
          <DashboardNavCard
            href="/dashboard/biblioteca"
            icon={LibraryBig}
            title="Biblioteca"
            description="Recursos y materiales psicopedagógicos de apoyo"
            colorClass="sol"
          />
          <DashboardNavCard
            href="/dashboard/capacitaciones"
            icon={GraduationCap}
            title="Capacitaciones"
            description="Módulos de formación y autoevaluaciones disponibles"
            colorClass="purple"
          />
          <DashboardNavCard
            href="/dashboard/metricas"
            icon={BarChart3}
            title="Mis Métricas"
            description="Estadísticas y evolución de tu trabajo con los niños"
            colorClass="impulso"
          />
        </div>
      </div>
    </div>
  );
}
