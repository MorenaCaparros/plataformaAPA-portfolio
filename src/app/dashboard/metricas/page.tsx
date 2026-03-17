'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Award,
  BookOpen,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Baby,
  UserCheck,
  Flame,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

// Tipos
interface MetricasVoluntario {
  resumen: {
    ninos_asignados: number;
    sesiones_este_mes: number;
    sesiones_esta_semana: number;
    horas_este_mes: number;
  };
  detalle: {
    total_sesiones_historicas: number;
    promedio_duracion_minutos: number;
    racha_dias: number;
    ultima_sesion: { fecha: string; nino: string } | null;
  };
  tendencias: {
    sesiones_vs_mes_anterior: number;
    progreso_meta_mensual: number;
  };
}

interface MetricasEquipo {
  zona: { id: string | null; nombre: string };
  resumen: {
    total_ninos: number;
    total_voluntarios: number;
    sesiones_este_mes: number;
    sesiones_esta_semana: number;
    horas_este_mes: number;
  };
  equipo: {
    voluntarios_activos: number;
    tasa_actividad_voluntarios: number;
    asignaciones_activas: number;
  };
  atencion: {
    ninos_sin_sesion_este_mes: number;
    promedio_sesiones_por_nino: number;
    cobertura_porcentaje: number;
  };
  distribucion: {
    por_nivel_alfabetizacion: Record<string, number>;
    escolarizados: number;
    no_escolarizados: number;
  };
  alertas: {
    ninos_sin_atencion: number;
    voluntarios_inactivos: number;
  };
}

interface MetricasAdmin {
  resumen: {
    total_ninos: number;
    total_voluntarios: number;
    total_usuarios: number;
    total_zonas: number;
    total_sesiones: number;
  };
  este_mes: {
    sesiones: number;
    horas: number;
    voluntarios_activos: number;
    ninos_atendidos: number;
  };
  esta_semana: {
    sesiones: number;
  };
  cobertura: {
    ninos_atendidos_porcentaje: number;
    voluntarios_activos_porcentaje: number;
    asignaciones_activas: number;
  };
  distribucion: {
    usuarios_por_rol: Record<string, number>;
    por_zona: Array<{
      zona_id: string;
      nombre: string;
      ninos: number;
      voluntarios: number;
      sesiones_mes: number;
    }>;
  };
  tendencias: {
    sesiones_vs_mes_anterior: number;
  };
  alertas: {
    ninos_sin_atencion: number;
    voluntarios_inactivos: number;
  };
}

