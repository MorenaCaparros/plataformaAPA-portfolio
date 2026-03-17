'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Target,
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  ListChecks,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Plan {
  id: string;
  nino_id: string;
  creado_por: string;
  titulo: string;
  descripcion: string | null;
  area: string;
  estado: 'activo' | 'pausado' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  fecha_inicio: string;
  fecha_fin_estimada: string | null;
  fecha_cierre: string | null;
  objetivos: string[];
  actividades_sugeridas: string | null;
  created_at: string;
  updated_at: string;
  nino: { id: string; alias: string; rango_etario: string; fecha_nacimiento: string } | null;
  creador: { id: string; nombre: string; apellido: string; rol: string } | null;
}

interface Comentario {
  id: string;
  plan_id: string;
  autor_id: string;
  contenido: string;
  tipo: 'seguimiento' | 'avance' | 'dificultad' | 'ajuste' | 'cierre';
  created_at: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
    foto_perfil_url: string | null;
  } | null;
}

const AREA_LABELS: Record<string, string> = {
  lenguaje_vocabulario: 'Lenguaje y Vocabulario',
  grafismo_motricidad: 'Grafismo y Motricidad',
  lectura_escritura: 'Lectura y Escritura',
  nociones_matematicas: 'Nociones Matemáticas',
  socioemocional: 'Socioemocional',
  general: 'General',
};

const AREA_COLORS: Record<string, string> = {
  lenguaje_vocabulario: 'bg-blue-100 text-blue-700',
  grafismo_motricidad: 'bg-purple-100 text-purple-700',
  lectura_escritura: 'bg-green-100 text-green-700',
  nociones_matematicas: 'bg-orange-100 text-orange-700',
  socioemocional: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
};

const ESTADO_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  activo: { label: 'Activo', icon: CheckCircle2, color: 'text-crecimiento-600', bg: 'bg-crecimiento-50' },
  pausado: { label: 'Pausado', icon: PauseCircle, color: 'text-sol-600', bg: 'bg-sol-50' },
  completado: { label: 'Completado', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  media: { label: 'Media', color: 'bg-sol-50 text-sol-700' },
  alta: { label: 'Alta', color: 'bg-red-50 text-red-700' },
};

const TIPO_COMENTARIO_CONFIG: Record<string, { label: string; color: string }> = {
  seguimiento: { label: 'Seguimiento', color: 'bg-blue-100 text-blue-700' },
  avance: { label: 'Avance', color: 'bg-crecimiento-50 text-crecimiento-700' },
  dificultad: { label: 'Dificultad', color: 'bg-red-50 text-red-700' },
  ajuste: { label: 'Ajuste', color: 'bg-sol-50 text-sol-700' },
  cierre: { label: 'Cierre', color: 'bg-purple-100 text-purple-700' },
};

