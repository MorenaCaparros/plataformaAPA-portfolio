'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  BarChart3,
  Users,
  MapPin,
  User,
  RefreshCw,
  ChevronRight,
  Target,
  BookOpen,
  Calculator,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Zona {
  id: string;
  nombre: string;
}

interface Nino {
  id: string;
  alias: string;
  zona_id: string | null;
}

interface AnalisisGeneral {
  resumen_ejecutivo: string;
  metricas_clave: {
    niños_atendidos: number;
    tasa_progreso_general: string;
    areas_mas_trabajadas: string[];
    areas_que_necesitan_atencion: string[];
  };
  patrones_identificados: {
    titulo: string;
    descripcion: string;
    impacto: 'alto' | 'medio' | 'bajo';
    ninos_afectados: number;
  }[];
  alertas_tempranas: {
    tipo: string;
    descripcion: string;
    urgencia: 'alta' | 'media' | 'baja';
    accion_sugerida: string;
  }[];
  tendencias: {
    area: string;
    direccion: 'mejorando' | 'estable' | 'declinando';
    detalle: string;
  }[];
  recomendaciones: {
    prioridad: number;
    titulo: string;
    descripcion: string;
    beneficio_esperado: string;
  }[];
  insights_ia: string[];
}

interface AnalisisNino {
  perfil_aprendizaje: {
    estilo_predominante: string;
    fortalezas_cognitivas: string[];
    areas_desafio: string[];
    ritmo_aprendizaje: string;
  };
  progreso_por_area: {
    [key: string]: {
      nivel_actual: number;
      tendencia: string;
      siguiente_meta: string;
    };
  };
  patron_asistencia: string;
  alertas: {
    tipo: string;
    descripcion: string;
    urgencia: 'alta' | 'media' | 'baja';
  }[];
  estrategias_sugeridas: {
    estrategia: string;
    descripcion: string;
    area_objetivo: string;
    frecuencia_sugerida: string;
  }[];
  proximos_pasos: string[];
  mensaje_para_voluntario: string;
}

