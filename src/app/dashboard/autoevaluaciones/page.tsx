'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';

interface Plantilla {
  id: string;
  titulo: string;
  area: string;
  descripcion: string;
  preguntas: any[];
}

interface RespuestaResumen {
  id: string;
  plantilla_id: string;
  puntaje_total: number | null;
  puntaje_automatico: number | null;
  fecha_completada: string;
  estado: string; // 'completada' | 'aprobada' | 'reprobada'
}

export default function AutoevaluacionesPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [respuestas, setRespuestas] = useState<RespuestaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const router = useRouter();
  const { perfil } = useAuth();

  // Roles que pueden gestionar plantillas (no deben completar autoevaluaciones)
  const rolesAdministrativos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const puedeGestionarPlantillas = perfil?.rol ? rolesAdministrativos.includes(perfil.rol) : false;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Load capacitaciones of type 'autoevaluacion' (replaces plantillas_autoevaluacion)
      const plantillasRes = await supabase
        .from('capacitaciones')
        .select(`
          *,
          preguntas:preguntas_capacitacion(id, orden, pregunta, tipo_pregunta, puntaje)
        `)
        .eq('tipo', 'autoevaluacion')
        .eq('activo', true)
        .order('area');

      if (plantillasRes.error) throw plantillasRes.error;
      
      // Map to old plantilla shape
      const mappedPlantillas = (plantillasRes.data || []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        area: c.area,
        descripcion: c.descripcion,
        preguntas: (c.preguntas || []).sort((a: any, b: any) => a.orden - b.orden).map((p: any) => ({
          id: p.id,
          texto: p.pregunta,
          tipo: p.tipo_pregunta,
        })),
      }));
      setPlantillas(mappedPlantillas);

      // Load respuestas if voluntario (replaces respuestas_autoevaluacion)
      if (!puedeGestionarPlantillas) {
        const respuestasRes = await supabase
          .from('voluntarios_capacitaciones')
          .select('id, capacitacion_id, puntaje_obtenido, fecha_completada, estado')
          .eq('voluntario_id', perfil?.id)
          .order('fecha_completada', { ascending: false });

        if (respuestasRes.error) throw respuestasRes.error;
        
        // Map to old respuesta shape
        const mappedRespuestas = (respuestasRes.data || []).map((r: any) => ({
          id: r.id,
          plantilla_id: r.capacitacion_id,
          // porcentaje is 0-100 (e.g. 75), divide by 10 to get 0-10 scale
          puntaje_total: r.puntaje_obtenido ?? null,
          puntaje_automatico: r.puntaje_obtenido ?? null,
          fecha_completada: r.fecha_completada,
          estado: r.estado,
        }));
        setRespuestas(mappedRespuestas);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calcular estadísticas por plantilla
  const getPlantillaStats = (plantillaId: string) => {
    const respuestasPlantilla = respuestas.filter(r => r.plantilla_id === plantillaId);
    if (respuestasPlantilla.length === 0) return null;

    const ultimaRespuesta = respuestasPlantilla[0];
    const puntaje = ultimaRespuesta.puntaje_total || ultimaRespuesta.puntaje_automatico || 0;

    return {
      veces: respuestasPlantilla.length,
      ultimoPuntaje: puntaje,
      ultimaFecha: new Date(ultimaRespuesta.fecha_completada),
      estado: ultimaRespuesta.estado, // 'completada' (pendiente revisión), 'aprobada', 'reprobada'
      pendienteRevision: ultimaRespuesta.estado === 'completada',
    };
  };

  const areaLabels: Record<string, string> = {
    lenguaje: 'Lenguaje y Vocabulario',
    grafismo: 'Grafismo y Motricidad Fina',
    lectura_escritura: 'Lectura y Escritura',
    matematicas: 'Nociones Matemáticas',
    mixta: 'Múltiples Áreas',
  };

  const areaColors: Record<string, string> = {
    lenguaje: 'bg-impulso-50 text-impulso-500',
    grafismo: 'bg-crecimiento-50 text-crecimiento-700',
    lectura_escritura: 'bg-sol-50 text-sol-700',
    matematicas: 'bg-sol-100 text-sol-600',
    mixta: 'bg-neutro-piedra/10 text-neutro-carbon',
  };

  // Áreas presentes en las plantillas cargadas
  const areasPresentes = [...new Set(plantillas.map(p => p.area))];
  const plantillasFiltradas = filtroArea === 'todas' ? plantillas : plantillas.filter(p => p.area === filtroArea);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando autoevaluaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-neutro-carbon font-quicksand">
              {puedeGestionarPlantillas ? 'Plantillas de Autoevaluación' : 'Mis Autoevaluaciones'}
            </h1>
            {puedeGestionarPlantillas ? (
              <div className="flex gap-3">
                <Link
                  href="/dashboard/autoevaluaciones/gestionar/banco-preguntas"
                  className="px-5 py-3 min-h-[48px] bg-white/80 backdrop-blur-sm border border-sol-200/40 text-sol-700 rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-outfit font-semibold active:scale-95 flex items-center gap-2"
                >
                  Banco de Preguntas
                </Link>
                <Link
                  href="/dashboard/autoevaluaciones/gestionar"
                  className="px-6 py-3 min-h-[48px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit font-semibold shadow-[0_4px_16px_rgba(164,198,57,0.15)] active:scale-95 flex items-center gap-2"
                >
                  Gestionar Plantillas
                </Link>
              </div>
            ) : respuestas.length > 0 && (
              <Link
                href="/dashboard/autoevaluaciones/mis-respuestas"
                className="px-5 py-3 min-h-[48px] bg-white/80 backdrop-blur-sm border border-crecimiento-200/40 text-crecimiento-700 rounded-2xl hover:shadow-[0_4px_16px_rgba(164,198,57,0.15)] transition-all font-outfit font-semibold active:scale-95 flex items-center gap-2"
              >
                📊 Ver mis resultados
              </Link>
            )}
          </div>
          <p className="text-neutro-piedra font-outfit text-lg">
            {puedeGestionarPlantillas 
              ? 'Crea y gestiona las plantillas de autoevaluación para los voluntarios.'
              : 'Completá estas autoevaluaciones para que podamos conocer tus habilidades y asignarte niños según tus fortalezas.'}
          </p>
        </div>

        {/* Filtro por área — solo si hay más de un área distinta */}
        {areasPresentes.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroArea('todas')}
              className={`px-4 py-2 min-h-[40px] rounded-2xl text-sm font-outfit font-medium transition-all touch-manipulation border ${
                filtroArea === 'todas'
                  ? 'bg-neutro-carbon text-white border-neutro-carbon shadow-md'
                  : 'bg-white/70 text-neutro-carbon border-white/60 hover:border-neutro-piedra/40'
              }`}
            >
              Todas ({plantillas.length})
            </button>
            {areasPresentes.map(area => (
              <button
                key={area}
                onClick={() => setFiltroArea(area)}
                className={`px-4 py-2 min-h-[40px] rounded-2xl text-sm font-outfit font-medium transition-all touch-manipulation border ${
                  filtroArea === area
                    ? 'bg-neutro-carbon text-white border-neutro-carbon shadow-md'
                    : 'bg-white/70 text-neutro-carbon border-white/60 hover:border-neutro-piedra/40'
                }`}
              >
                {areaLabels[area] || area} ({plantillas.filter(p => p.area === area).length})
              </button>
            ))}
          </div>
        )}

        {/* Grid de plantillas */}
        {plantillasFiltradas.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-8 text-center">
            <p className="text-sol-700 font-outfit">
              {plantillas.length === 0
                ? 'No hay autoevaluaciones disponibles en este momento.'
                : 'No hay autoevaluaciones en esta área.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {plantillasFiltradas.map((plantilla) => {
              const stats = !puedeGestionarPlantillas ? getPlantillaStats(plantilla.id) : null;
              
              return (
                <div
                  key={plantilla.id}
                  className="group bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 text-left transition-all duration-300 shadow-[0_4px_16px_rgba(164,198,57,0.1)] hover:shadow-[0_8px_32px_rgba(164,198,57,0.15)] hover:-translate-y-1"
                >
                  {/* Badge de área */}
                  <span
                    className={`inline-block px-4 py-2 rounded-2xl text-sm font-semibold mb-4 font-outfit border ${
                      plantilla.area === 'lenguaje'          ? 'bg-impulso-50 text-impulso-500 border-impulso-200/30' :
                      plantilla.area === 'grafismo'          ? 'bg-crecimiento-50 text-crecimiento-700 border-crecimiento-200/30' :
                      plantilla.area === 'lectura_escritura' ? 'bg-sol-50 text-sol-700 border-sol-200/30' :
                      plantilla.area === 'matematicas'       ? 'bg-sol-100 text-sol-600 border-sol-200/30' :
                      'bg-neutro-lienzo text-neutro-carbon border-neutro-piedra/30'
                    }`}
                  >
                    {areaLabels[plantilla.area] || plantilla.area}
                  </span>

                  {/* Título */}
                  <h3 className="text-xl font-bold text-neutro-carbon mb-3 font-quicksand">
                    {plantilla.titulo}
                  </h3>

                  {/* Descripción */}
                  <p className="text-sm text-neutro-piedra mb-4 line-clamp-2 font-outfit">
                    {plantilla.descripcion}
                  </p>

                  {/* Estadísticas si ya la completó (solo voluntarios) */}
                  {stats && !puedeGestionarPlantillas && (
                    <div className={`backdrop-blur-sm border rounded-2xl p-4 mb-4 ${
                      stats.pendienteRevision
                        ? 'bg-sol-50/40 border-sol-200/30'
                        : stats.estado === 'aprobada'
                        ? 'bg-crecimiento-50/40 border-crecimiento-200/30'
                        : 'bg-impulso-50/30 border-impulso-200/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium font-outfit ${
                          stats.pendienteRevision ? 'text-sol-700' :
                          stats.estado === 'aprobada' ? 'text-crecimiento-700' : 'text-impulso-700'
                        }`}>
                          {stats.pendienteRevision
                            ? '⏳ Pendiente de revisión manual'
                            : stats.estado === 'aprobada'
                            ? `✅ Aprobada — completaste ${stats.veces} ${stats.veces === 1 ? 'vez' : 'veces'}`
                            : `📝 Completaste ${stats.veces} ${stats.veces === 1 ? 'vez' : 'veces'}`}
                        </span>
                        <span className={`text-2xl font-bold font-quicksand ${
                          stats.pendienteRevision ? 'text-sol-800' :
                          stats.estado === 'aprobada' ? 'text-crecimiento-800' : 'text-impulso-800'
                        }`}>
                          {stats.ultimoPuntaje.toFixed(1)}/10
                        </span>
                      </div>
                      <p className={`text-xs font-outfit ${
                        stats.pendienteRevision ? 'text-sol-600' :
                        stats.estado === 'aprobada' ? 'text-crecimiento-600' : 'text-impulso-600'
                      }`}>
                        {stats.pendienteRevision
                          ? 'El equipo revisará tus respuestas abiertas. Tu puntaje puede aumentar.'
                          : `Última vez: ${stats.ultimaFecha.toLocaleDateString('es-AR')}`}
                      </p>
                    </div>
                  )}

                  {/* Info de plantilla (para roles administrativos) */}
                  {puedeGestionarPlantillas && (
                    <div className="bg-sol-50/40 backdrop-blur-sm border border-sol-200/30 rounded-2xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-sol-700 font-medium font-outfit">
                          Plantilla creada
                        </span>
                        <span className="text-sm font-bold text-sol-800 font-outfit">
                          {plantilla.preguntas?.length || 0} preguntas
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botón de acción */}
                  {puedeGestionarPlantillas ? (
                    <Link
                      href="/dashboard/autoevaluaciones/gestionar"
                      className="block w-full text-center px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon font-medium rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all text-sm font-outfit"
                    >
                      Ver plantillas →
                    </Link>
                  ) : stats?.pendienteRevision ? (
                    // Pendiente revisión manual — puede reiniciar igual (será advertido en la siguiente pantalla)
                    <Link
                      href={`/dashboard/autoevaluaciones/mis-respuestas/completar/${plantilla.id}`}
                      className="w-full flex items-center justify-between text-sm px-4 py-3 bg-sol-50 border border-sol-200/40 text-sol-700 rounded-2xl hover:bg-sol-100 transition-all font-outfit font-semibold active:scale-95"
                    >
                      <span>⏳ Pendiente de revisión</span>
                      <span>Nuevo intento →</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/autoevaluaciones/mis-respuestas/completar/${plantilla.id}`}
                      className="w-full flex items-center justify-between text-sm px-4 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit font-semibold active:scale-95"
                    >
                      <span>{plantilla.preguntas?.length || 0} preguntas</span>
                      <span>
                        {stats ? 'Hacer nuevamente →' : 'Comenzar →'}
                      </span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

