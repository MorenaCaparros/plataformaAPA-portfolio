'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Visita = {
  id: string;
  nino_id: string;
  nino_nombre: string;
  fecha: string;
  tipo: 'domiciliaria' | 'escolar' | 'telefonica';
  duracion_minutos: number;
  objetivo: string;
  observaciones: string;
  situacion_actual: string;
  cambios_identificados: string;
  acciones_realizadas: string;
  proximos_pasos: string;
  personas_presentes: string[];
  prioridad_seguimiento: 'baja' | 'media' | 'alta';
};

export default function SeguimientoPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'domiciliaria' | 'escolar' | 'telefonica'>('todas');
  const [ordenamiento, setOrdenamiento] = useState<'recientes' | 'antiguas'>('recientes');

  useEffect(() => {
    if (perfil && perfil.rol !== 'trabajador_social') {
      router.push('/dashboard');
      return;
    }

    if (perfil?.rol === 'trabajador_social') {
      fetchVisitas();
    }
  }, [perfil, router]);

  const fetchVisitas = async () => {
    try {
      // Simulación de datos
      const visitasMock: Visita[] = [
        {
          id: '1',
          nino_id: '1',
          nino_nombre: 'Juan Pérez',
          fecha: '2026-01-03',
          tipo: 'domiciliaria',
          duracion_minutos: 60,
          objetivo: 'Verificar condiciones de vivienda y alimentación',
          observaciones: 'Familia colaborativa, vivienda en condiciones regulares',
          situacion_actual: 'Estable, padre con trabajo informal',
          cambios_identificados: 'Mejora en alimentación del niño',
          acciones_realizadas: 'Orientación sobre recursos comunitarios disponibles',
          proximos_pasos: 'Seguimiento en 30 días',
          personas_presentes: ['Madre', 'Niño'],
          prioridad_seguimiento: 'media'
        },
        {
          id: '2',
          nino_id: '3',
          nino_nombre: 'Carlos Rodríguez',
          fecha: '2026-01-05',
          tipo: 'escolar',
          duracion_minutos: 30,
          objetivo: 'Reunión con maestra por ausentismo',
          observaciones: 'Ausentismo creciente, problemas familiares',
          situacion_actual: 'Situación familiar compleja, separación de padres',
          cambios_identificados: 'Ausentismo aumentó últimas 2 semanas',
          acciones_realizadas: 'Coordinación con escuela para flexibilidad',
          proximos_pasos: 'Visita domiciliaria urgente',
          personas_presentes: ['Maestra', 'Directora'],
          prioridad_seguimiento: 'alta'
        }
      ];

      setVisitas(visitasMock);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar visitas:', error);
      setLoading(false);
    }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando seguimientos...</p>
        </div>
      </div>
    );
  }

  const visitasFiltradas = visitas
    .filter(v => filtroTipo === 'todas' || v.tipo === filtroTipo)
    .sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return ordenamiento === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
    });

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
            Seguimiento Familiar
          </h1>
          <p className="text-gray-600">
            Timeline de intervenciones y visitas por familia
          </p>
        </div>

        {/* Barra de acciones */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setFiltroTipo('todas')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroTipo === 'todas'
                    ? 'bg-sol-100 text-sol-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroTipo('domiciliaria')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroTipo === 'domiciliaria'
                    ? 'bg-sol-100 text-sol-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏠 Domiciliaria
              </button>
              <button
                onClick={() => setFiltroTipo('escolar')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroTipo === 'escolar'
                    ? 'bg-sol-100 text-sol-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏫 Escolar
              </button>
              <button
                onClick={() => setFiltroTipo('telefonica')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  filtroTipo === 'telefonica'
                    ? 'bg-sol-100 text-sol-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📞 Telefónica
              </button>
            </div>

            <Link
              href="/dashboard/trabajo-social/seguimiento/nuevo"
              className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-center"
            >
              + Nueva Visita
            </Link>
          </div>

          <div className="mt-4 flex justify-end">
            <select
              value={ordenamiento}
              onChange={(e) => setOrdenamiento(e.target.value as 'recientes' | 'antiguas')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="recientes">Más recientes primero</option>
              <option value="antiguas">Más antiguas primero</option>
            </select>
          </div>
        </div>

        {/* Timeline de visitas */}
        {visitasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No hay visitas registradas</p>
            <Link
              href="/dashboard/trabajo-social/seguimiento/nuevo"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Registrar Primera Visita
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {visitasFiltradas.map((visita, index) => (
              <div key={visita.id} className="relative">
                {/* Línea de tiempo */}
                {index < visitasFiltradas.length - 1 && (
                  <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gray-200 -z-10" />
                )}

                <div className="bg-white rounded-lg shadow-sm p-6 relative">
                  {/* Indicador circular */}
                  <div
                    className={`absolute left-0 top-6 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      visita.prioridad_seguimiento === 'alta'
                        ? 'bg-red-100'
                        : visita.prioridad_seguimiento === 'media'
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}
                  >
                    {visita.tipo === 'domiciliaria' && '🏠'}
                    {visita.tipo === 'escolar' && '🏫'}
                    {visita.tipo === 'telefonica' && '📞'}
                  </div>

                  <div className="ml-16">
                    {/* Header de la visita */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {visita.nino_nombre}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(visita.fecha).toLocaleDateString('es-AR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {' • '}
                          {visita.duracion_minutos} minutos
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          visita.prioridad_seguimiento === 'alta'
                            ? 'bg-red-100 text-red-800'
                            : visita.prioridad_seguimiento === 'media'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {visita.prioridad_seguimiento === 'alta' && '⚠️ Alta'}
                        {visita.prioridad_seguimiento === 'media' && '⚡ Media'}
                        {visita.prioridad_seguimiento === 'baja' && '✓ Baja'}
                      </span>
                    </div>

                    {/* Contenido de la visita */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Objetivo
                        </p>
                        <p className="text-sm text-gray-900">{visita.objetivo}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Personas Presentes
                        </p>
                        <p className="text-sm text-gray-900">
                          {visita.personas_presentes.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Situación Actual
                        </p>
                        <p className="text-sm text-gray-700">{visita.situacion_actual}</p>
                      </div>

                      {visita.cambios_identificados && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            Cambios Identificados
                          </p>
                          <p className="text-sm text-gray-700">{visita.cambios_identificados}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Acciones Realizadas
                        </p>
                        <p className="text-sm text-gray-700">{visita.acciones_realizadas}</p>
                      </div>

                      <div className="bg-sol-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-sol-700 uppercase mb-1">
                          Próximos Pasos
                        </p>
                        <p className="text-sm text-sol-900">{visita.proximos_pasos}</p>
                      </div>
                    </div>

                    {visita.observaciones && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Observaciones
                        </p>
                        <p className="text-sm text-gray-600 italic">{visita.observaciones}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
