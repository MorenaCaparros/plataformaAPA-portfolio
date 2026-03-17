'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ArrowLeft, ClipboardCheck, User, Calendar, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface RespuestaPendiente {
  id: string;
  voluntario_id: string;
  capacitacion_id: string;
  estado: string;
  puntaje_final: number | null;
  puntaje_maximo: number | null;
  porcentaje: number | null;
  fecha_completado: string | null;
  voluntario: {
    nombre: string;
    apellido: string;
    email: string;
  } | null;
  capacitacion: {
    nombre: string;
    area: string;
  } | null;
  total_respuestas: number;
  pendientes_revision: number;
}

export default function RevisarRespuestasPage() {
  const [respuestas, setRespuestas] = useState<RespuestaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'pendientes' | 'todas'>('pendientes');
  const router = useRouter();
  const { perfil } = useAuth();

  const rolesPermitidos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const tienePermiso = perfil?.rol ? rolesPermitidos.includes(perfil.rol) : false;

  useEffect(() => {
    if (!tienePermiso && perfil) {
      router.push('/dashboard/autoevaluaciones');
      return;
    }
    if (perfil) fetchRespuestas();
  }, [perfil, tienePermiso]);

  async function fetchRespuestas() {
    try {
      // Obtener todos los registros completados de autoevaluaciones
      let query = supabase
        .from('voluntarios_capacitaciones')
        .select(`
          id,
          voluntario_id,
          capacitacion_id,
          estado,
          puntaje_final,
          puntaje_maximo,
          porcentaje,
          fecha_completado,
          voluntario:perfiles!voluntarios_capacitaciones_voluntario_id_fkey(nombre, apellido, email),
          capacitacion:capacitaciones(nombre, area, tipo)
        `)
        .not('estado', 'in', '("pendiente","en_progreso")')
        .order('fecha_completado', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar solo autoevaluaciones
      const autoevaluaciones = (data || []).filter(
        (r: any) => r.capacitacion?.tipo === 'autoevaluacion'
      );

      // Para cada una, obtener conteo de respuestas pendientes de revisión
      const respuestasConConteo: RespuestaPendiente[] = [];

      for (const registro of autoevaluaciones) {
        const { data: respData } = await supabase
          .from('respuestas_capacitaciones')
          .select('id, es_correcta')
          .eq('voluntario_capacitacion_id', registro.id);

        const totalResp = respData?.length || 0;
        const pendientes = respData?.filter((r: any) => r.es_correcta === null).length || 0;

        respuestasConConteo.push({
          id: registro.id,
          voluntario_id: registro.voluntario_id,
          capacitacion_id: registro.capacitacion_id,
          estado: registro.estado,
          puntaje_final: registro.puntaje_final,
          puntaje_maximo: registro.puntaje_maximo,
          porcentaje: registro.porcentaje,
          fecha_completado: registro.fecha_completado,
          voluntario: registro.voluntario as any,
          capacitacion: registro.capacitacion as any,
          total_respuestas: totalResp,
          pendientes_revision: pendientes,
        });
      }

      setRespuestas(respuestasConConteo);
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
    } finally {
      setLoading(false);
    }
  }

  const areaLabels: Record<string, string> = {
    lenguaje: 'Lenguaje y Vocabulario',
    grafismo: 'Grafismo y Motricidad Fina',
    lectura_escritura: 'Lectura y Escritura',
    matematicas: 'Nociones Matemáticas',
    mixta: 'Múltiples Áreas',
  };

  const estadoConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    completada: {
      label: 'Pendiente de revisión',
      color: 'bg-amber-50 text-amber-700 border-amber-200/40',
      icon: <Clock className="w-4 h-4" />,
    },
    aprobada: {
      label: 'Aprobada',
      color: 'bg-crecimiento-50 text-crecimiento-700 border-crecimiento-200/40',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    reprobada: {
      label: 'No aprobada',
      color: 'bg-impulso-50 text-impulso-700 border-impulso-200/40',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
  };

  const respuestasFiltradas = filtro === 'pendientes'
    ? respuestas.filter(r => r.estado === 'completada' || r.pendientes_revision > 0)
    : respuestas;

  if (!tienePermiso && perfil) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando respuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/autoevaluaciones/gestionar" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Revisar Respuestas
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFiltro('pendientes')}
            className={`px-5 py-3 min-h-[48px] rounded-2xl font-outfit font-semibold text-sm transition-all active:scale-95 ${
              filtro === 'pendientes'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.25)]'
                : 'bg-white/60 backdrop-blur-md border border-white/60 text-neutro-piedra hover:text-neutro-carbon'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pendientes de revisión
              {respuestas.filter(r => r.estado === 'completada' || r.pendientes_revision > 0).length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  filtro === 'pendientes' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {respuestas.filter(r => r.estado === 'completada' || r.pendientes_revision > 0).length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setFiltro('todas')}
            className={`px-5 py-3 min-h-[48px] rounded-2xl font-outfit font-semibold text-sm transition-all active:scale-95 ${
              filtro === 'todas'
                ? 'bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white shadow-[0_4px_16px_rgba(164,198,57,0.25)]'
                : 'bg-white/60 backdrop-blur-md border border-white/60 text-neutro-piedra hover:text-neutro-carbon'
            }`}
          >
            Todas ({respuestas.length})
          </button>
        </div>

        {/* Lista */}
        {respuestasFiltradas.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-8 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-crecimiento-400/20 to-sol-400/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-crecimiento-500" />
            </div>
            <p className="text-neutro-carbon font-outfit text-lg mb-2">
              {filtro === 'pendientes'
                ? '¡No hay respuestas pendientes de revisión!'
                : 'No hay respuestas de autoevaluación todavía.'}
            </p>
            <p className="text-sm text-neutro-piedra font-outfit">
              {filtro === 'pendientes'
                ? 'Todas las respuestas escritas han sido corregidas.'
                : 'Cuando los voluntarios completen autoevaluaciones, aparecerán acá.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {respuestasFiltradas.map((resp) => {
              const config = estadoConfig[resp.estado] || estadoConfig.completada;

              return (
                <Link
                  key={resp.id}
                  href={`/dashboard/autoevaluaciones/gestionar/revisar/${resp.id}`}
                  className="block group bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 transition-all duration-300 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Voluntario */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-neutro-carbon font-quicksand truncate">
                            {resp.voluntario?.nombre} {resp.voluntario?.apellido}
                          </p>
                          <p className="text-xs text-neutro-piedra font-outfit truncate">
                            {resp.voluntario?.email}
                          </p>
                        </div>
                      </div>

                      {/* Autoevaluación */}
                      <p className="text-sm text-neutro-carbon font-outfit font-medium mb-1">
                        {resp.capacitacion?.nombre}
                      </p>
                      <p className="text-xs text-neutro-piedra font-outfit">
                        {areaLabels[resp.capacitacion?.area || ''] || resp.capacitacion?.area}
                      </p>

                      {/* Fecha */}
                      {resp.fecha_completado && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-neutro-piedra font-outfit">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(resp.fecha_completado).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* Estado badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold font-outfit border ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>

                      {/* Puntaje */}
                      {resp.porcentaje !== null && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-neutro-carbon font-quicksand">
                            {resp.porcentaje}%
                          </p>
                          <p className="text-xs text-neutro-piedra font-outfit">
                            {resp.puntaje_final ?? 0}/{resp.puntaje_maximo ?? 10}
                          </p>
                        </div>
                      )}

                      {/* Pendientes */}
                      {resp.pendientes_revision > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold font-outfit">
                          <AlertTriangle className="w-3 h-3" />
                          {resp.pendientes_revision} sin corregir
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
