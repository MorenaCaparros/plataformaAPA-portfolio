'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import {
  ArrowLeft, User, Star, AlertTriangle, CheckCircle2,
  BookOpen, Clock, Users, Award, TrendingUp, Calendar,
  ChevronDown, ChevronUp,
} from 'lucide-react';

function getDriveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('drive.google.com/thumbnail')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w800`;
  return url;
}

interface PerfilVoluntario {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  email: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  foto_perfil_url: string | null;
  max_ninos_asignados: number;
  horas_disponibles: number | null;
  activo: boolean;
  ultima_conexion: string | null;
  zona: { id: string; nombre: string } | null;
}

interface ScoreArea {
  area: string;
  score_autoevaluacion: number;
  score_capacitaciones: number;
  score_final: number;
  necesita_capacitacion: boolean;
  fecha_ultima_evaluacion: string | null;
}

interface ResultadoAutoeval {
  id: string;
  capacitacion_id: string;
  estado: string;
  puntaje_final: number;
  puntaje_maximo: number;
  porcentaje: number;
  fecha_completado: string | null;
  capacitacion: {
    nombre: string;
    area: string;
    tipo: string;
  };
}

interface RespuestaIndividual {
  id: string;
  pregunta_id: string;
  respuesta: string;
  es_correcta: boolean | null;
  puntaje_obtenido: number;
  pregunta?: {
    pregunta: string;
    tipo_pregunta: string;
    respuesta_correcta: string;
    puntaje: number;
  };
}

interface EstudioPerfil {
  id: string;
  titulo: string;
  institucion: string | null;
  nivel: string | null;
  estado: string | null;
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

const AREA_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  lenguaje: { bg: 'bg-impulso-50', text: 'text-impulso-700', gradient: 'from-impulso-400 to-impulso-500' },
  lenguaje_vocabulario: { bg: 'bg-impulso-50', text: 'text-impulso-700', gradient: 'from-impulso-400 to-impulso-500' },
  grafismo: { bg: 'bg-crecimiento-50', text: 'text-crecimiento-700', gradient: 'from-crecimiento-400 to-crecimiento-500' },
  grafismo_motricidad: { bg: 'bg-crecimiento-50', text: 'text-crecimiento-700', gradient: 'from-crecimiento-400 to-crecimiento-500' },
  lectura_escritura: { bg: 'bg-sol-50', text: 'text-sol-700', gradient: 'from-sol-400 to-sol-500' },
  nociones_matematicas: { bg: 'bg-orange-50', text: 'text-orange-700', gradient: 'from-orange-400 to-orange-500' },
  matematicas: { bg: 'bg-orange-50', text: 'text-orange-700', gradient: 'from-orange-400 to-orange-500' },
};

export default function PerfilVoluntarioPage() {
  const params = useParams();
  const router = useRouter();
  const { perfil: miPerfil } = useAuth();
  const userId = params.id as string;

  const [voluntario, setVoluntario] = useState<PerfilVoluntario | null>(null);
  const [scores, setScores] = useState<ScoreArea[]>([]);
  const [resultados, setResultados] = useState<ResultadoAutoeval[]>([]);
  const [estudios, setEstudios] = useState<EstudioPerfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAutoeval, setExpandedAutoeval] = useState<string | null>(null);
  const [respuestasDetalle, setRespuestasDetalle] = useState<Record<string, RespuestaIndividual[]>>({});
  const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null);

  const rolesPermitidos = ['director', 'admin', 'psicopedagogia', 'coordinador', 'trabajador_social', 'equipo_profesional'];
  const tienePermiso = miPerfil?.rol ? rolesPermitidos.includes(miPerfil.rol) || miPerfil.id === userId : false;

  useEffect(() => {
    if (!tienePermiso && miPerfil) {
      router.push('/dashboard');
      return;
    }
    if (userId) fetchData();
  }, [userId, miPerfil, tienePermiso]);

  async function fetchData() {
    try {
      // 1. Load profile
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('*, zonas:zona_id(id, nombre)')
        .eq('id', userId)
        .single();

      if (perfilError) throw perfilError;

      setVoluntario({
        id: perfilData.id,
        nombre: perfilData.nombre,
        apellido: perfilData.apellido,
        rol: perfilData.rol,
        email: perfilData.email,
        telefono: perfilData.telefono,
        fecha_nacimiento: perfilData.fecha_nacimiento,
        fecha_ingreso: perfilData.fecha_ingreso,
        foto_perfil_url: perfilData.foto_perfil_url,
        max_ninos_asignados: perfilData.max_ninos_asignados ?? 3,
        horas_disponibles: perfilData.horas_disponibles ?? null,
        activo: perfilData.activo,
        ultima_conexion: perfilData.ultima_conexion,
        zona: perfilData.zonas || null,
      });

      // 2. Load scores per area
      const { data: scoresData } = await supabase
        .from('scores_voluntarios_por_area')
        .select('*')
        .eq('voluntario_id', userId)
        .order('area');

      setScores(scoresData || []);

      // 3. Load autoevaluation results
      const { data: resultadosData } = await supabase
        .from('voluntarios_capacitaciones')
        .select(`
          *,
          capacitacion:capacitaciones(nombre, area, tipo)
        `)
        .eq('voluntario_id', userId)
        .order('fecha_completado', { ascending: false });

      setResultados(resultadosData || []);

      // 4. Load studies
      const { data: estudiosData } = await supabase
        .from('estudios_perfiles')
        .select('*')
        .eq('perfil_id', userId)
        .order('fecha_inicio', { ascending: false });

      setEstudios(estudiosData || []);

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleDetalle(autoevalId: string, capacitacionId: string) {
    if (expandedAutoeval === autoevalId) {
      setExpandedAutoeval(null);
      return;
    }
    setExpandedAutoeval(autoevalId);

    // Already fetched
    if (respuestasDetalle[autoevalId]) return;

    setLoadingDetalle(autoevalId);
    try {
      const { data, error } = await supabase
        .from('respuestas_capacitaciones')
        .select(`
          id,
          pregunta_id,
          respuesta,
          es_correcta,
          puntaje_obtenido,
          pregunta:preguntas_capacitacion(pregunta, tipo_pregunta, respuesta_correcta, puntaje)
        `)
        .eq('voluntario_capacitacion_id', autoevalId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const respuestas: RespuestaIndividual[] = (data || []).map((r: any) => ({
        id: r.id,
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        es_correcta: r.es_correcta,
        puntaje_obtenido: r.puntaje_obtenido ?? 0,
        pregunta: r.pregunta ? {
          pregunta: r.pregunta.pregunta,
          tipo_pregunta: r.pregunta.tipo_pregunta,
          respuesta_correcta: r.pregunta.respuesta_correcta,
          puntaje: r.pregunta.puntaje,
        } : undefined,
      }));

      setRespuestasDetalle(prev => ({ ...prev, [autoevalId]: respuestas }));
    } catch (err) {
      console.error('Error loading response details:', err);
    } finally {
      setLoadingDetalle(null);
    }
  }

  const necesitaCapacitacion = scores.some(s => s.necesita_capacitacion);
  const autoevaluaciones = resultados.filter(r => r.capacitacion?.tipo === 'autoevaluacion');
  const capacitaciones = resultados.filter(r => r.capacitacion?.tipo === 'capacitacion');

  const formatFecha = (f: string | null) => {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const rolLabels: Record<string, string> = {
    voluntario: 'Voluntario',
    equipo_profesional: 'Equipo Profesional',
    director: 'Director',
    coordinador: 'Coordinador',
    psicopedagogia: 'Profesional',
    trabajador_social: 'Trabajador Social',
    admin: 'Admin',
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobada':
        return { label: 'Aprobada', color: 'bg-crecimiento-100 text-crecimiento-700' };
      case 'reprobada':
        return { label: 'Reprobada', color: 'bg-red-100 text-red-700' };
      case 'completada':
        return { label: 'En revisión', color: 'bg-sol-100 text-sol-700' };
      case 'en_progreso':
        return { label: 'En progreso', color: 'bg-blue-100 text-blue-700' };
      case 'pendiente':
        return { label: 'Pendiente', color: 'bg-gray-100 text-gray-700' };
      default:
        return { label: estado, color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!voluntario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 text-center">
          <p className="text-neutro-carbon font-outfit text-lg mb-4">Usuario no encontrado</p>
          <Link href="/dashboard/usuarios" className="text-crecimiento-500 hover:underline font-outfit">
            Volver a usuarios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/usuarios" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Usuarios</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Perfil de {voluntario.nombre}
              </h1>
              <div className="w-16"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Training Required Banner */}
        {voluntario.rol === 'voluntario' && necesitaCapacitacion && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl p-5 flex items-start gap-4 shadow-[0_4px_16px_rgba(245,158,11,0.1)]">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-quicksand font-bold text-amber-900 mb-1">Capacitaciones sugeridas</h3>
              <p className="text-sm text-amber-700 font-outfit">
                Este voluntario no obtuvo puntaje perfecto en todas las áreas de autoevaluación. Se sugieren capacitaciones
                opcionales en las siguientes áreas para mejorar sus habilidades.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {scores.filter(s => s.necesita_capacitacion).map(s => (
                  <span key={s.area} className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200/60">
                    {AREA_LABELS[s.area] || s.area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {voluntario.foto_perfil_url ? (
                <img
                  src={getDriveImageUrl(voluntario.foto_perfil_url) || voluntario.foto_perfil_url}
                  alt={voluntario.nombre}
                  className="w-24 h-24 rounded-3xl object-cover border-2 border-white shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center border-2 border-white shadow-lg">
                  <span className="text-white font-quicksand font-bold text-4xl">
                    {(voluntario.nombre[0] || '?').toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-neutro-carbon font-quicksand">
                  {voluntario.nombre} {voluntario.apellido}
                </h2>
                {voluntario.activo ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-crecimiento-100 text-crecimiento-700">
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-100 text-red-700">
                    Inactivo
                  </span>
                )}
              </div>
              <p className="text-neutro-piedra font-outfit mb-3">
                {rolLabels[voluntario.rol] || voluntario.rol}
                {voluntario.zona && ` · ${voluntario.zona.nombre}`}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-neutro-piedra font-outfit">
                {voluntario.email && (
                  <span className="flex items-center gap-1.5">📧 {voluntario.email}</span>
                )}
                {voluntario.telefono && (
                  <span className="flex items-center gap-1.5">📱 {voluntario.telefono}</span>
                )}
                {voluntario.fecha_ingreso && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Ingresó {formatFecha(voluntario.fecha_ingreso)}
                  </span>
                )}
                {voluntario.ultima_conexion && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Última conexión: {formatFecha(voluntario.ultima_conexion)}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {voluntario.rol === 'voluntario' && (
              <div className="flex gap-3 flex-shrink-0">
                <div className="bg-impulso-50 rounded-2xl p-4 text-center border border-impulso-200/30 min-w-[80px]">
                  <Users className="w-5 h-5 text-impulso-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-impulso-700 font-quicksand">{voluntario.max_ninos_asignados}</p>
                  <p className="text-[10px] text-impulso-600 font-outfit">Máx. niños</p>
                </div>
                {voluntario.horas_disponibles != null && (
                  <div className="bg-crecimiento-50 rounded-2xl p-4 text-center border border-crecimiento-200/30 min-w-[80px]">
                    <Clock className="w-5 h-5 text-crecimiento-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-crecimiento-700 font-quicksand">{voluntario.horas_disponibles}</p>
                    <p className="text-[10px] text-crecimiento-600 font-outfit">Hs/semana</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scores por Área */}
        {voluntario.rol === 'voluntario' && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-crecimiento-500" />
              Habilidades por Área
            </h3>
            <p className="text-sm text-neutro-piedra font-outfit mb-6">
              Nivel de competencia basado en autoevaluaciones y capacitaciones completadas.
            </p>

            {scores.length === 0 ? (
              <div className="text-center py-8 bg-neutro-nube/30 rounded-2xl">
                <Star className="w-8 h-8 text-neutro-piedra/30 mx-auto mb-2" />
                <p className="text-neutro-piedra font-outfit">
                  Sin evaluaciones registradas aún.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {scores.map(score => {
                  const colors = AREA_COLORS[score.area] || { bg: 'bg-gray-50', text: 'text-gray-700', gradient: 'from-gray-400 to-gray-500' };
                  const estrellas = Math.round(score.score_final / 20);
                  const esPerfecto = score.score_final >= 100;

                  return (
                    <div
                      key={score.area}
                      className={`${colors.bg} rounded-2xl p-5 border border-white/60 relative overflow-hidden`}
                    >
                      {esPerfecto && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-5 h-5 text-crecimiento-500" />
                        </div>
                      )}
                      {score.necesita_capacitacion && !esPerfecto && (
                        <div className="absolute top-3 right-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                      )}

                      <p className={`text-sm font-semibold ${colors.text} font-outfit mb-3`}>
                        {AREA_LABELS[score.area] || score.area}
                      </p>

                      {/* Stars */}
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i <= estrellas ? 'text-amarillo-400 fill-amarillo-400' : 'text-neutro-piedra/20'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Bars */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-neutro-piedra font-outfit mb-1">
                            <span>Autoevaluación</span>
                            <span>{score.score_autoevaluacion}%</span>
                          </div>
                          <div className="w-full bg-white/60 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${colors.gradient} h-full rounded-full transition-all`}
                              style={{ width: `${Math.min(score.score_autoevaluacion, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-neutro-piedra font-outfit mb-1">
                            <span>Capacitaciones</span>
                            <span>{score.score_capacitaciones}%</span>
                          </div>
                          <div className="w-full bg-white/60 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${colors.gradient} h-full rounded-full transition-all`}
                              style={{ width: `${Math.min(score.score_capacitaciones, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-neutro-piedra font-outfit">
                          Score final: <strong className={colors.text}>{score.score_final}%</strong>
                        </span>
                        {score.necesita_capacitacion && (
                          <span className="text-xs text-amber-600 font-outfit font-medium">
                            Capacitación sugerida
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Historial de Autoevaluaciones */}
        {voluntario.rol === 'voluntario' && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-sol-500" />
              Historial de Autoevaluaciones
            </h3>

            {autoevaluaciones.length === 0 ? (
              <div className="text-center py-8 bg-neutro-nube/30 rounded-2xl mt-4">
                <BookOpen className="w-8 h-8 text-neutro-piedra/30 mx-auto mb-2" />
                <p className="text-neutro-piedra font-outfit">
                  No ha completado autoevaluaciones aún.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {autoevaluaciones.map(r => {
                  const badge = getEstadoBadge(r.estado);
                  const colors = AREA_COLORS[r.capacitacion?.area || ''] || { bg: 'bg-gray-50', text: 'text-gray-700', gradient: 'from-gray-400 to-gray-500' };
                  const isExpanded = expandedAutoeval === r.id;
                  const detalle = respuestasDetalle[r.id];
                  const isLoadingThis = loadingDetalle === r.id;

                  return (
                    <div key={r.id} className="bg-white/80 rounded-2xl border border-white/60 overflow-hidden">
                      {/* Header row — clickable */}
                      <button
                        onClick={() => toggleDetalle(r.id, r.capacitacion_id)}
                        className="w-full p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 hover:bg-white/90 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-outfit font-semibold text-neutro-carbon truncate">
                            {r.capacitacion?.nombre || 'Autoevaluación'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${colors.bg} ${colors.text}`}>
                              {AREA_LABELS[r.capacitacion?.area || ''] || r.capacitacion?.area || '—'}
                            </span>
                            <span className="text-xs text-neutro-piedra font-outfit">
                              {formatFecha(r.fecha_completado)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold font-quicksand text-neutro-carbon">
                              {r.porcentaje != null ? `${Math.round(r.porcentaje)}%` : '—'}
                            </p>
                            <p className="text-[10px] text-neutro-piedra font-outfit">
                              {r.puntaje_final}/{r.puntaje_maximo || '?'} pts
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-neutro-piedra" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutro-piedra" />
                          )}
                        </div>
                      </button>

                      {/* Expandable detail */}
                      {isExpanded && (
                        <div className="border-t border-white/60 bg-neutro-nube/20 px-4 py-3">
                          {isLoadingThis ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-crecimiento-200 border-t-crecimiento-500"></div>
                              <span className="ml-2 text-sm text-neutro-piedra font-outfit">Cargando respuestas...</span>
                            </div>
                          ) : detalle && detalle.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-neutro-piedra font-outfit mb-2">
                                Detalle de respuestas ({detalle.length})
                              </p>
                              {detalle.map((resp, idx) => {
                                const iconoEstado = resp.es_correcta === true
                                  ? '✅' : resp.es_correcta === false
                                  ? '❌' : '📝';
                                const bgEstado = resp.es_correcta === true
                                  ? 'bg-crecimiento-50 border-crecimiento-200/40'
                                  : resp.es_correcta === false
                                  ? 'bg-red-50 border-red-200/40'
                                  : 'bg-sol-50 border-sol-200/40';

                                return (
                                  <div key={resp.id} className={`rounded-xl p-3 border ${bgEstado}`}>
                                    <div className="flex items-start gap-2">
                                      <span className="text-base flex-shrink-0 mt-0.5">{iconoEstado}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-outfit text-neutro-carbon font-medium">
                                          {idx + 1}. {resp.pregunta?.pregunta || 'Pregunta'}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-outfit text-neutro-piedra">
                                          <span>
                                            <strong>Respuesta:</strong>{' '}
                                            <span className="text-neutro-carbon">{resp.respuesta || '—'}</span>
                                          </span>
                                          {resp.pregunta?.tipo_pregunta !== 'texto_abierto' && resp.pregunta?.respuesta_correcta && (
                                            <span>
                                              <strong>Correcta:</strong>{' '}
                                              <span className="text-crecimiento-700">{resp.pregunta.respuesta_correcta}</span>
                                            </span>
                                          )}
                                          <span>
                                            <strong>Puntaje:</strong>{' '}
                                            {resp.puntaje_obtenido}/{resp.pregunta?.puntaje || '?'}
                                          </span>
                                        </div>
                                        {resp.es_correcta === null && (
                                          <p className="text-[10px] text-sol-700 font-outfit mt-1 italic">
                                            Respuesta de texto — requiere revisión manual
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-neutro-piedra font-outfit text-center py-3">
                              No se encontraron respuestas individuales para esta autoevaluación.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Historial de Capacitaciones */}
        {voluntario.rol === 'voluntario' && capacitaciones.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-crecimiento-500" />
              Capacitaciones Completadas
            </h3>

            <div className="space-y-3">
              {capacitaciones.map(r => {
                const badge = getEstadoBadge(r.estado);
                return (
                  <div key={r.id} className="bg-white/80 rounded-2xl p-4 border border-white/60 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-outfit font-semibold text-neutro-carbon truncate">
                        {r.capacitacion?.nombre || 'Capacitación'}
                      </p>
                      <p className="text-xs text-neutro-piedra font-outfit mt-0.5">
                        {formatFecha(r.fecha_completado)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-lg font-bold font-quicksand text-neutro-carbon">
                        {r.porcentaje != null ? `${Math.round(r.porcentaje)}%` : '—'}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estudios */}
        {estudios.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-4">🎓 Formación Académica</h3>
            <div className="space-y-3">
              {estudios.map(e => (
                <div key={e.id} className="bg-white/80 rounded-2xl p-4 border border-white/60">
                  <p className="font-outfit font-semibold text-neutro-carbon">{e.titulo}</p>
                  {e.institucion && (
                    <p className="text-sm text-neutro-piedra font-outfit">{e.institucion}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {e.nivel && (
                      <span className="text-xs bg-sol-50 text-sol-700 px-2 py-0.5 rounded-lg font-outfit capitalize">
                        {e.nivel}
                      </span>
                    )}
                    {e.estado && (
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-outfit capitalize ${
                        e.estado === 'completo' ? 'bg-crecimiento-50 text-crecimiento-700' :
                        e.estado === 'en_curso' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {e.estado.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {rolesPermitidos.includes(miPerfil?.rol || '') && (
          <div className="flex gap-4">
            <Link
              href={`/dashboard/usuarios/${userId}/editar`}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit min-h-[48px] shadow-[0_4px_16px_rgba(164,198,57,0.15)] active:scale-95 flex items-center justify-center gap-2 text-center"
            >
              ✏️ Editar Usuario
            </Link>
            <Link
              href="/dashboard/usuarios"
              className="flex-1 px-6 py-3 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:bg-white transition-all font-medium font-outfit min-h-[48px] active:scale-95 flex items-center justify-center text-center"
            >
              Volver
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