export default function AnalisisIAPage() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [loading, setLoading] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisGeneral | AnalisisNino | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [tipoAnalisis, setTipoAnalisis] = useState<'general' | 'zona' | 'nino'>('general');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>('');
  const [ninoSeleccionado, setNinoSeleccionado] = useState<string>('');

  useEffect(() => {
    fetchZonas();
    fetchNinos();
  }, []);

  useEffect(() => {
    // Reset selecciones cuando cambia el tipo
    if (tipoAnalisis === 'general') {
      setZonaSeleccionada('');
      setNinoSeleccionado('');
    }
  }, [tipoAnalisis]);

  async function fetchZonas() {
    const { data } = await supabase
      .from('zonas')
      .select('id, nombre')
      .order('nombre');
    setZonas(data || []);
  }

  async function fetchNinos() {
    const { data } = await supabase
      .from('ninos')
      .select('id, alias, zona_id')
      .order('alias');
    setNinos(data || []);
  }

  // Función para normalizar el análisis y asegurar formatos correctos
  function normalizarAnalisisGeneral(data: any): AnalisisGeneral {
    const ensureArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return [val];
      return [];
    };

    return {
      resumen_ejecutivo: data.resumen_ejecutivo || 'Sin resumen disponible',
      metricas_clave: {
        niños_atendidos: data.metricas_clave?.niños_atendidos || data.metricas_clave?.ninos_atendidos || 0,
        tasa_progreso_general: data.metricas_clave?.tasa_progreso_general || '0%',
        areas_mas_trabajadas: ensureArray(data.metricas_clave?.areas_mas_trabajadas),
        areas_que_necesitan_atencion: ensureArray(data.metricas_clave?.areas_que_necesitan_atencion),
      },
      patrones_identificados: Array.isArray(data.patrones_identificados) 
        ? data.patrones_identificados.map((p: any) => ({
            titulo: p.titulo || 'Sin título',
            descripcion: p.descripcion || '',
            impacto: p.impacto || 'medio',
            ninos_afectados: p.ninos_afectados || 0
          }))
        : [],
      alertas_tempranas: Array.isArray(data.alertas_tempranas)
        ? data.alertas_tempranas.map((a: any) => ({
            tipo: a.tipo || 'General',
            descripcion: a.descripcion || '',
            urgencia: a.urgencia || 'media',
            accion_sugerida: a.accion_sugerida || ''
          }))
        : [],
      tendencias: Array.isArray(data.tendencias)
        ? data.tendencias.map((t: any) => ({
            area: t.area || 'General',
            direccion: t.direccion || 'estable',
            detalle: t.detalle || ''
          }))
        : [],
      recomendaciones: Array.isArray(data.recomendaciones)
        ? data.recomendaciones.map((r: any, i: number) => ({
            prioridad: r.prioridad || i + 1,
            titulo: r.titulo || 'Recomendación',
            descripcion: r.descripcion || '',
            beneficio_esperado: r.beneficio_esperado || ''
          }))
        : [],
      insights_ia: ensureArray(data.insights_ia)
    };
  }

  function normalizarAnalisisNino(data: any): AnalisisNino {
    const ensureArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return [val];
      return [];
    };

    return {
      perfil_aprendizaje: {
        estilo_predominante: data.perfil_aprendizaje?.estilo_predominante || 'No determinado',
        fortalezas_cognitivas: ensureArray(data.perfil_aprendizaje?.fortalezas_cognitivas),
        areas_desafio: ensureArray(data.perfil_aprendizaje?.areas_desafio),
        ritmo_aprendizaje: data.perfil_aprendizaje?.ritmo_aprendizaje || 'Regular'
      },
      progreso_por_area: data.progreso_por_area || {},
      patron_asistencia: data.patron_asistencia || 'Sin datos de asistencia',
      alertas: Array.isArray(data.alertas)
        ? data.alertas.map((a: any) => ({
            tipo: a.tipo || 'General',
            descripcion: a.descripcion || '',
            urgencia: a.urgencia || 'media'
          }))
        : [],
      estrategias_sugeridas: Array.isArray(data.estrategias_sugeridas)
        ? data.estrategias_sugeridas.map((e: any) => ({
            estrategia: e.estrategia || '',
            descripcion: e.descripcion || '',
            area_objetivo: e.area_objetivo || 'General',
            frecuencia_sugerida: e.frecuencia_sugerida || ''
          }))
        : [],
      proximos_pasos: ensureArray(data.proximos_pasos),
      mensaje_para_voluntario: data.mensaje_para_voluntario || ''
    };
  }

  async function generarAnalisis() {
    try {
      setLoading(true);
      setError(null);
      setAnalisis(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/ia/analisis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tipo_analisis: tipoAnalisis,
          zona_id: tipoAnalisis === 'zona' ? zonaSeleccionada : undefined,
          nino_id: tipoAnalisis === 'nino' ? ninoSeleccionado : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar análisis');
      }

      const data = await response.json();
      
      // Normalizar según el tipo de análisis
      if (tipoAnalisis === 'general' || tipoAnalisis === 'zona') {
        setAnalisis(normalizarAnalisisGeneral(data));
      } else if (tipoAnalisis === 'nino') {
        setAnalisis(normalizarAnalisisNino(data));
      } else {
        setAnalisis(data);
      }

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al generar análisis');
    } finally {
      setLoading(false);
    }
  }

  const getTendenciaIcon = (direccion: string) => {
    switch (direccion) {
      case 'mejorando':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'declinando':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'media':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-sol-100 text-sol-700 dark:bg-sol-900/30 dark:text-sol-400';
    }
  };

  const getImpactoColor = (impacto: string) => {
    switch (impacto) {
      case 'alto':
        return 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20';
      case 'medio':
        return 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20';
      default:
        return 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20';
    }
  };

  const getAreaIcon = (area: string) => {
    switch (area.toLowerCase()) {
      case 'lectura':
        return <BookOpen className="w-5 h-5" />;
      case 'escritura':
        return <FileText className="w-5 h-5" />;
      case 'matematicas':
        return <Calculator className="w-5 h-5" />;
      case 'lenguaje':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const ninosFiltrados = tipoAnalisis === 'zona' && zonaSeleccionada
    ? ninos.filter(n => n.zona_id === zonaSeleccionada)
    : ninos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-crecimiento-50 via-neutro-lienzo to-sol-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-crecimiento-600 to-crecimiento-700 p-3 rounded-xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Análisis con IA
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Patrones, tendencias y recomendaciones inteligentes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/psicopedagogia"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Panel de Control */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configurar Análisis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tipo de análisis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Análisis
              </label>
              <select
                value={tipoAnalisis}
                onChange={(e) => setTipoAnalisis(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-impulso-300"
              >
                <option value="general">📊 Análisis General</option>
                <option value="zona">📍 Por Zona</option>
                <option value="nino">👤 Por Niño</option>
              </select>
            </div>

            {/* Selector de zona */}
            {(tipoAnalisis === 'zona' || tipoAnalisis === 'nino') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zona
                </label>
                <select
                  value={zonaSeleccionada}
                  onChange={(e) => {
                    setZonaSeleccionada(e.target.value);
                    setNinoSeleccionado('');
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-impulso-300"
                >
                  <option value="">Todas las zonas</option>
                  {zonas.map(zona => (
                    <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de niño */}
            {tipoAnalisis === 'nino' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Niño
                </label>
                <select
                  value={ninoSeleccionado}
                  onChange={(e) => setNinoSeleccionado(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-impulso-300"
                >
                  <option value="">Seleccionar niño</option>
                  {ninosFiltrados.map(nino => (
                    <option key={nino.id} value={nino.id}>{nino.alias}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón generar */}
            <div className="flex items-end">
              <button
                onClick={generarAnalisis}
                disabled={loading || (tipoAnalisis === 'zona' && !zonaSeleccionada) || (tipoAnalisis === 'nino' && !ninoSeleccionado)}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-crecimiento-500 to-crecimiento-700 hover:from-crecimiento-600 hover:to-crecimiento-800 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generar Análisis
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Resultados del Análisis */}
        {analisis && tipoAnalisis === 'general' && (
          <AnalisisGeneralView analisis={analisis as AnalisisGeneral} />
        )}

        {analisis && tipoAnalisis === 'nino' && (
          <AnalisisNinoView 
            analisis={analisis as AnalisisNino} 
            ninoAlias={ninos.find(n => n.id === ninoSeleccionado)?.alias || ''} 
          />
        )}

        {analisis && tipoAnalisis === 'zona' && (
          <AnalisisZonaView analisis={analisis as any} />
        )}

        {/* Estado vacío */}
        {!analisis && !loading && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-crecimiento-100 to-sol-100 dark:from-crecimiento-900/30 dark:to-sol-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Análisis Inteligente del Programa
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              Utiliza inteligencia artificial para identificar patrones, tendencias y generar recomendaciones personalizadas basadas en los datos del programa.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Patrones de progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Alertas tempranas</span>
              </div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                <span>Recomendaciones</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para análisis general
function AnalisisGeneralView({ analisis }: { analisis: AnalisisGeneral }) {
  return (
    <div className="space-y-6">
      {/* Resumen Ejecutivo */}
      <div className="bg-gradient-to-r from-crecimiento-600 to-crecimiento-700 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Resumen Ejecutivo</h3>
            <p className="text-white/90">{analisis.resumen_ejecutivo}</p>
          </div>
        </div>
      </div>

      {/* Métricas Clave */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-crecimiento-100 dark:bg-crecimiento-900/30 p-2 rounded-lg">
              <Users className="w-5 h-5 text-crecimiento-600 dark:text-crecimiento-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Niños Atendidos</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analisis.metricas_clave.niños_atendidos}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Tasa de Progreso</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analisis.metricas_clave.tasa_progreso_general}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Áreas Trabajadas</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analisis.metricas_clave.areas_mas_trabajadas.map((area, i) => (
              <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                {area}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Requieren Atención</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analisis.metricas_clave.areas_que_necesitan_atencion.map((area, i) => (
              <span key={i} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas Tempranas */}
      {analisis.alertas_tempranas && analisis.alertas_tempranas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas Tempranas
          </h3>
          <div className="space-y-3">
            {analisis.alertas_tempranas.map((alerta, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  alerta.urgencia === 'alta' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  alerta.urgencia === 'media' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-sol-100 text-sol-700 dark:bg-sol-900/30 dark:text-sol-400'
                }`}>
                  {alerta.urgencia}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium">{alerta.descripcion}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">Acción:</span> {alerta.accion_sugerida}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patrones y Tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patrones */}
        {analisis.patrones_identificados && analisis.patrones_identificados.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-crecimiento-500" />
              Patrones Identificados
            </h3>
            <div className="space-y-3">
              {analisis.patrones_identificados.map((patron, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  patron.impacto === 'alto' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                  patron.impacto === 'medio' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                  'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{patron.titulo}</h4>
                    <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                      {patron.ninos_afectados} niños
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{patron.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tendencias */}
        {analisis.tendencias && analisis.tendencias.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Tendencias por Área
            </h3>
            <div className="space-y-3">
              {analisis.tendencias.map((tendencia, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`p-2 rounded-lg ${
                    tendencia.direccion === 'mejorando' ? 'bg-green-100 dark:bg-green-900/30' :
                    tendencia.direccion === 'declinando' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    {tendencia.direccion === 'mejorando' ? (
                      <ArrowUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : tendencia.direccion === 'declinando' ? (
                      <ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">{tendencia.area}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tendencia.direccion === 'mejorando' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        tendencia.direccion === 'declinando' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                      }`}>
                        {tendencia.direccion}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tendencia.detalle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recomendaciones */}
      {analisis.recomendaciones && analisis.recomendaciones.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Recomendaciones Priorizadas
          </h3>
          <div className="space-y-4">
            {analisis.recomendaciones.sort((a, b) => a.prioridad - b.prioridad).map((rec, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {rec.prioridad}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{rec.titulo}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.descripcion}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {rec.beneficio_esperado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights de IA */}
      {analisis.insights_ia && analisis.insights_ia.length > 0 && (
        <div className="bg-gradient-to-r from-crecimiento-600 to-crecimiento-700 rounded-2xl shadow-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Insights de IA
          </h3>
          <div className="space-y-3">
            {analisis.insights_ia.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                <span className="text-white/60 font-mono text-sm">{i + 1}.</span>
                <p className="text-white/90">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para análisis de niño individual
function AnalisisNinoView({ analisis, ninoAlias }: { analisis: AnalisisNino; ninoAlias: string }) {
  return (
    <div className="space-y-6">
      {/* Perfil de Aprendizaje */}
      <div className="bg-gradient-to-r from-crecimiento-500 to-crecimiento-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Perfil de Aprendizaje - {ninoAlias}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/70 text-sm">Estilo Predominante</p>
                <p className="font-medium capitalize">{analisis.perfil_aprendizaje.estilo_predominante}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Ritmo de Aprendizaje</p>
                <p className="font-medium capitalize">{analisis.perfil_aprendizaje.ritmo_aprendizaje}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Fortalezas</p>
                <div className="flex flex-wrap gap-1">
                  {analisis.perfil_aprendizaje.fortalezas_cognitivas.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{f}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-1">Áreas de Desafío</p>
                <div className="flex flex-wrap gap-1">
                  {analisis.perfil_aprendizaje.areas_desafio.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso por Área */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-crecimiento-500" />
          Progreso por Área
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(analisis.progreso_por_area).map(([area, datos]) => (
            <div key={area} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {area === 'lectura' && <BookOpen className="w-5 h-5 text-crecimiento-500" />}
                  {area === 'escritura' && <FileText className="w-5 h-5 text-green-500" />}
                  {area === 'matematicas' && <Calculator className="w-5 h-5 text-purple-500" />}
                  {area === 'lenguaje' && <MessageCircle className="w-5 h-5 text-orange-500" />}
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize">{area}</h4>
                </div>
                <div className="flex items-center gap-1">
                  {datos.tendencia === 'mejorando' && <ArrowUp className="w-4 h-4 text-green-500" />}
                  {datos.tendencia === 'declinando' && <ArrowDown className="w-4 h-4 text-red-500" />}
                  {datos.tendencia === 'estable' && <Minus className="w-4 h-4 text-gray-500" />}
                  <span className={`text-xs ${
                    datos.tendencia === 'mejorando' ? 'text-green-600' :
                    datos.tendencia === 'declinando' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {datos.tendencia}
                  </span>
                </div>
              </div>
              
              {/* Barra de nivel */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Nivel actual</span>
                  <span>{datos.nivel_actual}/5</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      datos.nivel_actual >= 4 ? 'bg-green-500' :
                      datos.nivel_actual >= 3 ? 'bg-crecimiento-500' :
                      datos.nivel_actual >= 2 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${(datos.nivel_actual / 5) * 100}%` }}
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Meta:</span> {datos.siguiente_meta}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {analisis.alertas && analisis.alertas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas
          </h3>
          <div className="space-y-3">
            {analisis.alertas.map((alerta, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                alerta.urgencia === 'alta' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                alerta.urgencia === 'media' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                'border-sol-200 bg-sol-50 dark:border-sol-800 dark:bg-sol-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    alerta.urgencia === 'alta' ? 'bg-red-200 text-red-700' :
                    alerta.urgencia === 'media' ? 'bg-yellow-200 text-yellow-700' :
                    'bg-sol-200 text-sol-700'
                  }`}>
                    {alerta.urgencia}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{alerta.tipo}</span>
                </div>
                <p className="text-gray-900 dark:text-white">{alerta.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estrategias Sugeridas */}
      {analisis.estrategias_sugeridas && analisis.estrategias_sugeridas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Estrategias Sugeridas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analisis.estrategias_sugeridas.map((estrategia, i) => (
              <div key={i} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{estrategia.estrategia}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{estrategia.descripcion}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                    📚 {estrategia.area_objetivo}
                  </span>
                  <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                    🕐 {estrategia.frecuencia_sugerida}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos Pasos y Mensaje para Voluntario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Pasos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-crecimiento-500" />
            Próximos Pasos
          </h3>
          <ol className="space-y-3">
            {analisis.proximos_pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-crecimiento-100 dark:bg-crecimiento-900/30 text-crecimiento-600 dark:text-crecimiento-400 rounded-full flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <p className="text-gray-700 dark:text-gray-300">{paso}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Mensaje para Voluntario */}
        <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl shadow-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Mensaje para el Voluntario
          </h3>
          <p className="text-white/90 leading-relaxed">{analisis.mensaje_para_voluntario}</p>
        </div>
      </div>
    </div>
  );
}

// Componente para análisis de zona
function AnalisisZonaView({ analisis }: { analisis: any }) {
  return (
    <div className="space-y-6">
      {/* Resumen de Zona */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Resumen de la Zona</h3>
            <p className="text-white/90">{analisis.resumen_zona}</p>
          </div>
        </div>
      </div>

      {/* Fortalezas y Áreas de Mejora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-green-500" />
            Fortalezas
          </h3>
          <ul className="space-y-2">
            {analisis.fortalezas?.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Áreas de Mejora
          </h3>
          <ul className="space-y-2">
            {analisis.areas_mejora?.map((a: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comparación y Niños */}
      {analisis.comparacion_promedio && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-crecimiento-500" />
            Comparación con el Promedio
          </h3>
          <p className="text-gray-700 dark:text-gray-300">{analisis.comparacion_promedio}</p>
        </div>
      )}

      {/* Niños destacados y con atención prioritaria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analisis.ninos_destacados && analisis.ninos_destacados.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-400 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Niños Destacados
            </h3>
            <div className="flex flex-wrap gap-2">
              {analisis.ninos_destacados.map((alias: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-sm">
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {analisis.ninos_atencion_prioritaria && analisis.ninos_atencion_prioritaria.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Atención Prioritaria
            </h3>
            <div className="flex flex-wrap gap-2">
              {analisis.ninos_atencion_prioritaria.map((alias: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full text-sm">
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recomendaciones Específicas */}
      {analisis.recomendaciones_especificas && analisis.recomendaciones_especificas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Recomendaciones Específicas
          </h3>
          <div className="space-y-4">
            {analisis.recomendaciones_especificas.map((rec: any, i: number) => (
              <div key={i} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">{rec.accion}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rec.razon}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  rec.plazo === 'Inmediato' ? 'bg-red-100 text-red-700' :
                  rec.plazo === 'Corto plazo' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-sol-100 text-sol-700'
                }`}>
                  {rec.plazo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