const ROL_LABELS: Record<string, string> = {
  psicopedagogia: 'Psicopedagogía',
  director: 'Director/a',
  admin: 'Admin',
  equipo_profesional: 'Equipo Profesional',
  coordinador: 'Coordinador/a',
  voluntario: 'Voluntario/a',
};

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' — ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const { user, perfil } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComentarios, setLoadingComentarios] = useState(true);

  // Comment form
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [tipoComentario, setTipoComentario] = useState<string>('seguimiento');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Estado change
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);

  const commentEndRef = useRef<HTMLDivElement>(null);

  const canEdit = perfil && ['psicopedagogia', 'director', 'admin', 'equipo_profesional'].includes(perfil.rol);
  const canComment = perfil && ['psicopedagogia', 'director', 'admin', 'equipo_profesional', 'coordinador'].includes(perfil.rol);

  useEffect(() => {
    if (planId) {
      fetchPlan();
      fetchComentarios();
    }
  }, [planId]);

  async function fetchPlan() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planes_intervencion')
        .select(`
          *,
          nino:ninos!planes_intervencion_nino_id_fkey(id, alias, rango_etario, fecha_nacimiento),
          creador:perfiles!planes_intervencion_creado_por_fkey(id, nombre, apellido, rol)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      setPlan(data as any);
    } catch (error) {
      console.error('Error al cargar plan:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComentarios() {
    try {
      setLoadingComentarios(true);
      const { data, error } = await supabase
        .from('comentarios_intervencion')
        .select(`
          *,
          autor:perfiles!comentarios_intervencion_autor_id_fkey(id, nombre, apellido, rol, foto_perfil_url)
        `)
        .eq('plan_id', planId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComentarios((data as any) || []);
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    } finally {
      setLoadingComentarios(false);
    }
  }

  async function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoComentario.trim() || !user) return;

    try {
      setEnviandoComentario(true);
      const { data, error } = await supabase
        .from('comentarios_intervencion')
        .insert({
          plan_id: planId,
          autor_id: user.id,
          contenido: nuevoComentario.trim(),
          tipo: tipoComentario,
        })
        .select(`
          *,
          autor:perfiles!comentarios_intervencion_autor_id_fkey(id, nombre, apellido, rol, foto_perfil_url)
        `)
        .single();

      if (error) throw error;

      setComentarios((prev) => [...prev, data as any]);
      setNuevoComentario('');
      setTipoComentario('seguimiento');

      // Scroll to bottom
      setTimeout(() => {
        commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error al enviar comentario:', err);
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function eliminarComentario(commentId: string) {
    if (!confirm('¿Eliminar este comentario?')) return;
    try {
      const { error } = await supabase
        .from('comentarios_intervencion')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComentarios((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  }

  async function cambiarEstado(nuevoEstado: string) {
    if (!plan) return;
    try {
      setCambiandoEstado(true);
      setShowEstadoMenu(false);

      const updates: any = { estado: nuevoEstado, updated_at: new Date().toISOString() };
      if (nuevoEstado === 'completado' || nuevoEstado === 'cancelado') {
        updates.fecha_cierre = new Date().toISOString().split('T')[0];
      }
      if (nuevoEstado === 'activo' && plan.fecha_cierre) {
        updates.fecha_cierre = null;
      }

      const { error } = await supabase
        .from('planes_intervencion')
        .update(updates)
        .eq('id', plan.id);

      if (error) throw error;

      setPlan((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    } finally {
      setCambiandoEstado(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-impulso-400" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
        <div className="max-w-3xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-quicksand text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Plan no encontrado
          </h3>
          <Link
            href="/dashboard/psicopedagogia/planes"
            className="inline-flex items-center gap-2 text-impulso-500 hover:text-impulso-600 font-medium mt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a planes
          </Link>
        </div>
      </div>
    );
  }

  const estadoConf = ESTADO_CONFIG[plan.estado];
  const EstadoIcon = estadoConf.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/psicopedagogia/planes"
              className="p-2 rounded-xl hover:bg-white/60 transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="font-quicksand text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {plan.titulo}
              </h1>
              <p className="font-outfit text-gray-500 mt-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                {plan.nino?.alias || 'Sin niño'}
                {plan.nino?.rango_etario && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {plan.nino.rango_etario}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Estado badge + dropdown */}
          <div className="relative">
            <button
              onClick={() => canEdit && setShowEstadoMenu(!showEstadoMenu)}
              disabled={cambiandoEstado || !canEdit}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${estadoConf.bg} ${estadoConf.color} transition-colors ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              {cambiandoEstado ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <EstadoIcon className="w-4 h-4" />
              )}
              {estadoConf.label}
              {canEdit && <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showEstadoMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEstadoMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20 min-w-[180px]">
                  {Object.entries(ESTADO_CONFIG)
                    .filter(([key]) => key !== plan.estado)
                    .map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => cambiarEstado(key)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-outfit hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Icon className={`w-4 h-4 ${conf.color}`} />
                          <span>Cambiar a {conf.label}</span>
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Plan details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {plan.descripcion && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-lg">
                <h2 className="font-quicksand text-lg font-semibold text-neutro-carbon mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-impulso-400" />
                  Descripción
                </h2>
                <p className="font-outfit text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {plan.descripcion}
                </p>
              </div>
            )}

            {/* Objectives */}
            {plan.objetivos && plan.objetivos.length > 0 && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-lg">
                <h2 className="font-quicksand text-lg font-semibold text-neutro-carbon mb-3 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-crecimiento-500" />
                  Objetivos
                </h2>
                <ul className="space-y-2">
                  {plan.objetivos.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-3 font-outfit text-sm text-gray-700 dark:text-gray-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-crecimiento-100 text-crecimiento-700 flex items-center justify-center text-xs font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Activities */}
            {plan.actividades_sugeridas && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-lg">
                <h2 className="font-quicksand text-lg font-semibold text-neutro-carbon mb-3 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-sol-500" />
                  Actividades sugeridas
                </h2>
                <p className="font-outfit text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm">
                  {plan.actividades_sugeridas}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-lg">
              <h3 className="font-quicksand text-sm font-semibold text-neutro-carbon mb-4 uppercase tracking-wide">
                Detalles
              </h3>
              <div className="space-y-4 font-outfit text-sm">
                <div>
                  <p className="text-neutro-piedra mb-1">Área</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${AREA_COLORS[plan.area]}`}>
                    {AREA_LABELS[plan.area]}
                  </span>
                </div>
                <div>
                  <p className="text-neutro-piedra mb-1">Prioridad</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${PRIORIDAD_CONFIG[plan.prioridad].color}`}>
                    {PRIORIDAD_CONFIG[plan.prioridad].label}
                  </span>
                </div>
                <div>
                  <p className="text-neutro-piedra mb-1">Fecha de inicio</p>
                  <p className="text-neutro-carbon flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatFecha(plan.fecha_inicio)}
                  </p>
                </div>
                {plan.fecha_fin_estimada && (
                  <div>
                    <p className="text-neutro-piedra mb-1">Fin estimado</p>
                    <p className="text-neutro-carbon flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatFecha(plan.fecha_fin_estimada)}
                    </p>
                  </div>
                )}
                {plan.fecha_cierre && (
                  <div>
                    <p className="text-neutro-piedra mb-1">Fecha de cierre</p>
                    <p className="text-neutro-carbon flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formatFecha(plan.fecha_cierre)}
                    </p>
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <p className="text-neutro-piedra mb-1">Creado por</p>
                  <p className="text-neutro-carbon">
                    {plan.creador
                      ? `${plan.creador.nombre} ${plan.creador.apellido}`
                      : 'Desconocido'}
                  </p>
                  {plan.creador?.rol && (
                    <p className="text-xs text-neutro-piedra mt-0.5">
                      {ROL_LABELS[plan.creador.rol] || plan.creador.rol}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* COMENTARIOS / HISTORIAL DE SEGUIMIENTO    */}
        {/* ========================================= */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-quicksand text-lg font-semibold text-neutro-carbon flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-impulso-400" />
              Historial de Comentarios
              <span className="ml-2 text-sm font-normal text-neutro-piedra">
                ({comentarios.length})
              </span>
            </h2>
            <p className="font-outfit text-sm text-neutro-piedra mt-1">
              Seguimiento, avances y notas del equipo profesional
            </p>
          </div>

          {/* Comments list */}
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {loadingComentarios ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-impulso-400" />
              </div>
            ) : comentarios.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-outfit text-gray-400 text-sm">
                  No hay comentarios aún. Sé el primero en agregar una nota de seguimiento.
                </p>
              </div>
            ) : (
              comentarios.map((c) => {
                const tipoConf = TIPO_COMENTARIO_CONFIG[c.tipo] || TIPO_COMENTARIO_CONFIG.seguimiento;
                const isOwn = c.autor_id === user?.id;
                const canDelete = isOwn || perfil?.rol === 'admin' || perfil?.rol === 'director';

                return (
                  <div
                    key={c.id}
                    className="group relative bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-4 transition-colors hover:bg-gray-100/80"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-impulso-100 flex items-center justify-center text-impulso-600 font-bold text-xs flex-shrink-0">
                          {c.autor?.nombre?.[0]?.toUpperCase() || '?'}
                          {c.autor?.apellido?.[0]?.toUpperCase() || ''}
                        </div>
                        <div>
                          <p className="font-outfit text-sm font-semibold text-neutro-carbon">
                            {c.autor
                              ? `${c.autor.nombre} ${c.autor.apellido}`
                              : 'Usuario desconocido'}
                          </p>
                          <div className="flex items-center gap-2">
                            {c.autor?.rol && (
                              <span className="text-xs text-neutro-piedra">
                                {ROL_LABELS[c.autor.rol] || c.autor.rol}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">
                              {formatFechaHora(c.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoConf.color}`}>
                          {tipoConf.label}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => eliminarComentario(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                            title="Eliminar comentario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="font-outfit text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-10">
                      {c.contenido}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={commentEndRef} />
          </div>

          {/* Comment form */}
          {canComment && (
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              <form onSubmit={enviarComentario} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <label className="font-outfit text-sm font-medium text-gray-600">Tipo:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(TIPO_COMENTARIO_CONFIG).map(([key, conf]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipoComentario(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[32px] ${
                          tipoComentario === key
                            ? conf.color + ' ring-2 ring-offset-1 ring-gray-300'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {conf.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Escribí una nota de seguimiento, avance o dificultad..."
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 font-outfit text-sm focus:ring-2 focus:ring-impulso-400 focus:border-transparent resize-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={enviandoComentario || !nuevoComentario.trim()}
                    className="self-end px-4 py-3 bg-impulso-400 hover:bg-impulso-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {enviandoComentario ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
