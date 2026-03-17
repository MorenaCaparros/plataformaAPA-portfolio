'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Alerta = {
  id: string;
  nino_id: string;
  nino_nombre: string;
  tipo: 'ausentismo' | 'contexto_familiar' | 'salud' | 'violencia' | 'otro';
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  fecha_creacion: string;
  fecha_deteccion: string;
  estado: 'activa' | 'en_proceso' | 'resuelta' | 'derivada';
  acciones_tomadas: string;
  responsable: string;
  requiere_derivacion: boolean;
  derivado_a: string;
  fecha_resolucion?: string;
};

export default function AlertasPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activa' | 'en_proceso' | 'resuelta'>('activa');
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | 'baja' | 'media' | 'alta' | 'critica'>('todas');

  useEffect(() => {
    if (perfil && perfil.rol !== 'trabajador_social') {
      router.push('/dashboard');
      return;
    }

    if (perfil?.rol === 'trabajador_social') {
      fetchAlertas();
    }
  }, [perfil, router]);

  const fetchAlertas = async () => {
    try {
      // Simulación de datos
      const alertasMock: Alerta[] = [
        {
          id: '1',
          nino_id: '3',
          nino_nombre: 'Carlos Rodríguez',
          tipo: 'ausentismo',
          descripcion: 'No asiste a la escuela desde hace 2 semanas. La maestra reporta que la familia no responde a llamados.',
          prioridad: 'alta',
          fecha_creacion: '2026-01-05',
          fecha_deteccion: '2026-01-03',
          estado: 'activa',
          acciones_tomadas: 'Se intentó contacto telefónico sin éxito',
          responsable: 'TS María García',
          requiere_derivacion: false,
          derivado_a: ''
        },
        {
          id: '2',
          nino_id: '5',
          nino_nombre: 'Sofía Martínez',
          tipo: 'contexto_familiar',
          descripcion: 'Cambio abrupto en el comportamiento. Familia atraviesa proceso de separación conflictiva.',
          prioridad: 'media',
          fecha_creacion: '2026-01-04',
          fecha_deteccion: '2025-12-28',
          estado: 'en_proceso',
          acciones_tomadas: 'Visita domiciliaria realizada. Coordinación con equipo profesional para apoyo emocional.',
          responsable: 'TS María García',
          requiere_derivacion: true,
          derivado_a: 'Equipo de Profesionales'
        },
        {
          id: '3',
          nino_id: '8',
          nino_nombre: 'Lucas Fernández',
          tipo: 'salud',
          descripcion: 'Problemas de alimentación evidentes. Bajo peso para la edad.',
          prioridad: 'critica',
          fecha_creacion: '2026-01-06',
          fecha_deteccion: '2026-01-05',
          estado: 'activa',
          acciones_tomadas: 'Derivación urgente a centro de salud',
          responsable: 'TS María García',
          requiere_derivacion: true,
          derivado_a: 'Centro de Salud Barrial'
        }
      ];

      setAlertas(alertasMock);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
      setLoading(false);
    }
  };

  const cambiarEstado = (alertaId: string, nuevoEstado: Alerta['estado']) => {
    setAlertas(alertas.map(a => 
      a.id === alertaId 
        ? { ...a, estado: nuevoEstado, ...(nuevoEstado === 'resuelta' ? { fecha_resolucion: new Date().toISOString() } : {}) }
        : a
    ));
  };

  if (!perfil || perfil.rol !== 'trabajador_social') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo trabajadores sociales pueden acceder.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  const alertasFiltradas = alertas
    .filter(a => filtroEstado === 'todas' || a.estado === filtroEstado)
    .filter(a => filtroPrioridad === 'todas' || a.prioridad === filtroPrioridad)
    .sort((a, b) => {
      // Priorizar por: crítica > alta > media > baja
      const prioridadPeso = { critica: 4, alta: 3, media: 2, baja: 1 };
      if (prioridadPeso[a.prioridad] !== prioridadPeso[b.prioridad]) {
        return prioridadPeso[b.prioridad] - prioridadPeso[a.prioridad];
      }
      // Si misma prioridad, ordenar por fecha (más recientes primero)
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

  const getIconoTipo = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'ausentismo': return '📚';
      case 'contexto_familiar': return '👨‍👩‍👧';
      case 'salud': return '🏥';
      case 'violencia': return '🚨';
      default: return '⚠️';
    }
  };

  const getBgColor = (prioridad: Alerta['prioridad']) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-50 border-red-400';
      case 'alta': return 'bg-orange-50 border-orange-300';
      case 'media': return 'bg-yellow-50 border-yellow-300';
      case 'baja': return 'bg-sol-50 border-sol-300';
    }
  };

  const getBadgeColor = (prioridad: Alerta['prioridad']) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-200 text-red-900';
      case 'alta': return 'bg-orange-200 text-orange-900';
      case 'media': return 'bg-yellow-200 text-yellow-900';
      case 'baja': return 'bg-sol-200 text-sol-900';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard/trabajo-social" className="text-gray-600 hover:text-gray-900">
              ← Volver
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚨 Alertas Sociales
          </h1>
          <p className="text-gray-600">
            Gestión de situaciones que requieren atención inmediata
          </p>
        </div>

        {/* Filtros y acciones */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setFiltroEstado('activa')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroEstado === 'activa'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Activas ({alertas.filter(a => a.estado === 'activa').length})
              </button>
              <button
                onClick={() => setFiltroEstado('en_proceso')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroEstado === 'en_proceso'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                En Proceso
              </button>
              <button
                onClick={() => setFiltroEstado('resuelta')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroEstado === 'resuelta'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Resueltas
              </button>
              <button
                onClick={() => setFiltroEstado('todas')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroEstado === 'todas'
                    ? 'bg-sol-100 text-sol-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
            </div>

            <Link
              href="/dashboard/trabajo-social/alertas/nueva"
              className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-center"
            >
              + Nueva Alerta
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as typeof filtroPrioridad)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todas">Todas las prioridades</option>
              <option value="critica">⛔ Crítica</option>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🔵 Baja</option>
            </select>
          </div>
        </div>

        {/* Lista de alertas */}
        {alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">No hay alertas con estos filtros</p>
            <p className="text-gray-400 text-sm">
              {filtroEstado === 'activa' && '✅ ¡Excelente! No hay alertas activas en este momento'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertasFiltradas.map((alerta) => (
              <div
                key={alerta.id}
                className={`rounded-lg border-2 p-6 ${getBgColor(alerta.prioridad)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getIconoTipo(alerta.tipo)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {alerta.nino_nombre}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {alerta.tipo.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getBadgeColor(alerta.prioridad)}`}>
                      {alerta.prioridad === 'critica' && '⛔ CRÍTICA'}
                      {alerta.prioridad === 'alta' && '🔴 ALTA'}
                      {alerta.prioridad === 'media' && '🟡 MEDIA'}
                      {alerta.prioridad === 'baja' && '🔵 BAJA'}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(alerta.fecha_creacion).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Descripción */}
                <div className="mb-4">
                  <p className="text-sm text-gray-900 font-medium mb-2">Descripción:</p>
                  <p className="text-sm text-gray-700">{alerta.descripcion}</p>
                </div>

                {/* Acciones tomadas */}
                {alerta.acciones_tomadas && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-900 font-medium mb-2">Acciones tomadas:</p>
                    <p className="text-sm text-gray-700">{alerta.acciones_tomadas}</p>
                  </div>
                )}

                {/* Derivación */}
                {alerta.requiere_derivacion && (
                  <div className="mb-4 p-3 bg-purple-100 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">
                      📤 Derivado a: {alerta.derivado_a}
                    </p>
                  </div>
                )}

                {/* Footer con acciones */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-300">
                  <p className="text-xs text-gray-600 flex-1">
                    Responsable: {alerta.responsable}
                  </p>
                  
                  {alerta.estado === 'activa' && (
                    <>
                      <button
                        onClick={() => cambiarEstado(alerta.id, 'en_proceso')}
                        className="text-sm px-4 py-1 bg-yellow-200 text-yellow-900 rounded hover:bg-yellow-300 font-medium"
                      >
                        ⏳ Marcar en proceso
                      </button>
                      <button
                        onClick={() => cambiarEstado(alerta.id, 'resuelta')}
                        className="text-sm px-4 py-1 bg-green-200 text-green-900 rounded hover:bg-green-300 font-medium"
                      >
                        ✅ Resolver
                      </button>
                    </>
                  )}

                  {alerta.estado === 'en_proceso' && (
                    <>
                      <button
                        onClick={() => cambiarEstado(alerta.id, 'activa')}
                        className="text-sm px-4 py-1 bg-red-200 text-red-900 rounded hover:bg-red-300 font-medium"
                      >
                        ← Volver a activa
                      </button>
                      <button
                        onClick={() => cambiarEstado(alerta.id, 'resuelta')}
                        className="text-sm px-4 py-1 bg-green-200 text-green-900 rounded hover:bg-green-300 font-medium"
                      >
                        ✅ Resolver
                      </button>
                    </>
                  )}

                  {alerta.estado === 'resuelta' && (
                    <div className="flex-1 text-right">
                      <span className="text-sm text-green-700 font-medium">
                        ✅ Resuelta {alerta.fecha_resolucion && `el ${new Date(alerta.fecha_resolucion).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Banner informativo */}
        <div className="mt-6 bg-sol-50 border border-sol-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-crecimiento-600 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-sol-900">
                Notificaciones automáticas
              </p>
              <p className="text-sm text-sol-700 mt-1">
                Coordinadores y el equipo profesional reciben notificación de alertas de prioridad alta y crítica automáticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
