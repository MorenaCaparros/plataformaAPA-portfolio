'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Loader2, BookOpen, Shuffle, ClipboardCheck, Lock, AlertTriangle, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Modal genérico reutilizable
function Modal({
  tipo,
  titulo,
  mensaje,
  onConfirm,
  onClose,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
}: {
  tipo: 'error' | 'success' | 'confirm';
  titulo: string;
  mensaje: string | React.ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const iconBg =
    tipo === 'error' ? 'bg-impulso-100' :
    tipo === 'success' ? 'bg-crecimiento-100' :
    'bg-sol-100';
  const iconEl =
    tipo === 'error' ? <AlertCircle className="w-6 h-6 text-impulso-600" /> :
    tipo === 'success' ? <CheckCircle2 className="w-6 h-6 text-crecimiento-600" /> :
    <AlertCircle className="w-6 h-6 text-sol-600" />;
  const btnPrimary =
    tipo === 'error' ? 'bg-impulso-500 hover:shadow-[0_8px_24px_rgba(230,57,70,0.25)] text-white' :
    tipo === 'success' ? 'bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] text-white' :
    'bg-gradient-to-r from-impulso-500 to-impulso-600 hover:shadow-[0_8px_24px_rgba(230,57,70,0.25)] text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {iconEl}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutro-carbon font-quicksand mb-1">{titulo}</h3>
            <div className="text-sm text-neutro-piedra font-outfit leading-relaxed">{mensaje}</div>
          </div>
        </div>
        <div className="flex gap-3">
          {tipo === 'confirm' && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutro-lienzo border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-piedra/10 transition-colors min-h-[48px]"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => { onConfirm?.(); onClose(); }}
            className={`flex-1 px-4 py-3 rounded-2xl font-outfit font-semibold text-sm transition-all min-h-[48px] ${btnPrimary}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Plantilla {
  id: string;
  titulo: string;
  area: string;
  descripcion: string;
  preguntas: any[];
  activo: boolean;
  created_at: string;
  respuestas_count?: number; // how many volunteers answered
}

function GestionarPlantillasContent() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalBloqueo, setModalBloqueo] = useState<{ titulo: string; respuestas: number } | null>(null);
  const [modal, setModal] = useState<{
    tipo: 'error' | 'success' | 'confirm';
    titulo: string;
    mensaje: string | React.ReactNode;
    onConfirm?: () => void;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { perfil } = useAuth();

  const plantillaId = searchParams.get('plantilla');

  // Verificar permisos
  const rolesPermitidos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const tienePermiso = perfil?.rol ? rolesPermitidos.includes(perfil.rol) : false;

  useEffect(() => {
    if (!tienePermiso && perfil) {
      router.push('/dashboard/autoevaluaciones');
      return;
    }
    fetchPlantillas();
  }, [perfil, tienePermiso]);

  async function fetchPlantillas() {
    try {
      console.log('🔍 Intentando cargar plantillas (capacitaciones)...');
      const { data, error } = await supabase
        .from('capacitaciones')
        .select(`
          *,
          preguntas:preguntas_capacitacion(id, orden, pregunta, tipo_pregunta, puntaje),
          respuestas:voluntarios_capacitaciones(id)
        `)
        .eq('tipo', 'autoevaluacion')
        .order('area');

      console.log('📊 Respuesta de Supabase:', { data, error });
      
      if (error) {
        console.error('❌ Error de Supabase:', error);
        setModal({ tipo: 'error', titulo: 'Error al cargar', mensaje: `No se pudieron cargar las plantillas: ${error.message}` });
        throw error;
      }
      
      // Map to old plantilla shape
      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        titulo: c.nombre,
        area: c.area,
        descripcion: c.descripcion,
        activo: c.activa,
        preguntas: (c.preguntas || []).sort((a: any, b: any) => a.orden - b.orden),
        created_at: c.created_at,
        respuestas_count: (c.respuestas || []).length,
      }));
      
      console.log('✅ Plantillas cargadas:', mapped.length);
      setPlantillas(mapped);
    } catch (error) {
      console.error('💥 Error al cargar plantillas:', error);
      setModal({ tipo: 'error', titulo: 'Error', mensaje: 'Error al cargar las plantillas. Revisá la consola para más detalles.' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActivo(plantillaId: string, activo: boolean) {
    try {
      const { error } = await supabase
        .from('capacitaciones')
        .update({ activa: !activo })
        .eq('id', plantillaId);

      if (error) throw error;
      fetchPlantillas();
    } catch (error) {
      console.error('Error al actualizar plantilla:', error);
      setModal({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo actualizar la plantilla.' });
    }
  }

  async function eliminarPlantilla(plantillaId: string, titulo: string, respuestasCount: number) {
    if (respuestasCount > 0) {
      setModalBloqueo({ titulo, respuestas: respuestasCount });
      return;
    }
    // Pedir confirmación con modal propio
    setModal({
      tipo: 'confirm',
      titulo: 'Eliminar plantilla',
      mensaje: (
        <>
          ¿Estás seguro de eliminar la plantilla{' '}
          <strong className="text-neutro-carbon">"{titulo}"</strong>?
          Esta acción no se puede deshacer.
        </>
      ),
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('capacitaciones')
            .delete()
            .eq('id', plantillaId);

          if (error) throw error;
          fetchPlantillas();
          setModal({
            tipo: 'success',
            titulo: 'Plantilla eliminada',
            mensaje: `La plantilla "${titulo}" fue eliminada correctamente.`,
          });
        } catch (error) {
          console.error('Error al eliminar plantilla:', error);
          setModal({ tipo: 'error', titulo: 'Error', mensaje: 'No se pudo eliminar la plantilla.' });
        }
      },
    });
  }

  const areaLabels: Record<string, string> = {
    lenguaje: 'Lenguaje y Vocabulario',
    grafismo: 'Grafismo y Motricidad Fina',
    lectura_escritura: 'Lectura y Escritura',
    matematicas: 'Nociones Matemáticas',
    mixta: 'Múltiples Áreas',
  };

  if (!tienePermiso && perfil) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar flotante */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/autoevaluaciones" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Gestionar Plantillas
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Acciones principales */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link
            href="/dashboard/autoevaluaciones/gestionar/banco-preguntas"
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] bg-white/60 backdrop-blur-md border border-sol-200/40 rounded-2xl hover:shadow-[0_8px_24px_rgba(242,201,76,0.15)] transition-all active:scale-95"
          >
            <BookOpen className="w-5 h-5 text-sol-600" />
            <div className="text-left">
              <span className="font-outfit font-semibold text-neutro-carbon text-sm">Banco de Preguntas</span>
              <p className="text-xs text-neutro-piedra font-outfit">Gestionar el banco temático de preguntas</p>
            </div>
          </Link>

          <Link
            href="/dashboard/autoevaluaciones/gestionar/crear"
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] bg-white/60 backdrop-blur-md border border-crecimiento-200/40 rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.15)] transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 text-crecimiento-600" />
            <div className="text-left">
              <span className="font-outfit font-semibold text-neutro-carbon text-sm">Crear Plantilla Manual</span>
              <p className="text-xs text-neutro-piedra font-outfit">Escribir preguntas manualmente</p>
            </div>
          </Link>

          <Link
            href="/dashboard/autoevaluaciones/gestionar/crear-desde-banco"
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all active:scale-95 shadow-[0_4px_16px_rgba(164,198,57,0.15)]"
          >
            <Shuffle className="w-5 h-5 text-white" />
            <div className="text-left">
              <span className="font-outfit font-semibold text-white text-sm">Crear desde Banco</span>
              <p className="text-xs text-white/80 font-outfit">Asignar preguntas aleatorias por área</p>
            </div>
          </Link>
        </div>

        {/* Revisar Respuestas */}
        <div className="mb-6">
          <Link
            href="/dashboard/autoevaluaciones/gestionar/revisar"
            className="flex items-center gap-4 px-6 py-4 min-h-[56px] bg-white/60 backdrop-blur-md border border-amber-200/40 rounded-2xl hover:shadow-[0_8px_24px_rgba(245,158,11,0.15)] transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="font-outfit font-semibold text-neutro-carbon text-sm">Revisar Respuestas</span>
              <p className="text-xs text-neutro-piedra font-outfit">Corregir respuestas de texto libre y ver resultados</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-neutro-piedra rotate-180" />
          </Link>
        </div>

        {/* Lista de plantillas */}
        {plantillas.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-8 sm:p-12 text-center">
            <BookOpen className="w-12 h-12 text-neutro-piedra/40 mx-auto mb-4" />
            <p className="text-neutro-carbon font-outfit text-lg mb-2">No hay plantillas creadas todavía.</p>
            <p className="text-neutro-piedra font-outfit text-sm">
              Usá las opciones de arriba para crear tu primera plantilla de autoevaluación.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {plantillas.map((plantilla) => (
              <div
                key={plantilla.id}
                className="group bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 transition-all duration-300 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)]"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-block px-4 py-1.5 rounded-2xl text-sm font-semibold font-outfit border ${
                          plantilla.area === 'lenguaje' ? 'bg-impulso-50 text-impulso-700 border-impulso-200/30' :
                          plantilla.area === 'grafismo' ? 'bg-crecimiento-50 text-crecimiento-700 border-crecimiento-200/30' :
                          plantilla.area === 'lectura_escritura' ? 'bg-sol-50 text-sol-700 border-sol-200/30' :
                          plantilla.area === 'matematicas' ? 'bg-impulso-50 text-impulso-700 border-impulso-200/30' :
                          'bg-neutro-lienzo text-neutro-carbon border-neutro-piedra/30'
                        }`}
                      >
                        {areaLabels[plantilla.area] || plantilla.area}
                      </span>
                      <span className={`px-3 py-1 rounded-2xl text-xs font-semibold font-outfit ${
                        plantilla.activo 
                          ? 'bg-crecimiento-50 text-crecimiento-700' 
                          : 'bg-neutro-piedra/20 text-neutro-piedra'
                      }`}>
                        {plantilla.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-2">
                      {plantilla.titulo}
                    </h3>
                    <p className="text-sm text-neutro-piedra font-outfit mb-2">
                      {plantilla.descripcion}
                    </p>
                    <p className="text-xs text-neutro-piedra font-outfit">
                      {plantilla.preguntas?.length || 0} preguntas
                    </p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => toggleActivo(plantilla.id, plantilla.activo)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 backdrop-blur-sm border rounded-2xl transition-all text-sm font-outfit font-medium active:scale-95 ${
                        plantilla.activo
                          ? 'bg-crecimiento-50 border-crecimiento-200/40 text-crecimiento-700 hover:shadow-[0_4px_16px_rgba(164,198,57,0.2)]'
                          : 'bg-white/80 border-white/60 text-neutro-piedra hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]'
                      }`}
                      title={plantilla.activo ? 'Desactivar plantilla' : 'Activar plantilla'}
                    >
                      {plantilla.activo ? <Eye className="w-4 h-4 mx-auto" /> : <EyeOff className="w-4 h-4 mx-auto" />}
                    </button>

                    {/* Edit — blocked if answered */}
                    {(plantilla.respuestas_count || 0) > 0 ? (
                      <button
                        onClick={() => setModalBloqueo({ titulo: plantilla.titulo, respuestas: plantilla.respuestas_count || 0 })}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-neutro-lienzo border border-neutro-piedra/20 text-neutro-piedra rounded-2xl transition-all text-sm font-outfit font-medium active:scale-95 flex items-center justify-center gap-1.5"
                        title="Plantilla bloqueada — ya fue respondida"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <Edit className="w-4 h-4" />
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/autoevaluaciones/gestionar/editar/${plantilla.id}`}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-sol-50 border border-sol-200/40 text-sol-700 rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.2)] transition-all text-sm font-outfit font-medium active:scale-95 flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}

                    {/* Delete — blocked if answered */}
                    <button
                      onClick={() => eliminarPlantilla(plantilla.id, plantilla.titulo, plantilla.respuestas_count || 0)}
                      className={`flex-1 sm:flex-none px-4 py-2.5 border rounded-2xl transition-all text-sm font-outfit font-medium active:scale-95 flex items-center justify-center ${
                        (plantilla.respuestas_count || 0) > 0
                          ? 'bg-neutro-lienzo border-neutro-piedra/20 text-neutro-piedra/50 cursor-not-allowed'
                          : 'bg-impulso-50 border-impulso-200/40 text-impulso-700 hover:shadow-[0_4px_16px_rgba(230,57,70,0.2)]'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badge: respuestas */}
                  {(plantilla.respuestas_count || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                      <Lock className="w-3.5 h-3.5 text-neutro-piedra" />
                      <span className="text-xs text-neutro-piedra font-outfit">
                        {plantilla.respuestas_count} respuesta{plantilla.respuestas_count !== 1 ? 's' : ''} — no editable
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: acción general (error / éxito / confirmación) */}
      {modal && (
        <Modal
          tipo={modal.tipo}
          titulo={modal.titulo}
          mensaje={modal.mensaje}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
          confirmLabel={modal.tipo === 'confirm' ? 'Sí, eliminar' : 'Entendido'}
          cancelLabel="Cancelar"
        />
      )}

      {/* Modal: plantilla bloqueada */}
      {modalBloqueo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sol-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-sol-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutro-carbon font-quicksand mb-1">Plantilla bloqueada</h3>
                <p className="text-sm text-neutro-piedra font-outfit leading-relaxed">
                  La plantilla <strong className="text-neutro-carbon">"{modalBloqueo.titulo}"</strong> ya fue respondida por{' '}
                  <strong className="text-neutro-carbon">{modalBloqueo.respuestas} voluntario{modalBloqueo.respuestas !== 1 ? 's' : ''}</strong>.
                  No se puede editar ni eliminar para preservar la integridad de las respuestas existentes.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalBloqueo(null)}
                className="flex-1 px-4 py-3 bg-neutro-lienzo border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-piedra/10 transition-colors min-h-[48px]"
              >
                Entendido
              </button>
              <Link
                href="/dashboard/autoevaluaciones/gestionar/revisar"
                onClick={() => setModalBloqueo(null)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <ClipboardCheck className="w-4 h-4" />
                Ver respuestas
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primario-azul mx-auto mb-4" />
        <p className="text-neutro-piedra">Cargando plantillas...</p>
      </div>
    </div>
  );
}

export default function GestionarPlantillasPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GestionarPlantillasContent />
    </Suspense>
  );
}
