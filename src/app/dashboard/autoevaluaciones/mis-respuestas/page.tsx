'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Respuesta {
  id: string;
  fecha_completada: string;
  estado: 'completada' | 'en_revision' | 'evaluada';
  puntaje_automatico: number | null;
  puntaje_manual: number | null;
  puntaje_total: number | null;
  comentarios_evaluador?: string;
  plantilla: {
    titulo: string;
    area: string;
  };
}

interface RespuestaAgrupada {
  plantilla: {
    titulo: string;
    area: string;
  };
  respuestas: Respuesta[];
  mejorPuntaje: number;
  ultimoPuntaje: number;
}

export default function MisRespuestasPage() {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [vistaExpandida, setVistaExpandida] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRespuestas();
  }, []);

  async function fetchRespuestas() {
    try {
      const response = await fetch('/api/respuestas-autoevaluacion');
      if (!response.ok) throw new Error('Error al cargar respuestas');
      
      const data = await response.json();
      setRespuestas(data);

      // Default: expand all groups
      const expandedAll: Record<string, boolean> = {};
      const titulos = new Set<string>(data.map((r: Respuesta) => r.plantilla.titulo));
      titulos.forEach(titulo => { expandedAll[titulo] = true; });
      setVistaExpandida(expandedAll);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Agrupar respuestas por plantilla
  const respuestasAgrupadas: RespuestaAgrupada[] = respuestas.reduce((acc, respuesta) => {
    const key = respuesta.plantilla.titulo;
    const existing = acc.find(g => g.plantilla.titulo === key);
    
    const puntaje = respuesta.puntaje_total || respuesta.puntaje_automatico || 0;
    
    if (existing) {
      existing.respuestas.push(respuesta);
      existing.mejorPuntaje = Math.max(existing.mejorPuntaje, puntaje);
      existing.ultimoPuntaje = puntaje; // La primera es la última (orden DESC)
    } else {
      acc.push({
        plantilla: respuesta.plantilla,
        respuestas: [respuesta],
        mejorPuntaje: puntaje,
        ultimoPuntaje: puntaje
      });
    }
    
    return acc;
  }, [] as RespuestaAgrupada[]);

  const toggleExpanded = (titulo: string) => {
    setVistaExpandida(prev => ({
      ...prev,
      [titulo]: !prev[titulo]
    }));
  };

  const estadoLabels = {
    completada: 'Completada',
    en_revision: 'En revisión',
    evaluada: 'Evaluada'
  };

  const estadoColors = {
    completada: 'bg-green-100 text-green-800',
    en_revision: 'bg-yellow-100 text-yellow-800',
    evaluada: 'bg-sol-100 text-sol-700'
  };

  const areaLabels: Record<string, string> = {
    lenguaje: 'Lenguaje y Vocabulario',
    grafismo: 'Grafismo y Motricidad Fina',
    lectura_escritura: 'Lectura y Escritura',
    matematicas: 'Nociones Matemáticas',
    mixta: 'Múltiples Áreas',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando respuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/autoevaluaciones"
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Autoevaluaciones
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Mis Respuestas
        </h1>
        <p className="text-gray-600">
          Aquí podés ver tus autoevaluaciones completadas y su estado.
        </p>
      </div>

      {/* Lista de respuestas agrupadas */}
      {respuestasAgrupadas.length === 0 ? (
        <div className="bg-sol-50 border border-sol-200 rounded-lg p-6 text-center">
          <p className="text-sol-800 mb-4">
            Todavía no completaste ninguna autoevaluación.
          </p>
          <Link
            href="/dashboard/autoevaluaciones"
            className="inline-block px-6 py-2 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium"
          >
            Comenzar Ahora
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {respuestasAgrupadas.map((grupo) => {
            const expanded = vistaExpandida[grupo.plantilla.titulo] || false;
            const veces = grupo.respuestas.length;
            
            return (
              <div
                key={grupo.plantilla.titulo}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header - Resumen */}
                <button
                  onClick={() => toggleExpanded(grupo.plantilla.titulo)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-3 md:mb-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {grupo.plantilla.titulo}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {areaLabels[grupo.plantilla.area] || grupo.plantilla.area}
                      </p>
                      <p className="text-xs text-crecimiento-600 mt-1">
                        Completada {veces} {veces === 1 ? 'vez' : 'veces'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Mejor puntaje */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Mejor</p>
                        <div className="text-2xl font-bold text-green-600">
                          {grupo.mejorPuntaje.toFixed(1)}
                        </div>
                      </div>

                      {/* Último puntaje */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Último</p>
                        <div className="text-2xl font-bold text-crecimiento-600">
                          {grupo.ultimoPuntaje.toFixed(1)}
                        </div>
                      </div>

                      {/* Flecha */}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Historial expandido */}
                {expanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-5">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Historial completo
                    </h4>
                    <div className="space-y-3">
                      {grupo.respuestas.map((respuesta, index) => {
                        const puntaje = respuesta.puntaje_total || respuesta.puntaje_automatico || 0;
                        const esMejor = puntaje === grupo.mejorPuntaje;
                        
                        return (
                          <div
                            key={respuesta.id}
                            className={`bg-white rounded-lg p-4 border ${
                              esMejor ? 'border-green-300 bg-green-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">
                                #{grupo.respuestas.length - index} - {new Date(respuesta.fecha_completada).toLocaleDateString('es-AR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <span
                                className={`text-2xl font-bold ${
                                  esMejor ? 'text-green-600' : 'text-gray-700'
                                }`}
                              >
                                {puntaje.toFixed(1)}
                                {esMejor && <span className="text-sm ml-1">🏆</span>}
                              </span>
                            </div>

                            {respuesta.comentarios_evaluador && (
                              <div className="bg-sol-50 border border-sol-100 rounded-lg p-3 mt-2">
                                <p className="text-xs font-medium text-sol-900 mb-1">
                                  Comentario:
                                </p>
                                <p className="text-sm text-sol-700">{respuesta.comentarios_evaluador}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