export default function MetricasPage() {
  const { user, perfil } = useAuth();
  const [metricas, setMetricas] = useState<MetricasVoluntario | MetricasEquipo | MetricasAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && perfil) {
      cargarMetricas();
    }
  }, [user, perfil]);

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId: user!.id,
        rol: perfil!.rol,
      });

      if (perfil?.zona_id) {
        params.append('zonaId', perfil.zona_id);
      }

      const response = await fetch(`/api/metricas?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar métricas');
      }

      setMetricas(data.metricas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const getTendenciaIcon = (valor: number) => {
    if (valor > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (valor < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando métricas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error al cargar métricas</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={cargarMetricas}
            className="px-4 py-2 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Renderizar según el rol
  if (perfil?.rol === 'voluntario') {
    return <MetricasVoluntarioView metricas={metricas as MetricasVoluntario} onRefresh={cargarMetricas} formatearFecha={formatearFecha} />;
  }

  if (['coordinador', 'trabajo_social'].includes(perfil?.rol || '')) {
    return <MetricasEquipoView metricas={metricas as MetricasEquipo} rol={perfil?.rol || ''} onRefresh={cargarMetricas} />;
  }

  if (['psicopedagogia', 'admin', 'director'].includes(perfil?.rol || '')) {
    return <MetricasAdminView metricas={metricas as MetricasAdmin} onRefresh={cargarMetricas} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <p className="text-gray-600">Rol no reconocido</p>
    </div>
  );
}

// ==========================================
// VISTA VOLUNTARIO
// ==========================================
function MetricasVoluntarioView({ 
  metricas, 
  onRefresh, 
  formatearFecha 
}: { 
  metricas: MetricasVoluntario; 
  onRefresh: () => void;
  formatearFecha: (fecha: string) => string;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Mis Métricas
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Tu progreso y estadísticas de voluntariado</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-crecimiento-500 to-crecimiento-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Niños Asignados</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.ninos_asignados}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Sesiones (Mes)</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.sesiones_este_mes}</p>
        </div>

        <div className="bg-gradient-to-br from-impulso-400 to-impulso-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Horas (Mes)</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.horas_este_mes}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Racha</span>
          </div>
          <p className="text-3xl font-bold">{metricas.detalle.racha_dias} <span className="text-lg">días</span></p>
        </div>
      </div>

      {/* Detalles y progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Resumen del mes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-crecimiento-500" />
            Resumen del Mes
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sesiones esta semana</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.resumen.sesiones_esta_semana}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Promedio por sesión</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.detalle.promedio_duracion_minutos} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total histórico</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.detalle.total_sesiones_historicas} sesiones</span>
            </div>
            
            {metricas.detalle.ultima_sesion && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Última sesión</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {metricas.detalle.ultima_sesion.nino} - {formatearFecha(metricas.detalle.ultima_sesion.fecha)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Meta mensual */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Meta Mensual
          </h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progreso</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.tendencias.progreso_meta_mensual}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metricas.tendencias.progreso_meta_mensual)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Meta: 12 sesiones por mes
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {metricas.tendencias.progreso_meta_mensual >= 100 ? (
                <>
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">¡Meta alcanzada! 🎉</span>
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 text-crecimiento-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Faltan {12 - metricas.resumen.sesiones_este_mes} sesiones
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA COORDINADOR/PROFESIONAL/TRABAJO SOCIAL
// ==========================================
function MetricasEquipoView({ 
  metricas, 
  rol,
  onRefresh 
}: { 
  metricas: MetricasEquipo; 
  rol: string;
  onRefresh: () => void;
}) {
  const rolLabel = {
    coordinador: 'Coordinador',
    psicopedagogia: 'Profesional',
    trabajo_social: 'Trabajo Social'
  }[rol] || rol;

  const nivelesLabel: Record<string, string> = {
    'pre_alfabetizacion': 'Pre-alfabetización',
    'alfabetizacion_inicial': 'Inicial',
    'alfabetizacion_avanzada': 'Avanzada',
    'consolidacion': 'Consolidación',
    'sin_evaluar': 'Sin evaluar'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Métricas - {rolLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{metricas.zona.nombre}</span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-crecimiento-500 to-crecimiento-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Niños</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_ninos}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Voluntarios</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_voluntarios}</p>
        </div>

        <div className="bg-gradient-to-br from-impulso-400 to-impulso-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Sesiones (Mes)</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.sesiones_este_mes}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Horas (Mes)</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.horas_este_mes}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Cobertura</span>
          </div>
          <p className="text-3xl font-bold">{metricas.atencion.cobertura_porcentaje}%</p>
        </div>
      </div>

      {/* Grid de detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Actividad del equipo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Equipo
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Voluntarios activos</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{metricas.equipo.voluntarios_activos}</span>
                <span className="text-sm text-gray-500">/ {metricas.resumen.total_voluntarios}</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${metricas.equipo.tasa_actividad_voluntarios}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{metricas.equipo.tasa_actividad_voluntarios}% de actividad</p>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Asignaciones activas</span>
                <span className="font-semibold text-gray-900 dark:text-white">{metricas.equipo.asignaciones_activas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Atención a niños */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Baby className="w-5 h-5 text-crecimiento-500" />
            Atención
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Promedio sesiones/niño</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.atencion.promedio_sesiones_por_nino}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sesiones esta semana</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metricas.resumen.sesiones_esta_semana}</span>
            </div>
            
            {metricas.atencion.ninos_sin_sesion_este_mes > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{metricas.atencion.ninos_sin_sesion_este_mes} niños sin sesión este mes</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Distribución */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            Distribución
          </h2>
          
          <div className="space-y-3">
            {Object.entries(metricas.distribucion.por_nivel_alfabetizacion).map(([nivel, cantidad]) => (
              <div key={nivel} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">{nivelesLabel[nivel] || nivel}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{cantidad}</span>
              </div>
            ))}
            
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Escolarizados
                </span>
                <span className="font-semibold">{metricas.distribucion.escolarizados}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="flex items-center gap-1 text-orange-600">
                  <XCircle className="w-4 h-4" />
                  No escolarizados
                </span>
                <span className="font-semibold">{metricas.distribucion.no_escolarizados}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(metricas.alertas.ninos_sin_atencion > 0 || metricas.alertas.voluntarios_inactivos > 0) && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Puntos de Atención
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metricas.alertas.ninos_sin_atencion > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                  <Baby className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-300">{metricas.alertas.ninos_sin_atencion} niños</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">sin sesiones este mes</p>
                </div>
              </div>
            )}
            {metricas.alertas.voluntarios_inactivos > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-300">{metricas.alertas.voluntarios_inactivos} voluntarios</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">inactivos este mes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VISTA ADMIN
// ==========================================
function MetricasAdminView({ 
  metricas, 
  onRefresh 
}: { 
  metricas: MetricasAdmin; 
  onRefresh: () => void;
}) {
  const rolesLabel: Record<string, string> = {
    'admin': 'Administradores',
    'director': 'Directores',
    'coordinador': 'Coordinadores',
    'psicopedagogia': 'Profesional',
    'trabajo_social': 'Trabajo Social',
    'voluntario': 'Voluntarios'
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Métricas Generales
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Vista global de la plataforma APA</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-crecimiento-500 to-crecimiento-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Niños</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_ninos}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Voluntarios</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_voluntarios}</p>
        </div>

        <div className="bg-gradient-to-br from-impulso-400 to-impulso-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Usuarios</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_usuarios}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Zonas</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_zonas}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-80">Sesiones Total</span>
          </div>
          <p className="text-3xl font-bold">{metricas.resumen.total_sesiones}</p>
        </div>
      </div>

      {/* Este mes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-crecimiento-500" />
          Este Mes
          {metricas.tendencias.sesiones_vs_mes_anterior !== 0 && (
            <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${
              metricas.tendencias.sesiones_vs_mes_anterior > 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {metricas.tendencias.sesiones_vs_mes_anterior > 0 ? '+' : ''}
              {metricas.tendencias.sesiones_vs_mes_anterior}% vs mes anterior
            </span>
          )}
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metricas.este_mes.sesiones}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sesiones</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metricas.este_mes.horas}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Horas</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metricas.este_mes.ninos_atendidos}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Niños atendidos</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metricas.este_mes.voluntarios_activos}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Voluntarios activos</p>
          </div>
        </div>
      </div>

      {/* Grid de detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Cobertura */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Cobertura
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Niños atendidos</span>
                <span className="font-semibold text-gray-900 dark:text-white">{metricas.cobertura.ninos_atendidos_porcentaje}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-crecimiento-500 h-2 rounded-full"
                  style={{ width: `${metricas.cobertura.ninos_atendidos_porcentaje}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Voluntarios activos</span>
                <span className="font-semibold text-gray-900 dark:text-white">{metricas.cobertura.voluntarios_activos_porcentaje}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${metricas.cobertura.voluntarios_activos_porcentaje}%` }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Asignaciones activas</span>
                <span className="font-semibold text-gray-900 dark:text-white">{metricas.cobertura.asignaciones_activas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usuarios por rol */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Usuarios por Rol
          </h2>
          
          <div className="space-y-3">
            {Object.entries(metricas.distribucion.usuarios_por_rol).map(([rol, cantidad]) => (
              <div key={rol} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{rolesLabel[rol] || rol}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{cantidad}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-orange-600" />
                <span className="text-gray-700 dark:text-gray-300">Niños sin atención</span>
              </div>
              <span className="font-bold text-orange-600">{metricas.alertas.ninos_sin_atencion}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-600" />
                <span className="text-gray-700 dark:text-gray-300">Voluntarios inactivos</span>
              </div>
              <span className="font-bold text-yellow-600">{metricas.alertas.voluntarios_inactivos}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas por zona */}
      {metricas.distribucion.por_zona.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-500" />
            Por Zona
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Zona</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Niños</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Voluntarios</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Sesiones (Mes)</th>
                </tr>
              </thead>
              <tbody>
                {metricas.distribucion.por_zona.map((zona) => (
                  <tr key={zona.zona_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{zona.nombre}</td>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{zona.ninos}</td>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{zona.voluntarios}</td>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{zona.sesiones_mes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
