'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, X, AlertCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';

type TipoPregunta = 'escala' | 'si_no' | 'texto_abierto' | 'multiple_choice' | 'ordenar_palabras' | 'respuesta_imagen';
type Area = 'lenguaje' | 'grafismo' | 'lectura_escritura' | 'matematicas' | 'mixta';

interface OpcionPregunta {
  id?: string;
  texto_opcion: string;
  es_correcta: boolean;
  orden: number;
}

interface Pregunta {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  respuesta_correcta: string;
  opciones: OpcionPregunta[];
  puntaje: number;
  imagen_url: string;
  area_especifica: string;
  expandida?: boolean; // estado local de UI
}

// ─── Modal genérico ───────────────────────────────────────────
function Modal({
  tipo, titulo, mensaje, onConfirm, onClose, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar',
}: {
  tipo: 'error' | 'success' | 'confirm';
  titulo: string;
  mensaje: string | React.ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const iconBg = tipo === 'error' ? 'bg-impulso-100' : tipo === 'success' ? 'bg-crecimiento-100' : 'bg-sol-100';
  const iconEl = tipo === 'error'
    ? <AlertCircle className="w-6 h-6 text-impulso-600" />
    : tipo === 'success'
    ? <CheckCircle2 className="w-6 h-6 text-crecimiento-600" />
    : <AlertCircle className="w-6 h-6 text-sol-600" />;
  const btnPrimary = tipo === 'error'
    ? 'bg-impulso-500 text-white hover:shadow-[0_8px_24px_rgba(230,57,70,0.25)]'
    : tipo === 'success'
    ? 'bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)]'
    : 'bg-gradient-to-r from-impulso-500 to-impulso-600 text-white hover:shadow-[0_8px_24px_rgba(230,57,70,0.25)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>{iconEl}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutro-carbon font-quicksand mb-1">{titulo}</h3>
            <div className="text-sm text-neutro-piedra font-outfit leading-relaxed">{mensaje}</div>
          </div>
        </div>
        <div className="flex gap-3">
          {tipo === 'confirm' && (
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-neutro-lienzo border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-piedra/10 transition-colors min-h-[48px]">
              {cancelLabel}
            </button>
          )}
          <button onClick={() => { onConfirm?.(); onClose(); }} className={`flex-1 px-4 py-3 rounded-2xl font-outfit font-semibold text-sm transition-all min-h-[48px] ${btnPrimary}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constantes de áreas ──────────────────────────────────────
const AREAS_PLANTILLA = [
  { value: 'lenguaje', label: 'Lenguaje y Vocabulario' },
  { value: 'grafismo', label: 'Grafismo y Motricidad Fina' },
  { value: 'lectura_escritura', label: 'Lectura y Escritura' },
  { value: 'matematicas', label: 'Nociones Matemáticas' },
  { value: 'mixta', label: 'Múltiples Áreas' },
];

const AREAS_PREGUNTA = [
  { value: '', label: 'Misma área que la plantilla' },
  { value: 'lenguaje', label: 'Lenguaje y Vocabulario' },
  { value: 'grafismo', label: 'Grafismo y Motricidad Fina' },
  { value: 'lectura_escritura', label: 'Lectura y Escritura' },
  { value: 'matematicas', label: 'Nociones Matemáticas' },
];

const AREA_COLORS: Record<string, string> = {
  lenguaje: 'bg-impulso-50 border-impulso-200/40 text-impulso-700',
  grafismo: 'bg-crecimiento-50 border-crecimiento-200/40 text-crecimiento-700',
  lectura_escritura: 'bg-sol-50 border-sol-200/40 text-sol-700',
  matematicas: 'bg-orange-50 border-orange-200/40 text-orange-700',
};

export default function EditarPlantillaPage() {
  const router = useRouter();
  const params = useParams();
  const { perfil } = useAuth();
  const plantillaId = params?.plantillaId as string;

  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [area, setArea] = useState<Area>('lenguaje');
  const [descripcion, setDescripcion] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState<{
    tipo: 'error' | 'success' | 'confirm';
    titulo: string;
    mensaje: string | React.ReactNode;
    onConfirm?: () => void;
  } | null>(null);

  const rolesPermitidos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const tienePermiso = perfil && rolesPermitidos.includes(perfil.rol);

  // Puntaje total acumulado
  const totalPuntaje = preguntas.reduce((sum, p) => sum + (p.puntaje || 0), 0);
  const puntajeOk = totalPuntaje === 100;

  useEffect(() => {
    if (!tienePermiso) { router.push('/dashboard/autoevaluaciones'); return; }
    fetchPlantilla();
  }, [perfil, tienePermiso, plantillaId]);

  // Distribuye puntaje equitativo cuando se agrega/elimina una pregunta
  const distribuirPuntaje = (lista: Pregunta[]): Pregunta[] => {
    if (lista.length === 0) return lista;
    const base = Math.floor(100 / lista.length);
    const resto = 100 - base * lista.length;
    return lista.map((p, i) => ({ ...p, puntaje: base + (i === 0 ? resto : 0) }));
  };

  async function fetchPlantilla() {
    try {
      const { data, error } = await supabase
        .from('capacitaciones')
        .select(`
          *,
          preguntas_db:preguntas_capacitacion(
            id, orden, pregunta, tipo_pregunta, puntaje, respuesta_correcta, imagen_url, area_especifica,
            opciones:opciones_pregunta(id, orden, texto_opcion, es_correcta)
          )
        `)
        .eq('id', plantillaId)
        .single();

      if (error) throw error;

      if (data) {
        setTitulo(data.nombre);
        setArea(data.area);
        setDescripcion(data.descripcion || '');
        const mappedPreguntas = (data.preguntas_db || [])
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((p: any) => {
            let tipo: TipoPregunta = 'escala';
            if (p.tipo_pregunta === 'verdadero_falso') tipo = 'si_no';
            else if (p.tipo_pregunta === 'texto_libre') tipo = 'texto_abierto';
            else if (p.tipo_pregunta === 'multiple_choice') tipo = 'multiple_choice';
            else if (p.tipo_pregunta === 'ordenar_palabras') tipo = 'ordenar_palabras';
            else if (p.tipo_pregunta === 'respuesta_imagen') tipo = 'respuesta_imagen';
            else if (p.tipo_pregunta === 'escala') tipo = 'escala';
            return {
              id: p.id,
              texto: p.pregunta,
              tipo,
              respuesta_correcta: p.respuesta_correcta || '',
              opciones: (p.opciones || []).sort((a: any, b: any) => a.orden - b.orden),
              puntaje: p.puntaje || 10,
              imagen_url: p.imagen_url || '',
              area_especifica: p.area_especifica || '',
              expandida: false,
            };
          });
        setPreguntas(mappedPreguntas);
      }
    } catch (error) {
      console.error('Error al cargar plantilla:', error);
      setModal({ tipo: 'error', titulo: 'Error al cargar', mensaje: 'No se pudo cargar la plantilla.' });
      router.push('/dashboard/autoevaluaciones/gestionar');
    } finally {
      setLoading(false);
    }
  }

  function agregarPregunta() {
    const nueva: Pregunta = {
      id: Date.now().toString(),
      texto: '', tipo: 'escala', respuesta_correcta: '',
      opciones: [], puntaje: 10, imagen_url: '', area_especifica: '', expandida: true,
    };
    setPreguntas(prev => distribuirPuntaje([...prev, nueva]));
  }

  function eliminarPregunta(id: string) {
    setPreguntas(prev => distribuirPuntaje(prev.filter(p => p.id !== id)));
  }

  function actualizarPregunta(id: string, campo: keyof Pregunta, valor: any) {
    setPreguntas(preguntas.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [campo]: valor };
      if (campo === 'tipo') {
        updated.respuesta_correcta = '';
        updated.imagen_url = '';
        if (valor === 'multiple_choice' || valor === 'respuesta_imagen') {
          updated.opciones = [{ texto_opcion: '', es_correcta: true, orden: 1 }, { texto_opcion: '', es_correcta: false, orden: 2 }];
        } else {
          updated.opciones = [];
        }
      }
      return updated;
    }));
  }

  function toggleExpandida(id: string) {
    setPreguntas(preguntas.map(p => p.id === id ? { ...p, expandida: !p.expandida } : p));
  }

  function actualizarOpcion(preguntaId: string, opcionIdx: number, campo: keyof OpcionPregunta, valor: any) {
    setPreguntas(preguntas.map(p => {
      if (p.id !== preguntaId) return p;
      const newOpciones = p.opciones.map((op, oi) => {
        if (oi !== opcionIdx) {
          if (campo === 'es_correcta' && valor === true) return { ...op, es_correcta: false };
          return op;
        }
        return { ...op, [campo]: valor };
      });
      const correcta = newOpciones.find(o => o.es_correcta);
      return { ...p, opciones: newOpciones, respuesta_correcta: correcta?.texto_opcion || '' };
    }));
  }

  function agregarOpcion(preguntaId: string) {
    setPreguntas(preguntas.map(p => {
      if (p.id !== preguntaId) return p;
      return { ...p, opciones: [...p.opciones, { texto_opcion: '', es_correcta: false, orden: p.opciones.length + 1 }] };
    }));
  }

  function quitarOpcion(preguntaId: string, opcionIdx: number) {
    setPreguntas(preguntas.map(p => {
      if (p.id !== preguntaId || p.opciones.length <= 2) return p;
      const newOps = p.opciones.filter((_, i) => i !== opcionIdx).map((o, i) => ({ ...o, orden: i + 1 }));
      const correcta = newOps.find(o => o.es_correcta);
      return { ...p, opciones: newOps, respuesta_correcta: correcta?.texto_opcion || '' };
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!titulo.trim() || !descripcion.trim()) {
      setModal({ tipo: 'error', titulo: 'Faltan datos', mensaje: 'El título y la descripción son obligatorios.' }); return;
    }
    if (preguntas.length === 0) {
      setModal({ tipo: 'error', titulo: 'Sin preguntas', mensaje: 'Debés agregar al menos una pregunta.' }); return;
    }
    if (preguntas.some(p => !p.texto.trim())) {
      setModal({ tipo: 'error', titulo: 'Pregunta incompleta', mensaje: 'Todas las preguntas deben tener texto.' }); return;
    }
    for (const p of preguntas) {
      if (p.tipo === 'multiple_choice' || p.tipo === 'respuesta_imagen') {
        if (p.opciones.length < 2) { setModal({ tipo: 'error', titulo: 'Opciones insuficientes', mensaje: `La pregunta "${p.texto.substring(0, 40)}…" necesita al menos 2 opciones.` }); return; }
        if (!p.opciones.some(o => o.es_correcta)) { setModal({ tipo: 'error', titulo: 'Sin respuesta correcta', mensaje: `La pregunta "${p.texto.substring(0, 40)}…" necesita una opción correcta.` }); return; }
        if (p.opciones.some(o => !o.texto_opcion.trim())) { setModal({ tipo: 'error', titulo: 'Opciones vacías', mensaje: 'Todas las opciones deben tener texto.' }); return; }
      }
    }
    if (!puntajeOk) {
      setModal({
        tipo: 'error',
        titulo: 'Puntaje incorrecto',
        mensaje: `La suma de puntajes es ${totalPuntaje} pts. Debe ser exactamente 100. Ajustá los valores o usá el botón "Distribuir equitativamente".`,
      }); return;
    }

    setGuardando(true);
    try {
      const { error: capError } = await supabase
        .from('capacitaciones')
        .update({ nombre: titulo, area, descripcion })
        .eq('id', plantillaId);
      if (capError) throw capError;

      const { data: oldPreguntas } = await supabase.from('preguntas_capacitacion').select('id').eq('capacitacion_id', plantillaId);
      if (oldPreguntas) {
        for (const op of oldPreguntas) { await supabase.from('opciones_pregunta').delete().eq('pregunta_id', op.id); }
      }
      await supabase.from('preguntas_capacitacion').delete().eq('capacitacion_id', plantillaId);

      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        const tipoDB = p.tipo === 'si_no' ? 'verdadero_falso' : p.tipo === 'texto_abierto' ? 'texto_libre' : p.tipo;
        const { data: preguntaDB, error: pregError } = await supabase
          .from('preguntas_capacitacion')
          .insert({
            capacitacion_id: plantillaId, orden: i + 1, pregunta: p.texto,
            tipo_pregunta: tipoDB, respuesta_correcta: p.respuesta_correcta || '',
            puntaje: p.puntaje || 10, imagen_url: p.imagen_url || null,
            area_especifica: p.area_especifica || null,
          })
          .select().single();
        if (pregError) { console.error(`Error pregunta ${i}:`, pregError); continue; }
        if ((p.tipo === 'multiple_choice' || p.tipo === 'respuesta_imagen') && preguntaDB && p.opciones.length > 0) {
          await supabase.from('opciones_pregunta').insert(
            p.opciones.map((op, idx) => ({ pregunta_id: preguntaDB.id, orden: idx + 1, texto_opcion: op.texto_opcion.trim(), es_correcta: op.es_correcta }))
          );
        }
      }

      setModal({
        tipo: 'success', titulo: '¡Cambios guardados!',
        mensaje: `La plantilla "${titulo}" fue actualizada correctamente con ${preguntas.length} pregunta${preguntas.length !== 1 ? 's' : ''}.`,
        onConfirm: () => router.push('/dashboard/autoevaluaciones/gestionar'),
      });
    } catch (error) {
      console.error('Error al guardar:', error);
      setModal({ tipo: 'error', titulo: 'Error al guardar', mensaje: 'No se pudieron guardar los cambios. Revisá la consola.' });
    } finally {
      setGuardando(false);
    }
  }

  const renderRespuestaCorrectaInput = (pregunta: Pregunta) => {
    if (pregunta.tipo === 'texto_abierto') {
      return (
        <input type="text" value={pregunta.respuesta_correcta}
          onChange={(e) => actualizarPregunta(pregunta.id, 'respuesta_correcta', e.target.value)}
          placeholder="Respuesta esperada (opcional, revisión manual)"
          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400" />
      );
    }
    if (pregunta.tipo === 'si_no') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Respuesta correcta:</span>
          {['true', 'false'].map(v => (
            <button key={v} type="button" onClick={() => actualizarPregunta(pregunta.id, 'respuesta_correcta', v)}
              className={`px-4 py-1.5 rounded-xl text-sm font-outfit font-medium transition-all ${pregunta.respuesta_correcta === v ? (v === 'true' ? 'bg-crecimiento-400 text-white' : 'bg-impulso-400 text-white') : 'bg-neutro-nube text-neutro-piedra'}`}>
              {v === 'true' ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
      );
    }
    if (pregunta.tipo === 'escala') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Correcta (1-5):</span>
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} type="button" onClick={() => actualizarPregunta(pregunta.id, 'respuesta_correcta', String(v))}
              className={`w-9 h-9 rounded-lg text-sm font-bold font-outfit transition-all ${pregunta.respuesta_correcta === String(v) ? 'bg-sol-400 text-white' : 'bg-neutro-nube text-neutro-piedra'}`}>
              {v}
            </button>
          ))}
        </div>
      );
    }
    if (pregunta.tipo === 'multiple_choice' || pregunta.tipo === 'respuesta_imagen') {
      return (
        <div className="space-y-2">
          {pregunta.tipo === 'respuesta_imagen' && (
            <div className="mb-2">
              <span className="text-xs text-neutro-piedra font-outfit">URL de la imagen:</span>
              <input type="url" value={pregunta.imagen_url}
                onChange={(e) => actualizarPregunta(pregunta.id, 'imagen_url', e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400 mt-1" />
              {pregunta.imagen_url && <img src={pregunta.imagen_url} alt="preview" className="mt-2 max-h-32 rounded-xl object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
            </div>
          )}
          <span className="text-xs text-neutro-piedra font-outfit">Opciones (marcá la correcta):</span>
          {pregunta.opciones.map((op, opIdx) => (
            <div key={opIdx} className="flex items-center gap-2">
              <button type="button" onClick={() => actualizarOpcion(pregunta.id, opIdx, 'es_correcta', true)}
                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${op.es_correcta ? 'bg-crecimiento-400 border-crecimiento-500 text-white' : 'border-neutro-piedra/30'}`}>
                {op.es_correcta && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <input type="text" value={op.texto_opcion}
                onChange={(e) => actualizarOpcion(pregunta.id, opIdx, 'texto_opcion', e.target.value)}
                placeholder={`Opción ${opIdx + 1}`}
                className="flex-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm font-outfit focus:ring-2 focus:ring-sol-400" />
              {pregunta.opciones.length > 2 && (
                <button type="button" onClick={() => quitarOpcion(pregunta.id, opIdx)} className="p-1 text-impulso-500 hover:bg-impulso-50 rounded-lg"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => agregarOpcion(pregunta.id)} className="text-xs text-crecimiento-600 font-outfit font-medium flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Agregar opción
          </button>
        </div>
      );
    }
    if (pregunta.tipo === 'ordenar_palabras') {
      return (
        <div className="space-y-2">
          <span className="text-xs text-neutro-piedra font-outfit">Orden correcto (separá con |):</span>
          <input type="text" value={pregunta.respuesta_correcta}
            onChange={(e) => actualizarPregunta(pregunta.id, 'respuesta_correcta', e.target.value)}
            placeholder="palabra1|palabra2|palabra3"
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400" />
          {pregunta.respuesta_correcta && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {pregunta.respuesta_correcta.split('|').map((w, i) => (
                <span key={i} className="px-2.5 py-1 bg-sol-100 text-sol-800 text-xs font-outfit rounded-lg border border-sol-200/40">{i + 1}. {w.trim()}</span>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando plantilla...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Navbar flotante */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/autoevaluaciones/gestionar" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                Volver
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">Editar Plantilla</h1>
              <div className="w-16"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info básica */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-neutro-carbon font-quicksand mb-6">Información de la Plantilla</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Título *</label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Autoevaluación de Lenguaje Básico"
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[56px] placeholder:text-neutro-piedra/60" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Área principal *</label>
                <select value={area} onChange={(e) => setArea(e.target.value as Area)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[56px]">
                  {AREAS_PLANTILLA.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Descripción *</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit resize-none placeholder:text-neutro-piedra/60"
                  rows={3} placeholder="Describe brevemente el objetivo de esta autoevaluación..." required />
              </div>
            </div>
          </div>

          {/* Preguntas */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-neutro-carbon font-quicksand">Preguntas ({preguntas.length})</h2>
              <button type="button" onClick={agregarPregunta}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit font-semibold active:scale-95">
                <Plus className="w-5 h-5" />
                Agregar Pregunta
              </button>
            </div>

            {/* Contador de puntaje total */}
            {preguntas.length > 0 && (
              <div className={`flex flex-wrap items-center justify-between gap-3 mb-5 px-4 py-3 rounded-2xl border ${puntajeOk ? 'bg-crecimiento-50/50 border-crecimiento-200/40' : totalPuntaje > 100 ? 'bg-impulso-50/50 border-impulso-200/40' : 'bg-sol-50/50 border-sol-200/40'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-outfit font-medium ${puntajeOk ? 'text-crecimiento-700' : totalPuntaje > 100 ? 'text-impulso-700' : 'text-sol-700'}`}>
                    Puntaje total: <strong className="text-base">{totalPuntaje}</strong> / 100 pts
                  </span>
                  {puntajeOk
                    ? <CheckCircle2 className="w-4 h-4 text-crecimiento-600" />
                    : <AlertCircle className="w-4 h-4 text-sol-600" />
                  }
                </div>
                {!puntajeOk && (
                  <button type="button"
                    onClick={() => setPreguntas(distribuirPuntaje(preguntas))}
                    className="text-xs font-outfit font-semibold px-3 py-1.5 bg-white border border-neutro-piedra/20 text-neutro-carbon rounded-xl hover:bg-neutro-nube transition-all active:scale-95">
                    ⚖️ Distribuir equitativamente
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-neutro-piedra font-outfit mb-5">
              Podés asignarle a cada pregunta un área específica para análisis por área. Hacé clic en "Ver detalle" para expandir las opciones de una pregunta.
            </p>

            {preguntas.length === 0 ? (
              <p className="text-center text-neutro-piedra font-outfit py-8">No hay preguntas todavía. Hacé clic en "Agregar Pregunta" para comenzar.</p>
            ) : (
              <div className="space-y-3">
                {preguntas.map((pregunta, index) => (
                  <div key={pregunta.id} className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl overflow-hidden">
                    {/* Cabecera de la pregunta (siempre visible) */}
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crecimiento-100 flex items-center justify-center text-crecimiento-700 font-bold text-sm mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Texto de la pregunta */}
                        <textarea value={pregunta.texto}
                          onChange={(e) => actualizarPregunta(pregunta.id, 'texto', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit resize-none placeholder:text-neutro-piedra/60 text-sm"
                          rows={2} placeholder="Escribe la pregunta..." required />

                        {/* Fila: área, tipo, puntaje — compacta */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Área específica */}
                          <select value={pregunta.area_especifica}
                            onChange={(e) => actualizarPregunta(pregunta.id, 'area_especifica', e.target.value)}
                            className="px-3 py-1.5 bg-white border border-neutro-piedra/20 rounded-xl focus:ring-2 focus:ring-sol-400 text-neutro-carbon font-outfit text-xs flex-1 min-w-[160px]">
                            {AREAS_PREGUNTA.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          {/* Badge de área si tiene */}
                          {pregunta.area_especifica && (
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold font-outfit border ${AREA_COLORS[pregunta.area_especifica] || 'bg-neutro-nube text-neutro-carbon border-neutro-piedra/20'}`}>
                              {AREAS_PREGUNTA.find(a => a.value === pregunta.area_especifica)?.label?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acciones: puntaje + expandir + eliminar */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                        <button type="button" onClick={() => eliminarPregunta(pregunta.id)} className="text-impulso-500 hover:text-impulso-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} max={100} value={pregunta.puntaje}
                            onChange={(e) => actualizarPregunta(pregunta.id, 'puntaje', Math.max(1, parseInt(e.target.value) || 1))}
                            className={`w-14 px-2 py-1 border rounded-lg text-xs font-outfit text-center font-bold focus:ring-2 focus:ring-sol-400 ${puntajeOk ? 'border-neutro-piedra/20 bg-white' : 'border-sol-300 bg-sol-50'}`} />
                          <span className="text-[10px] text-neutro-piedra font-outfit">pts</span>
                        </div>
                        <button type="button" onClick={() => toggleExpandida(pregunta.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-neutro-nube hover:bg-neutro-piedra/20 rounded-lg text-xs text-neutro-piedra font-outfit transition-all">
                          <Eye className="w-3 h-3" />
                          {pregunta.expandida ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {pregunta.expandida && (
                      <div className="px-4 pb-4 pt-1 border-t border-neutro-piedra/10 space-y-3">
                        {/* Tipo */}
                        <div>
                          <label className="block text-xs text-neutro-piedra font-outfit mb-1">Tipo de pregunta</label>
                          <select value={pregunta.tipo}
                            onChange={(e) => actualizarPregunta(pregunta.id, 'tipo', e.target.value)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-neutro-piedra/20 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 text-neutro-carbon font-outfit text-sm">
                            <option value="escala">Escala 1-5 ⭐</option>
                            <option value="si_no">Sí / No</option>
                            <option value="multiple_choice">Selección múltiple</option>
                            <option value="texto_abierto">Texto abierto</option>
                            <option value="ordenar_palabras">Ordenar palabras</option>
                            <option value="respuesta_imagen">Respuesta con imagen</option>
                          </select>
                        </div>
                        {/* Respuesta correcta */}
                        <div className="bg-crecimiento-50/30 rounded-xl p-3 border border-crecimiento-200/20">
                          {renderRespuestaCorrectaInput(pregunta)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/autoevaluaciones/gestionar"
              className="flex-1 px-6 py-4 min-h-[56px] bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-outfit font-semibold text-center active:scale-95 flex items-center justify-center">
              Cancelar
            </Link>
            <button type="submit" disabled={guardando}
              className="flex-1 px-6 py-4 min-h-[56px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-outfit font-semibold active:scale-95 flex items-center justify-center gap-2">
              {guardando
                ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>Guardando...</>
                : <><Save className="w-5 h-5" />Guardar Cambios</>}
            </button>
          </div>
        </form>
      </main>

      {/* Modal */}
      {modal && (
        <Modal tipo={modal.tipo} titulo={modal.titulo} mensaje={modal.mensaje}
          onConfirm={modal.onConfirm} onClose={() => setModal(null)}
          confirmLabel={modal.tipo === 'success' ? 'Ir a plantillas' : 'Entendido'} />
      )}
    </div>
  );
}
