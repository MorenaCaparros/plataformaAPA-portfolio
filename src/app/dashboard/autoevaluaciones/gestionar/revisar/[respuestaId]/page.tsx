'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Save, User,
  FileText, Clock, Trophy, Loader2
} from 'lucide-react';

interface RespuestaDetalle {
  id: string;
  pregunta_id: string;
  respuesta: string;
  es_correcta: boolean | null;
  puntaje_obtenido: number;
  pregunta: {
    id: string;
    pregunta: string;
    tipo_pregunta: string;
    puntaje: number;
    respuesta_correcta: string;
    area_especifica: string;
    orden: number;
    opciones: { id: string; orden: number; texto_opcion: string; es_correcta: boolean }[];
  };
}

interface RevisionData {
  id: string;
  estado: string;
  puntaje_final: number | null;
  puntaje_maximo: number | null;
  porcentaje: number | null;
  fecha_completado: string | null;
  capacitacion: {
    id: string;
    nombre: string;
    descripcion: string;
    area: string;
  };
  voluntario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  respuestas: RespuestaDetalle[];
}

interface Correccion {
  respuesta_id: string;
  es_correcta: boolean;
  puntaje_obtenido: number;
}

export default function RevisarDetalleRespuestaPage() {
  const params = useParams();
  const router = useRouter();
  const { perfil } = useAuth();

  const respuestaId = params.respuestaId as string;

  const [data, setData] = useState<RevisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [correcciones, setCorrecciones] = useState<Record<string, Correccion>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [resultadoGuardado, setResultadoGuardado] = useState<{
    puntaje_final: number;
    porcentaje: number;
    estado: string;
  } | null>(null);

  const rolesPermitidos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const tienePermiso = perfil?.rol ? rolesPermitidos.includes(perfil.rol) : false;

  useEffect(() => {
    if (!tienePermiso && perfil) {
      router.push('/dashboard/autoevaluaciones');
      return;
    }
    if (perfil && respuestaId) fetchData();
  }, [perfil, tienePermiso, respuestaId]);

  async function fetchData() {
    try {
      const response = await fetch(`/api/respuestas-autoevaluacion/${respuestaId}/revisar`);
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function marcarCorrecta(resp: RespuestaDetalle, esCorrecta: boolean) {
    const puntajeMax = resp.pregunta?.puntaje || 10;
    setCorrecciones(prev => ({
      ...prev,
      [resp.id]: {
        respuesta_id: resp.id,
        es_correcta: esCorrecta,
        puntaje_obtenido: esCorrecta ? puntajeMax : 0,
      },
    }));
  }

  function setPuntajeParcial(resp: RespuestaDetalle, puntaje: number) {
    const puntajeMax = resp.pregunta?.puntaje || 10;
    const clamped = Math.max(0, Math.min(puntaje, puntajeMax));
    setCorrecciones(prev => ({
      ...prev,
      [resp.id]: {
        respuesta_id: resp.id,
        es_correcta: clamped > 0,
        puntaje_obtenido: clamped,
      },
    }));
  }

  async function guardarCorrecciones() {
    const correccionesArray = Object.values(correcciones);
    if (correccionesArray.length === 0) return;

    setGuardando(true);
    try {
      const response = await fetch(`/api/respuestas-autoevaluacion/${respuestaId}/revisar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcciones: correccionesArray }),
      });

      if (!response.ok) throw new Error('Error al guardar');

      const result = await response.json();
      setResultadoGuardado(result);
      setModalVisible(true);

      // Refresh data
      await fetchData();
      setCorrecciones({});
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setGuardando(false);
    }
  }

  const areaLabels: Record<string, string> = {
    lenguaje: 'Lenguaje y Vocabulario',
    grafismo: 'Grafismo y Motricidad Fina',
    lectura_escritura: 'Lectura y Escritura',
    matematicas: 'Nociones Matemáticas',
    mixta: 'Múltiples Áreas',
  };

  const tipoLabels: Record<string, string> = {
    escala: 'Escala 1-5',
    verdadero_falso: 'Sí / No',
    multiple_choice: 'Selección múltiple',
    texto_libre: 'Texto abierto',
    ordenar_palabras: 'Ordenar palabras',
    respuesta_imagen: 'Respuesta con imagen',
  };

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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-neutro-carbon font-outfit text-lg mb-2">No se encontró la respuesta</p>
          <Link
            href="/dashboard/autoevaluaciones/gestionar/revisar"
            className="text-crecimiento-600 font-outfit font-semibold hover:underline"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const pendientes = data.respuestas.filter(r => r.es_correcta === null && !correcciones[r.id]);
  const correccionesCount = Object.keys(correcciones).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/autoevaluaciones/gestionar/revisar" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-neutro-carbon font-quicksand">
                Revisar Respuestas
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header: info del voluntario y autoevaluación */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-neutro-carbon font-quicksand">
                    {data.voluntario.nombre} {data.voluntario.apellido}
                  </p>
                  <p className="text-xs text-neutro-piedra font-outfit">{data.voluntario.email}</p>
                </div>
              </div>
              <p className="text-base font-semibold text-neutro-carbon font-outfit">
                {data.capacitacion.nombre}
              </p>
              <p className="text-sm text-neutro-piedra font-outfit">
                {areaLabels[data.capacitacion.area] || data.capacitacion.area}
              </p>
              {data.fecha_completado && (
                <p className="text-xs text-neutro-piedra font-outfit mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Completada: {new Date(data.fecha_completado).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <div className="text-center sm:text-right">
              <p className="text-3xl font-bold text-neutro-carbon font-quicksand">
                {data.porcentaje ?? 0}%
              </p>
              <p className="text-sm text-neutro-piedra font-outfit">
                {data.puntaje_final ?? 0}/{data.puntaje_maximo ?? 10} pts
              </p>
              {pendientes.length > 0 && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold font-outfit">
                  <AlertTriangle className="w-3 h-3" />
                  {pendientes.length} sin corregir
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lista de preguntas y respuestas */}
        <div className="space-y-4">
          {data.respuestas.map((resp, index) => {
            const correccion = correcciones[resp.id];
            const esCorrecta = correccion ? correccion.es_correcta : resp.es_correcta;
            const puntajeActual = correccion ? correccion.puntaje_obtenido : resp.puntaje_obtenido;
            const puntajeMax = resp.pregunta?.puntaje || 10;
            const necesitaRevision = resp.es_correcta === null;
            const tipoTextoLibre = resp.pregunta?.tipo_pregunta === 'texto_libre';
            const fueModificada = !!correccion;

            return (
              <div
                key={resp.id}
                className={`bg-white/60 backdrop-blur-md rounded-3xl border p-6 transition-all duration-200 shadow-[0_4px_16px_rgba(242,201,76,0.08)] ${
                  necesitaRevision && !fueModificada
                    ? 'border-amber-300/60 ring-2 ring-amber-200/40'
                    : fueModificada
                      ? 'border-sol-300/60 ring-2 ring-sol-200/40'
                      : 'border-white/60'
                }`}
              >
                {/* Pregunta */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-neutro-carbon/10 flex items-center justify-center text-sm font-bold text-neutro-carbon font-quicksand">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-neutro-carbon font-outfit mb-1">
                      {resp.pregunta?.pregunta}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 rounded-full bg-neutro-carbon/5">
                        {tipoLabels[resp.pregunta?.tipo_pregunta] || resp.pregunta?.tipo_pregunta}
                      </span>
                      {resp.pregunta?.area_especifica && (
                        <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 rounded-full bg-neutro-carbon/5">
                          {areaLabels[resp.pregunta.area_especifica] || resp.pregunta.area_especifica}
                        </span>
                      )}
                      <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 rounded-full bg-neutro-carbon/5">
                        {puntajeMax} pts máx
                      </span>
                    </div>
                  </div>
                </div>

                {/* Respuesta del voluntario */}
                <div className="bg-sol-50/40 rounded-2xl p-4 mb-4 border border-sol-200/30">
                  <p className="text-xs font-semibold text-neutro-piedra font-outfit mb-1 uppercase tracking-wide">
                    Respuesta del voluntario:
                  </p>
                  <p className="text-base text-neutro-carbon font-outfit whitespace-pre-wrap">
                    {resp.respuesta || '(sin respuesta)'}
                  </p>
                </div>

                {/* Respuesta correcta (si existe) */}
                {resp.pregunta?.respuesta_correcta && (
                  <div className="bg-crecimiento-50/40 rounded-2xl p-4 mb-4 border border-crecimiento-200/30">
                    <p className="text-xs font-semibold text-neutro-piedra font-outfit mb-1 uppercase tracking-wide">
                      Respuesta correcta esperada:
                    </p>
                    <p className="text-base text-crecimiento-800 font-outfit">
                      {resp.pregunta.respuesta_correcta}
                    </p>
                  </div>
                )}

                {/* Opciones (para multiple choice) */}
                {resp.pregunta?.opciones && resp.pregunta.opciones.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    <p className="text-xs font-semibold text-neutro-piedra font-outfit uppercase tracking-wide mb-2">
                      Opciones:
                    </p>
                    {resp.pregunta.opciones
                      .sort((a, b) => a.orden - b.orden)
                      .map((op) => (
                        <div
                          key={op.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-outfit ${
                            op.es_correcta
                              ? 'bg-crecimiento-50 text-crecimiento-800 border border-crecimiento-200/40'
                              : resp.respuesta.toLowerCase().trim() === op.texto_opcion.toLowerCase().trim()
                                ? 'bg-impulso-50 text-impulso-800 border border-impulso-200/40'
                                : 'bg-white/40 text-neutro-piedra border border-white/40'
                          }`}
                        >
                          {op.es_correcta && <CheckCircle className="w-4 h-4 text-crecimiento-500 flex-shrink-0" />}
                          {!op.es_correcta && resp.respuesta.toLowerCase().trim() === op.texto_opcion.toLowerCase().trim() && (
                            <XCircle className="w-4 h-4 text-impulso-500 flex-shrink-0" />
                          )}
                          <span>{op.texto_opcion}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Estado actual & controles de corrección */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-neutro-carbon/5">
                  {/* Estado */}
                  <div className="flex items-center gap-2">
                    {esCorrecta === true && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-crecimiento-50 text-crecimiento-700 text-sm font-semibold font-outfit border border-crecimiento-200/40">
                        <CheckCircle className="w-4 h-4" /> Correcta — {puntajeActual}/{puntajeMax} pts
                      </span>
                    )}
                    {esCorrecta === false && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-impulso-50 text-impulso-700 text-sm font-semibold font-outfit border border-impulso-200/40">
                        <XCircle className="w-4 h-4" /> Incorrecta — {puntajeActual}/{puntajeMax} pts
                      </span>
                    )}
                    {esCorrecta === null && !fueModificada && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-amber-50 text-amber-700 text-sm font-semibold font-outfit border border-amber-200/40">
                        <AlertTriangle className="w-4 h-4" /> Pendiente de revisión
                      </span>
                    )}
                    {fueModificada && (
                      <span className="text-xs text-sol-600 font-outfit font-semibold ml-2">
                        ✏️ Modificada
                      </span>
                    )}
                  </div>

                  {/* Botones de corrección */}
                  {(necesitaRevision || tipoTextoLibre) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => marcarCorrecta(resp, true)}
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                          correccion?.es_correcta === true
                            ? 'bg-crecimiento-500 text-white shadow-[0_4px_12px_rgba(164,198,57,0.3)]'
                            : 'bg-crecimiento-50 text-crecimiento-600 hover:bg-crecimiento-100 border border-crecimiento-200/40'
                        }`}
                        title="Marcar como correcta"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => marcarCorrecta(resp, false)}
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                          correccion?.es_correcta === false
                            ? 'bg-impulso-400 text-white shadow-[0_4px_12px_rgba(230,57,70,0.3)]'
                            : 'bg-impulso-50 text-impulso-600 hover:bg-impulso-100 border border-impulso-200/40'
                        }`}
                        title="Marcar como incorrecta"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>

                      {/* Puntaje parcial para texto libre */}
                      {tipoTextoLibre && (
                        <div className="flex items-center gap-1.5 ml-2">
                          <label className="text-xs text-neutro-piedra font-outfit">Pts:</label>
                          <input
                            type="number"
                            min={0}
                            max={puntajeMax}
                            value={correccion?.puntaje_obtenido ?? ''}
                            onChange={(e) => setPuntajeParcial(resp, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1.5 bg-white/80 border border-white/60 rounded-xl text-sm text-neutro-carbon font-outfit text-center focus:ring-2 focus:ring-sol-400 focus:border-transparent"
                            placeholder={`/${puntajeMax}`}
                          />
                          <span className="text-xs text-neutro-piedra font-outfit">/{puntajeMax}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating save bar */}
      {correccionesCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-neutro-carbon font-outfit">
                <span className="font-bold">{correccionesCount}</span> corrección{correccionesCount !== 1 ? 'es' : ''} pendiente{correccionesCount !== 1 ? 's' : ''} de guardar
              </p>
              <button
                onClick={guardarCorrecciones}
                disabled={guardando}
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all font-outfit font-semibold active:scale-95 disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {guardando ? 'Guardando...' : 'Guardar correcciones'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resultado */}
      {modalVisible && resultadoGuardado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.15)] w-full max-w-md p-8 border border-white/60">
            <div className="text-center space-y-5">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                resultadoGuardado.estado === 'aprobada'
                  ? 'bg-gradient-to-br from-crecimiento-400 to-crecimiento-500'
                  : resultadoGuardado.estado === 'reprobada'
                    ? 'bg-gradient-to-br from-impulso-300 to-impulso-400'
                    : 'bg-gradient-to-br from-amber-400 to-amber-500'
              }`}>
                {resultadoGuardado.estado === 'aprobada' ? (
                  <Trophy className="w-8 h-8 text-white" />
                ) : resultadoGuardado.estado === 'reprobada' ? (
                  <XCircle className="w-8 h-8 text-white" />
                ) : (
                  <Clock className="w-8 h-8 text-white" />
                )}
              </div>

              <h3 className="text-xl font-bold text-neutro-carbon font-quicksand">
                Correcciones guardadas
              </h3>

              <div>
                <p className="text-3xl font-bold text-neutro-carbon font-quicksand">
                  {resultadoGuardado.porcentaje}%
                </p>
                <p className="text-sm text-neutro-piedra font-outfit">
                  Puntaje: {resultadoGuardado.puntaje_final}/10
                </p>
              </div>

              <p className="text-sm text-neutro-piedra font-outfit">
                Estado actualizado: <span className="font-semibold">{
                  resultadoGuardado.estado === 'aprobada' ? 'Aprobada ✅' :
                  resultadoGuardado.estado === 'reprobada' ? 'No aprobada ❌' :
                  'Pendiente de revisión ⏳'
                }</span>
              </p>

              <button
                onClick={() => setModalVisible(false)}
                className="w-full px-6 py-3.5 min-h-[48px] rounded-2xl bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-outfit font-semibold hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
