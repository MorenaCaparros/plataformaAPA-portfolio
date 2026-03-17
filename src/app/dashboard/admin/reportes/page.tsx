'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type TipoReporte = 'general' | 'por-barrio' | 'ninos' | 'voluntarios' | 'sesiones';
type Formato = 'pdf' | 'excel' | 'csv';

export default function ReportesPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('general');
  const [formato, setFormato] = useState<Formato>('pdf');
  const [generando, setGenerando] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [barrioSeleccionado, setBarrioSeleccionado] = useState('todos');

  useEffect(() => {
    if (perfil && perfil.rol !== 'director') {
      router.push('/dashboard');
      return;
    }

    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    setFechaHasta(hoy.toISOString().split('T')[0]);
    setFechaDesde(haceUnMes.toISOString().split('T')[0]);
  }, [perfil, router]);

  const handleGenerar = async () => {
    if (!fechaDesde || !fechaHasta) {
      alert('⚠️ Selecciona el rango de fechas');
      return;
    }

    try {
      setGenerando(true);

      // Simular generación (en producción llamaría a una API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const nombreArchivo = `reporte_${tipoReporte}_${new Date().getTime()}.${formato}`;
      
      alert(`✅ Reporte generado: ${nombreArchivo}\n\n(En producción se descargaría automáticamente)`);

    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('❌ Error al generar reporte');
    } finally {
      setGenerando(false);
    }
  };

  if (!perfil || perfil.rol !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo directores pueden acceder a esta página.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard/admin" className="text-gray-600 hover:text-gray-900">
              ← Volver
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reportes Institucionales
          </h1>
          <p className="text-gray-600">
            Exportar datos para informes anuales, financiadores y análisis
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Tipo de reporte */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Reporte
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => setTipoReporte('general')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  tipoReporte === 'general'
                    ? 'border-crecimiento-500 bg-crecimiento-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-gray-900">General</div>
                <div className="text-xs text-gray-500">Resumen completo del programa</div>
              </button>

              <button
                onClick={() => setTipoReporte('por-barrio')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  tipoReporte === 'por-barrio'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🏘️</div>
                <div className="font-medium text-gray-900">Por Barrio</div>
                <div className="text-xs text-gray-500">Desglosado por zona</div>
              </button>

              <button
                onClick={() => setTipoReporte('ninos')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  tipoReporte === 'ninos'
                    ? 'border-impulso-400 bg-impulso-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">👧🏻</div>
                <div className="font-medium text-gray-900">Niños</div>
                <div className="text-xs text-gray-500">Progreso individual</div>
              </button>

              <button
                onClick={() => setTipoReporte('voluntarios')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  tipoReporte === 'voluntarios'
                    ? 'border-sol-600 bg-sol-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-900">Voluntarios</div>
                <div className="text-xs text-gray-500">Desempeño y actividad</div>
              </button>

              <button
                onClick={() => setTipoReporte('sesiones')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  tipoReporte === 'sesiones'
                    ? 'border-pink-600 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📚</div>
                <div className="font-medium text-gray-900">Sesiones</div>
                <div className="text-xs text-gray-500">Registro detallado</div>
              </button>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Filtro por barrio (si aplica) */}
          {tipoReporte === 'por-barrio' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barrio/Zona
              </label>
              <select
                value={barrioSeleccionado}
                onChange={(e) => setBarrioSeleccionado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
              >
                <option value="todos">Todos los barrios</option>
                <option value="la-herradura">La Herradura</option>
                <option value="las-dalias">Las Dalias</option>
                <option value="parque-palermo">Parque Palermo</option>
                <option value="villa-de-paso">Villa de Paso</option>
              </select>
            </div>
          )}

          {/* Formato de exportación */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormato('pdf')}
                className={`flex-1 p-3 border-2 rounded-lg font-medium transition ${
                  formato === 'pdf'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                📄 PDF
              </button>
              <button
                onClick={() => setFormato('excel')}
                className={`flex-1 p-3 border-2 rounded-lg font-medium transition ${
                  formato === 'excel'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Excel
              </button>
              <button
                onClick={() => setFormato('csv')}
                className={`flex-1 p-3 border-2 rounded-lg font-medium transition ${
                  formato === 'csv'
                    ? 'border-crecimiento-500 bg-crecimiento-50 text-crecimiento-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 CSV
              </button>
            </div>
          </div>

          {/* Botón de generación */}
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="w-full bg-crecimiento-500 text-white py-3 px-6 rounded-lg hover:bg-crecimiento-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {generando ? '⏳ Generando reporte...' : '📥 Generar y Descargar'}
          </button>
        </div>

        {/* Información sobre el contenido */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Contenido del Reporte: {getTipoLabel(tipoReporte)}
          </h2>
          <div className="text-sm text-gray-600 space-y-2">
            {getContenidoReporte(tipoReporte).map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ayuda */}
        <div className="mt-6 bg-sol-50 border-l-4 border-sol-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-sol-800">
                Nota sobre Privacidad
              </h3>
              <p className="text-sm text-sol-700 mt-1">
                Los reportes generados contienen datos sensibles. Utilízalos solo para fines institucionales
                autorizados (informes anuales, rendición a financiadores, análisis interno). No compartas con
                terceros sin anonimizar primero.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTipoLabel(tipo: TipoReporte): string {
  const labels: Record<TipoReporte, string> = {
    general: 'Reporte General del Programa',
    'por-barrio': 'Reporte por Barrio/Zona',
    ninos: 'Reporte de Niños',
    voluntarios: 'Reporte de Voluntarios',
    sesiones: 'Reporte de Sesiones',
  };
  return labels[tipo];
}

function getContenidoReporte(tipo: TipoReporte): string[] {
  const contenidos: Record<TipoReporte, string[]> = {
    general: [
      'Total de niños activos y graduados',
      'Estadísticas de asistencia general',
      'Total de sesiones realizadas en el período',
      'Cantidad de voluntarios activos por rol',
      'Progreso promedio por área (lectura, escritura, matemáticas)',
      'Niños con objetivos cumplidos vs pendientes',
      'Gráficos de tendencias mensuales',
      'Resumen ejecutivo con IA',
    ],
    'por-barrio': [
      'Desglose de métricas por barrio/zona seleccionada',
      'Coordinador responsable de cada zona',
      'Total de niños por barrio',
      'Asistencia promedio por barrio',
      'Voluntarios activos en cada zona',
      'Progreso comparativo entre barrios',
      'Sesiones realizadas por barrio',
      'Materiales utilizados por sede',
    ],
    ninos: [
      'Lista completa de niños (con datos de acceso según permisos)',
      'Edad, rango etario y nivel de alfabetización',
      'Fecha de ingreso y tiempo en el programa',
      'Total de sesiones recibidas',
      'Progreso en cada área evaluada',
      'Objetivos cumplidos y pendientes',
      'Alertas activas (si las hay)',
      'Última evaluación registrada',
    ],
    voluntarios: [
      'Lista de voluntarios con rol y zona asignada',
      'Cantidad de niños asignados por voluntario',
      'Total de sesiones registradas por voluntario',
      'Frecuencia de registro (sesiones/mes)',
      'Capacitaciones realizadas',
      'Fecha de último registro',
      'Promedio de duración de sesiones',
      'Feedback recibido de coordinadores',
    ],
    sesiones: [
      'Registro detallado de todas las sesiones del período',
      'Fecha, duración y voluntario responsable',
      'Niño participante y objetivos trabajados',
      'Actividades realizadas',
      'Observaciones de conducta y atención',
      'Dificultades detectadas',
      'Materiales utilizados',
      'Análisis de patrones con IA (si aplica)',
    ],
  };
  return contenidos[tipo];
}
