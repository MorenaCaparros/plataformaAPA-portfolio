'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Save, X, Search, Filter, BookOpen, CheckCircle2,
} from 'lucide-react';

type Area = 'lenguaje' | 'grafismo' | 'lectura_escritura' | 'matematicas';
type TipoPregunta = 'escala' | 'verdadero_falso' | 'texto_libre' | 'multiple_choice' | 'ordenar_palabras' | 'respuesta_imagen';

interface OpcionPregunta {
  id?: string;
  texto_opcion: string;
  es_correcta: boolean;
  orden: number;
}

interface PreguntaBanco {
  id: string;
  pregunta: string;
  tipo_pregunta: TipoPregunta;
  area: Area;
  puntaje: number;
  activa: boolean;
  orden: number;
  respuesta_correcta: string;
  opciones: OpcionPregunta[];
  imagen_url: string;
  datos_extra: any;
  created_at: string;
}

interface NuevaPregunta {
  pregunta: string;
  tipo_pregunta: TipoPregunta;
  area: Area;
  respuesta_correcta: string;
  opciones: OpcionPregunta[];
  imagen_url: string;
  datos_extra: any;
}

const AREAS: { value: Area; label: string; color: string; bg: string }[] = [
  { value: 'lenguaje', label: 'Lenguaje y Vocabulario', color: 'text-impulso-700', bg: 'bg-impulso-50 border-impulso-200/30' },
  { value: 'grafismo', label: 'Grafismo y Motricidad Fina', color: 'text-crecimiento-700', bg: 'bg-crecimiento-50 border-crecimiento-200/30' },
  { value: 'lectura_escritura', label: 'Lectura y Escritura', color: 'text-sol-700', bg: 'bg-sol-50 border-sol-200/30' },
  { value: 'matematicas', label: 'Nociones Matemáticas', color: 'text-sol-600', bg: 'bg-sol-50 border-sol-200/30' },
];

const TIPOS_PREGUNTA: { value: TipoPregunta; label: string; desc: string }[] = [
  { value: 'escala', label: 'Escala 1-5', desc: 'Respuesta numérica del 1 al 5' },
  { value: 'verdadero_falso', label: 'Sí / No', desc: 'Verdadero o falso' },
  { value: 'multiple_choice', label: 'Selección múltiple', desc: 'Varias opciones, una correcta' },
  { value: 'texto_libre', label: 'Texto abierto', desc: 'Respuesta libre (revisión manual)' },
  { value: 'ordenar_palabras', label: 'Ordenar palabras', desc: 'Ordenar o unir palabras en el orden correcto' },
  { value: 'respuesta_imagen', label: 'Respuesta con imagen', desc: 'Pregunta con imagen, el voluntario elige la respuesta' },
];

const areaLabels: Record<string, string> = {
  lenguaje: 'Lenguaje y Vocabulario',
  grafismo: 'Grafismo y Motricidad Fina',
  lectura_escritura: 'Lectura y Escritura',
  matematicas: 'Nociones Matemáticas',
  mixta: 'Múltiples Áreas',
};

function emptyNuevaPregunta(area: Area = 'lenguaje'): NuevaPregunta {
  return { pregunta: '', tipo_pregunta: 'escala', area, respuesta_correcta: '', opciones: [], imagen_url: '', datos_extra: null };
}

export default function BancoPreguntasPage() {
  const router = useRouter();
  const { perfil } = useAuth();

  const [preguntas, setPreguntas] = useState<PreguntaBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroArea, setFiltroArea] = useState<Area | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  // Estado para crear
  const [modoCrear, setModoCrear] = useState(false);
  const [nuevasPreguntas, setNuevasPreguntas] = useState<NuevaPregunta[]>([emptyNuevaPregunta()]);
  const [guardando, setGuardando] = useState(false);

  // Estado para edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [editTipo, setEditTipo] = useState<TipoPregunta>('escala');
  const [editArea, setEditArea] = useState<Area>('lenguaje');
  const [editRespuestaCorrecta, setEditRespuestaCorrecta] = useState('');
  const [editOpciones, setEditOpciones] = useState<OpcionPregunta[]>([]);
  const [editImagenUrl, setEditImagenUrl] = useState('');
  const [editDatosExtra, setEditDatosExtra] = useState<any>(null);

  const rolesPermitidos = ['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'];
  const tienePermiso = perfil?.rol ? rolesPermitidos.includes(perfil.rol) : false;

  useEffect(() => {
    if (!tienePermiso && perfil) {
      router.push('/dashboard/autoevaluaciones');
      return;
    }
    if (perfil) fetchPreguntas();
  }, [perfil, tienePermiso]);

  const fetchPreguntas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('preguntas_capacitacion')
        .select(`
          *,
          opciones:opciones_pregunta(id, orden, texto_opcion, es_correcta)
        `)
        .is('capacitacion_id', null)
        .order('area_especifica', { ascending: true })
        .order('orden', { ascending: true });

      if (error) throw error;

      const mapped: PreguntaBanco[] = (data || []).map((p: any) => ({
        id: p.id,
        pregunta: p.pregunta,
        tipo_pregunta: p.tipo_pregunta,
        area: p.area_especifica || 'lenguaje',
        puntaje: p.puntaje,
        activa: p.puntaje > 0,
        orden: p.orden,
        respuesta_correcta: p.respuesta_correcta || '',
        opciones: (p.opciones || []).sort((a: any, b: any) => a.orden - b.orden),
        imagen_url: p.imagen_url || '',
        datos_extra: p.datos_extra || null,
        created_at: p.created_at,
      }));

      setPreguntas(mapped);
    } catch (error) {
      console.error('Error al cargar banco de preguntas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- CREAR preguntas ---
  const agregarFilaCrear = () => {
    setNuevasPreguntas([
      ...nuevasPreguntas,
      emptyNuevaPregunta(nuevasPreguntas[nuevasPreguntas.length - 1]?.area || 'lenguaje'),
    ]);
  };

  const quitarFilaCrear = (index: number) => {
    if (nuevasPreguntas.length <= 1) return;
    setNuevasPreguntas(nuevasPreguntas.filter((_, i) => i !== index));
  };

  const actualizarNuevaPregunta = (index: number, campo: keyof NuevaPregunta, valor: any) => {
    setNuevasPreguntas(nuevasPreguntas.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [campo]: valor };
      // Reset respuesta_correcta and opciones when tipo changes
      if (campo === 'tipo_pregunta') {
        updated.respuesta_correcta = '';
        updated.imagen_url = '';
        updated.datos_extra = null;
        updated.opciones = valor === 'multiple_choice' || valor === 'respuesta_imagen'
          ? [{ texto_opcion: '', es_correcta: true, orden: 1 }, { texto_opcion: '', es_correcta: false, orden: 2 }]
          : [];
        if (valor === 'ordenar_palabras') {
          updated.datos_extra = { palabras: ['', '', ''] };
        }
      }
      return updated;
    }));
  };

  const actualizarOpcionNueva = (preguntaIdx: number, opcionIdx: number, campo: keyof OpcionPregunta, valor: any) => {
    setNuevasPreguntas(nuevasPreguntas.map((p, pi) => {
      if (pi !== preguntaIdx) return p;
      const newOpciones = p.opciones.map((op, oi) => {
        if (oi !== opcionIdx) {
          // If marking this one as correcta, unmark others
          if (campo === 'es_correcta' && valor === true) return { ...op, es_correcta: false };
          return op;
        }
        return { ...op, [campo]: valor };
      });
      // Derive respuesta_correcta from the correct option
      const correcta = newOpciones.find(o => o.es_correcta);
      return { ...p, opciones: newOpciones, respuesta_correcta: correcta?.texto_opcion || '' };
    }));
  };

  const agregarOpcionNueva = (preguntaIdx: number) => {
    setNuevasPreguntas(nuevasPreguntas.map((p, pi) => {
      if (pi !== preguntaIdx) return p;
      return { ...p, opciones: [...p.opciones, { texto_opcion: '', es_correcta: false, orden: p.opciones.length + 1 }] };
    }));
  };

  const quitarOpcionNueva = (preguntaIdx: number, opcionIdx: number) => {
    setNuevasPreguntas(nuevasPreguntas.map((p, pi) => {
      if (pi !== preguntaIdx || p.opciones.length <= 2) return p;
      const newOpciones = p.opciones.filter((_, oi) => oi !== opcionIdx).map((op, i) => ({ ...op, orden: i + 1 }));
      const correcta = newOpciones.find(o => o.es_correcta);
      return { ...p, opciones: newOpciones, respuesta_correcta: correcta?.texto_opcion || '' };
    }));
  };

  const guardarNuevasPreguntas = async () => {
    const validas = nuevasPreguntas.filter((p) => p.pregunta.trim());
    if (validas.length === 0) {
      alert('Escribí al menos una pregunta');
      return;
    }

    // Validate respuesta_correcta for non-texto_libre
    for (const p of validas) {
      if (p.tipo_pregunta === 'multiple_choice' || p.tipo_pregunta === 'respuesta_imagen') {
        if (p.opciones.length < 2) {
          alert(`La pregunta "${p.pregunta.substring(0, 40)}..." necesita al menos 2 opciones`);
          return;
        }
        if (!p.opciones.some(o => o.es_correcta)) {
          alert(`La pregunta "${p.pregunta.substring(0, 40)}..." necesita una opción marcada como correcta`);
          return;
        }
        if (p.opciones.some(o => !o.texto_opcion.trim())) {
          alert(`Todas las opciones de "${p.pregunta.substring(0, 40)}..." deben tener texto`);
          return;
        }
      }
      if (p.tipo_pregunta === 'ordenar_palabras') {
        const palabras = p.datos_extra?.palabras || [];
        if (palabras.filter((w: string) => w.trim()).length < 2) {
          alert(`La pregunta "${p.pregunta.substring(0, 40)}..." necesita al menos 2 palabras para ordenar`);
          return;
        }
        // respuesta_correcta = palabras en orden correcto separadas por |
        // Auto-set if empty
        if (!p.respuesta_correcta.trim()) {
          p.respuesta_correcta = palabras.filter((w: string) => w.trim()).join('|');
        }
      }
      if (p.tipo_pregunta === 'respuesta_imagen' && !p.imagen_url?.trim()) {
        alert(`La pregunta "${p.pregunta.substring(0, 40)}..." necesita una URL de imagen`);
        return;
      }
      if (p.tipo_pregunta !== 'texto_libre' && p.tipo_pregunta !== 'ordenar_palabras' && !p.respuesta_correcta.trim()) {
        alert(`La pregunta "${p.pregunta.substring(0, 40)}..." necesita una respuesta correcta`);
        return;
      }
    }

    setGuardando(true);
    try {
      // Get max orden per area
      const areasConcernidas = [...new Set(validas.map((p) => p.area))];
      const ordenMaxPorArea: Record<string, number> = {};

      for (const a of areasConcernidas) {
        const existentes = preguntas.filter((p) => p.area === a);
        ordenMaxPorArea[a] = existentes.length > 0 ? Math.max(...existentes.map((p) => p.orden)) : 0;
      }

      const inserts = validas.map((p) => {
        ordenMaxPorArea[p.area] = (ordenMaxPorArea[p.area] || 0) + 1;
        return {
          capacitacion_id: null,
          orden: ordenMaxPorArea[p.area],
          pregunta: p.pregunta.trim(),
          tipo_pregunta: p.tipo_pregunta,
          respuesta_correcta: p.tipo_pregunta === 'ordenar_palabras'
            ? (p.datos_extra?.palabras || []).filter((w: string) => w.trim()).join('|')
            : p.respuesta_correcta,
          puntaje: 10,
          area_especifica: p.area,
          imagen_url: p.imagen_url?.trim() || null,
          datos_extra: p.datos_extra || null,
        };
      });

      const { data: insertedPreguntas, error } = await supabase
        .from('preguntas_capacitacion')
        .insert(inserts)
        .select();

      if (error) throw error;

      // Insert opciones for multiple_choice and respuesta_imagen
      if (insertedPreguntas) {
        for (let i = 0; i < insertedPreguntas.length; i++) {
          const preguntaDB = insertedPreguntas[i];
          const original = validas[i];
          if ((original.tipo_pregunta === 'multiple_choice' || original.tipo_pregunta === 'respuesta_imagen') && original.opciones.length > 0) {
            const opInserts = original.opciones.map((op, idx) => ({
              pregunta_id: preguntaDB.id,
              orden: op.orden ?? idx + 1,
              texto_opcion: op.texto_opcion.trim(),
              es_correcta: op.es_correcta,
            }));
            await supabase.from('opciones_pregunta').insert(opInserts);
          }
        }
      }

      setModoCrear(false);
      setNuevasPreguntas([emptyNuevaPregunta()]);
      await fetchPreguntas();
    } catch (error) {
      console.error('Error al crear preguntas:', error);
      alert('Error al guardar las preguntas');
    } finally {
      setGuardando(false);
    }
  };

  // --- EDITAR pregunta ---
  const iniciarEdicion = (p: PreguntaBanco) => {
    setEditandoId(p.id);
    setEditTexto(p.pregunta);
    setEditTipo(p.tipo_pregunta);
    setEditArea(p.area);
    setEditRespuestaCorrecta(p.respuesta_correcta);
    setEditImagenUrl(p.imagen_url || '');
    setEditDatosExtra(p.datos_extra || (p.tipo_pregunta === 'ordenar_palabras' ? { palabras: p.respuesta_correcta.split('|') } : null));
    setEditOpciones((p.tipo_pregunta === 'multiple_choice' || p.tipo_pregunta === 'respuesta_imagen') && p.opciones.length > 0
      ? p.opciones.map(o => ({ ...o }))
      : (p.tipo_pregunta === 'multiple_choice' || p.tipo_pregunta === 'respuesta_imagen')
        ? [{ texto_opcion: '', es_correcta: true, orden: 1 }, { texto_opcion: '', es_correcta: false, orden: 2 }]
        : []);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const actualizarEditOpcion = (opcionIdx: number, campo: keyof OpcionPregunta, valor: any) => {
    setEditOpciones(prev => {
      const newOps = prev.map((op, oi) => {
        if (oi !== opcionIdx) {
          if (campo === 'es_correcta' && valor === true) return { ...op, es_correcta: false };
          return op;
        }
        return { ...op, [campo]: valor };
      });
      // Derive respuesta_correcta
      const correcta = newOps.find(o => o.es_correcta);
      if (correcta) setEditRespuestaCorrecta(correcta.texto_opcion);
      return newOps;
    });
  };

  const guardarEdicion = async () => {
    if (!editandoId || !editTexto.trim()) return;

    // Validate
    if (editTipo === 'multiple_choice' || editTipo === 'respuesta_imagen') {
      if (editOpciones.length < 2) { alert('Se necesitan al menos 2 opciones'); return; }
      if (!editOpciones.some(o => o.es_correcta)) { alert('Marcá una opción como correcta'); return; }
      if (editOpciones.some(o => !o.texto_opcion.trim())) { alert('Todas las opciones deben tener texto'); return; }
    }
    if (editTipo === 'ordenar_palabras') {
      const palabras = editDatosExtra?.palabras || [];
      if (palabras.filter((w: string) => w.trim()).length < 2) { alert('Se necesitan al menos 2 palabras para ordenar'); return; }
    }
    if (editTipo === 'respuesta_imagen' && !editImagenUrl.trim()) {
      alert('Ingresá la URL de la imagen');
      return;
    }
    if (editTipo !== 'texto_libre' && editTipo !== 'ordenar_palabras' && !editRespuestaCorrecta.trim()) {
      alert('Ingresá la respuesta correcta');
      return;
    }

    try {
      const respCorrecta = editTipo === 'ordenar_palabras'
        ? (editDatosExtra?.palabras || []).filter((w: string) => w.trim()).join('|')
        : editRespuestaCorrecta;

      const { error } = await supabase
        .from('preguntas_capacitacion')
        .update({
          pregunta: editTexto.trim(),
          tipo_pregunta: editTipo,
          area_especifica: editArea,
          respuesta_correcta: respCorrecta,
          imagen_url: editImagenUrl?.trim() || null,
          datos_extra: editDatosExtra || null,
        })
        .eq('id', editandoId);

      if (error) throw error;

      // Update opciones
      if (editTipo === 'multiple_choice' || editTipo === 'respuesta_imagen') {
        await supabase.from('opciones_pregunta').delete().eq('pregunta_id', editandoId);
        if (editOpciones.length > 0) {
          const opInserts = editOpciones.map((op, idx) => ({
            pregunta_id: editandoId,
            orden: idx + 1,
            texto_opcion: op.texto_opcion.trim(),
            es_correcta: op.es_correcta,
          }));
          await supabase.from('opciones_pregunta').insert(opInserts);
        }
      } else {
        // Clean up opciones if type changed away from multiple_choice
        await supabase.from('opciones_pregunta').delete().eq('pregunta_id', editandoId);
      }

      setEditandoId(null);
      await fetchPreguntas();
    } catch (error) {
      console.error('Error al editar pregunta:', error);
      alert('Error al actualizar la pregunta');
    }
  };

  // --- TOGGLE activa ---
  const toggleActiva = async (p: PreguntaBanco) => {
    try {
      const nuevoPuntaje = p.activa ? 0 : 10;
      const { error } = await supabase
        .from('preguntas_capacitacion')
        .update({ puntaje: nuevoPuntaje })
        .eq('id', p.id);

      if (error) throw error;
      await fetchPreguntas();
    } catch (error) {
      console.error('Error al toggle activa:', error);
    }
  };

  // --- ELIMINAR pregunta ---
  const eliminarPregunta = async (p: PreguntaBanco) => {
    if (!confirm(`¿Eliminar la pregunta "${p.pregunta.substring(0, 60)}..."? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      // Delete opciones first (FK)
      await supabase.from('opciones_pregunta').delete().eq('pregunta_id', p.id);
      const { error } = await supabase.from('preguntas_capacitacion').delete().eq('id', p.id);
      if (error) throw error;
      await fetchPreguntas();
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
      alert('Error al eliminar la pregunta');
    }
  };

  // --- FILTRADO ---
  const preguntasFiltradas = preguntas.filter((p) => {
    if (filtroArea && p.area !== filtroArea) return false;
    if (!mostrarInactivas && !p.activa) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return p.pregunta.toLowerCase().includes(search);
    }
    return true;
  });

  // Agrupar por área
  const preguntasPorArea = AREAS.map((a) => ({
    ...a,
    preguntas: preguntasFiltradas.filter((p) => p.area === a.value),
    totalBanco: preguntas.filter((p) => p.area === a.value && p.activa).length,
  })).filter((g) => (!filtroArea || g.value === filtroArea) && g.preguntas.length > 0);

  // --- Helper: render respuesta correcta indicator ---
  const renderRespuestaCorrectaBadge = (p: PreguntaBanco) => {
    if (p.tipo_pregunta === 'texto_libre') return null;
    if (p.tipo_pregunta === 'ordenar_palabras') {
      const palabras = p.datos_extra?.palabras || p.respuesta_correcta?.split('|') || [];
      return (
        <span className="text-xs text-sol-700 font-outfit px-2 py-0.5 bg-sol-50 rounded-lg border border-sol-200/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {palabras.length} palabras
        </span>
      );
    }
    if (p.tipo_pregunta === 'respuesta_imagen') {
      return (
        <span className="text-xs text-crecimiento-700 font-outfit px-2 py-0.5 bg-crecimiento-50 rounded-lg border border-crecimiento-200/30 flex items-center gap-1">
          🖼️ Con imagen
        </span>
      );
    }
    if (!p.respuesta_correcta) {
      return (
        <span className="text-xs text-impulso-600 font-outfit px-2 py-0.5 bg-impulso-50 rounded-lg border border-impulso-200/30">
          ⚠ Sin respuesta correcta
        </span>
      );
    }
    let display = p.respuesta_correcta;
    if (p.tipo_pregunta === 'verdadero_falso') {
      const lc = p.respuesta_correcta.toLowerCase();
      display = ['true', 'si', 'sí', 'verdadero', '1'].includes(lc) ? 'Sí' : 'No';
    }
    return (
      <span className="text-xs text-crecimiento-700 font-outfit px-2 py-0.5 bg-crecimiento-50 rounded-lg border border-crecimiento-200/30 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {display}
      </span>
    );
  };

  // --- Helper: render respuesta correcta input for create form ---
  const renderRespuestaCorrectaInput = (np: NuevaPregunta, index: number) => {
    if (np.tipo_pregunta === 'texto_libre') {
      return (
        <input
          type="text"
          value={np.respuesta_correcta}
          onChange={(e) => actualizarNuevaPregunta(index, 'respuesta_correcta', e.target.value)}
          placeholder="Respuesta esperada (opcional, revisión manual)"
          className="w-full px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-neutro-carbon font-outfit text-sm focus:ring-2 focus:ring-sol-400"
        />
      );
    }
    if (np.tipo_pregunta === 'verdadero_falso') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Respuesta correcta:</span>
          <button
            type="button"
            onClick={() => actualizarNuevaPregunta(index, 'respuesta_correcta', 'true')}
            className={`px-4 py-1.5 rounded-xl text-sm font-outfit font-medium transition-all ${
              np.respuesta_correcta === 'true'
                ? 'bg-crecimiento-400 text-white shadow-md'
                : 'bg-neutro-nube text-neutro-piedra hover:bg-neutro-piedra/20'
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => actualizarNuevaPregunta(index, 'respuesta_correcta', 'false')}
            className={`px-4 py-1.5 rounded-xl text-sm font-outfit font-medium transition-all ${
              np.respuesta_correcta === 'false'
                ? 'bg-impulso-400 text-white shadow-md'
                : 'bg-neutro-nube text-neutro-piedra hover:bg-neutro-piedra/20'
            }`}
          >
            No
          </button>
        </div>
      );
    }
    if (np.tipo_pregunta === 'escala') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Respuesta correcta (1-5):</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => actualizarNuevaPregunta(index, 'respuesta_correcta', String(v))}
                className={`w-9 h-9 rounded-lg text-sm font-bold font-outfit transition-all ${
                  np.respuesta_correcta === String(v)
                    ? 'bg-sol-400 text-white shadow-md'
                    : 'bg-neutro-nube text-neutro-piedra hover:bg-neutro-piedra/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (np.tipo_pregunta === 'multiple_choice') {
      return (
        <div className="space-y-2">
          <span className="text-xs text-neutro-piedra font-outfit">Opciones (marcá la correcta):</span>
          {np.opciones.map((op, opIdx) => (
            <div key={opIdx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => actualizarOpcionNueva(index, opIdx, 'es_correcta', true)}
                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  op.es_correcta
                    ? 'bg-crecimiento-400 border-crecimiento-500 text-white'
                    : 'border-neutro-piedra/30 hover:border-crecimiento-300'
                }`}
              >
                {op.es_correcta && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={op.texto_opcion}
                onChange={(e) => actualizarOpcionNueva(index, opIdx, 'texto_opcion', e.target.value)}
                placeholder={`Opción ${opIdx + 1}`}
                className="flex-1 px-3 py-1.5 bg-white border border-neutro-piedra/20 rounded-lg text-sm font-outfit focus:ring-2 focus:ring-sol-400"
              />
              {np.opciones.length > 2 && (
                <button type="button" onClick={() => quitarOpcionNueva(index, opIdx)} className="p-1 text-impulso-500 hover:bg-impulso-50 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => agregarOpcionNueva(index)}
            className="text-xs text-crecimiento-600 hover:text-crecimiento-700 font-outfit font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar opción
          </button>
        </div>
      );
    }
    if (np.tipo_pregunta === 'ordenar_palabras') {
      const palabras = np.datos_extra?.palabras || ['', '', ''];
      return (
        <div className="space-y-2">
          <span className="text-xs text-neutro-piedra font-outfit">
            Palabras en el orden correcto (el voluntario las recibirá desordenadas):
          </span>
          {palabras.map((palabra: string, wIdx: number) => (
            <div key={wIdx} className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sol-100 flex items-center justify-center text-sol-700 text-xs font-bold">
                {wIdx + 1}
              </span>
              <input
                type="text"
                value={palabra}
                onChange={(e) => {
                  const newPalabras = [...palabras];
                  newPalabras[wIdx] = e.target.value;
                  actualizarNuevaPregunta(index, 'datos_extra', { palabras: newPalabras });
                }}
                placeholder={`Palabra ${wIdx + 1}`}
                className="flex-1 px-3 py-1.5 bg-white border border-neutro-piedra/20 rounded-lg text-sm font-outfit focus:ring-2 focus:ring-sol-400"
              />
              {palabras.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const newPalabras = palabras.filter((_: string, i: number) => i !== wIdx);
                    actualizarNuevaPregunta(index, 'datos_extra', { palabras: newPalabras });
                  }}
                  className="p-1 text-impulso-500 hover:bg-impulso-50 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              actualizarNuevaPregunta(index, 'datos_extra', { palabras: [...palabras, ''] });
            }}
            className="text-xs text-sol-600 hover:text-sol-700 font-outfit font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar palabra
          </button>
        </div>
      );
    }
    if (np.tipo_pregunta === 'respuesta_imagen') {
      return (
        <div className="space-y-3">
          <div>
            <span className="text-xs text-neutro-piedra font-outfit block mb-1">URL de la imagen:</span>
            <input
              type="url"
              value={np.imagen_url || ''}
              onChange={(e) => actualizarNuevaPregunta(index, 'imagen_url', e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400"
            />
            {np.imagen_url && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/60 max-w-xs">
                <img src={np.imagen_url} alt="Preview" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-xs text-neutro-piedra font-outfit">Opciones de respuesta (marcá la correcta):</span>
            {np.opciones.map((op, opIdx) => (
              <div key={opIdx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actualizarOpcionNueva(index, opIdx, 'es_correcta', true)}
                  className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    op.es_correcta
                      ? 'bg-crecimiento-400 border-crecimiento-500 text-white'
                      : 'border-neutro-piedra/30 hover:border-crecimiento-300'
                  }`}
                >
                  {op.es_correcta && <CheckCircle2 className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={op.texto_opcion}
                  onChange={(e) => actualizarOpcionNueva(index, opIdx, 'texto_opcion', e.target.value)}
                  placeholder={`Opción ${opIdx + 1}`}
                  className="flex-1 px-3 py-1.5 bg-white border border-neutro-piedra/20 rounded-lg text-sm font-outfit focus:ring-2 focus:ring-sol-400"
                />
                {np.opciones.length > 2 && (
                  <button type="button" onClick={() => quitarOpcionNueva(index, opIdx)} className="p-1 text-impulso-500 hover:bg-impulso-50 rounded-lg">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => agregarOpcionNueva(index)}
              className="text-xs text-crecimiento-600 hover:text-crecimiento-700 font-outfit font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar opción
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- Helper: render respuesta correcta input for edit form ---
  const renderEditRespuestaCorrecta = () => {
    if (editTipo === 'texto_libre') {
      return (
        <input
          type="text"
          value={editRespuestaCorrecta}
          onChange={(e) => setEditRespuestaCorrecta(e.target.value)}
          placeholder="Respuesta esperada (opcional)"
          className="w-full px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400"
        />
      );
    }
    if (editTipo === 'verdadero_falso') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Correcta:</span>
          <button type="button" onClick={() => setEditRespuestaCorrecta('true')}
            className={`px-3 py-1 rounded-lg text-xs font-outfit font-medium transition-all ${editRespuestaCorrecta === 'true' ? 'bg-crecimiento-400 text-white' : 'bg-neutro-nube text-neutro-piedra'}`}>
            Sí
          </button>
          <button type="button" onClick={() => setEditRespuestaCorrecta('false')}
            className={`px-3 py-1 rounded-lg text-xs font-outfit font-medium transition-all ${editRespuestaCorrecta === 'false' ? 'bg-impulso-400 text-white' : 'bg-neutro-nube text-neutro-piedra'}`}>
            No
          </button>
        </div>
      );
    }
    if (editTipo === 'escala') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutro-piedra font-outfit">Correcta:</span>
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} type="button" onClick={() => setEditRespuestaCorrecta(String(v))}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${editRespuestaCorrecta === String(v) ? 'bg-sol-400 text-white' : 'bg-neutro-nube text-neutro-piedra'}`}>
              {v}
            </button>
          ))}
        </div>
      );
    }
    if (editTipo === 'multiple_choice') {
      return (
        <div className="space-y-2">
          <span className="text-xs text-neutro-piedra font-outfit">Opciones:</span>
          {editOpciones.map((op, opIdx) => (
            <div key={opIdx} className="flex items-center gap-2">
              <button type="button"
                onClick={() => actualizarEditOpcion(opIdx, 'es_correcta', true)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  op.es_correcta ? 'bg-crecimiento-400 border-crecimiento-500 text-white' : 'border-neutro-piedra/30'
                }`}>
                {op.es_correcta && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <input type="text" value={op.texto_opcion}
                onChange={(e) => actualizarEditOpcion(opIdx, 'texto_opcion', e.target.value)}
                placeholder={`Opción ${opIdx + 1}`}
                className="flex-1 px-2 py-1 bg-white border border-neutro-piedra/20 rounded-lg text-xs font-outfit focus:ring-2 focus:ring-sol-400"
              />
              {editOpciones.length > 2 && (
                <button type="button"
                  onClick={() => setEditOpciones(prev => prev.filter((_, i) => i !== opIdx).map((o, i) => ({ ...o, orden: i + 1 })))}
                  className="p-0.5 text-impulso-500 hover:bg-impulso-50 rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button type="button"
            onClick={() => setEditOpciones(prev => [...prev, { texto_opcion: '', es_correcta: false, orden: prev.length + 1 }])}
            className="text-xs text-crecimiento-600 font-outfit font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar opción
          </button>
        </div>
      );
    }
    if (editTipo === 'ordenar_palabras') {
      const palabras = editDatosExtra?.palabras || editRespuestaCorrecta?.split('|') || ['', '', ''];
      return (
        <div className="space-y-2">
          <span className="text-xs text-neutro-piedra font-outfit">Palabras en orden correcto:</span>
          {palabras.map((palabra: string, wIdx: number) => (
            <div key={wIdx} className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sol-100 flex items-center justify-center text-sol-700 text-[10px] font-bold">
                {wIdx + 1}
              </span>
              <input type="text" value={palabra}
                onChange={(e) => {
                  const newPalabras = [...palabras];
                  newPalabras[wIdx] = e.target.value;
                  setEditDatosExtra({ palabras: newPalabras });
                }}
                placeholder={`Palabra ${wIdx + 1}`}
                className="flex-1 px-2 py-1 bg-white border border-neutro-piedra/20 rounded-lg text-xs font-outfit focus:ring-2 focus:ring-sol-400"
              />
              {palabras.length > 2 && (
                <button type="button"
                  onClick={() => {
                    const newPalabras = palabras.filter((_: string, i: number) => i !== wIdx);
                    setEditDatosExtra({ palabras: newPalabras });
                  }}
                  className="p-0.5 text-impulso-500 hover:bg-impulso-50 rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button type="button"
            onClick={() => setEditDatosExtra({ palabras: [...palabras, ''] })}
            className="text-xs text-sol-600 font-outfit font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar palabra
          </button>
        </div>
      );
    }
    if (editTipo === 'respuesta_imagen') {
      return (
        <div className="space-y-3">
          <div>
            <span className="text-xs text-neutro-piedra font-outfit block mb-1">URL de la imagen:</span>
            <input type="url" value={editImagenUrl}
              onChange={(e) => setEditImagenUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-2 py-1 bg-white border border-neutro-piedra/20 rounded-lg text-xs font-outfit focus:ring-2 focus:ring-sol-400"
            />
            {editImagenUrl && (
              <div className="mt-1 rounded-lg overflow-hidden border border-white/60 max-w-[200px]">
                <img src={editImagenUrl} alt="Preview" className="w-full h-20 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-xs text-neutro-piedra font-outfit">Opciones:</span>
            {editOpciones.map((op, opIdx) => (
              <div key={opIdx} className="flex items-center gap-2">
                <button type="button"
                  onClick={() => actualizarEditOpcion(opIdx, 'es_correcta', true)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    op.es_correcta ? 'bg-crecimiento-400 border-crecimiento-500 text-white' : 'border-neutro-piedra/30'
                  }`}>
                  {op.es_correcta && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <input type="text" value={op.texto_opcion}
                  onChange={(e) => actualizarEditOpcion(opIdx, 'texto_opcion', e.target.value)}
                  placeholder={`Opción ${opIdx + 1}`}
                  className="flex-1 px-2 py-1 bg-white border border-neutro-piedra/20 rounded-lg text-xs font-outfit focus:ring-2 focus:ring-sol-400"
                />
                {editOpciones.length > 2 && (
                  <button type="button"
                    onClick={() => setEditOpciones(prev => prev.filter((_, i) => i !== opIdx).map((o, i) => ({ ...o, orden: i + 1 })))}
                    className="p-0.5 text-impulso-500 hover:bg-impulso-50 rounded">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => setEditOpciones(prev => [...prev, { texto_opcion: '', es_correcta: false, orden: prev.length + 1 }])}
              className="text-xs text-crecimiento-600 font-outfit font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar opción
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!tienePermiso && perfil) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando banco de preguntas...</p>
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
              <Link
                href="/dashboard/autoevaluaciones/gestionar"
                className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-sol-500" />
                Banco de Preguntas
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Resumen por área */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {AREAS.map((a) => {
            const total = preguntas.filter((p) => p.area === a.value && p.activa).length;
            const inactivas = preguntas.filter((p) => p.area === a.value && !p.activa).length;
            const sinRespuesta = preguntas.filter((p) => p.area === a.value && p.activa && p.tipo_pregunta !== 'texto_libre' && !p.respuesta_correcta).length;
            return (
              <button
                key={a.value}
                onClick={() => setFiltroArea(filtroArea === a.value ? '' : a.value)}
                className={`bg-white/60 backdrop-blur-md rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                  filtroArea === a.value ? 'ring-2 ring-sol-400 border-sol-300' : 'border-white/60'
                }`}
              >
                <span className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold font-outfit border ${a.bg} ${a.color}`}>
                  {a.label}
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-neutro-carbon font-quicksand">{total}</span>
                  <span className="text-sm text-neutro-piedra font-outfit">activas</span>
                </div>
                {inactivas > 0 && (
                  <span className="text-xs text-neutro-piedra font-outfit">+{inactivas} inactivas</span>
                )}
                {sinRespuesta > 0 && (
                  <span className="text-xs text-impulso-600 font-outfit block">⚠ {sinRespuesta} sin rta. correcta</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Barra de acciones */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.1)] p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutro-piedra" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar preguntas..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-white/60 rounded-2xl text-neutro-carbon font-outfit text-sm focus:ring-2 focus:ring-sol-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setMostrarInactivas(!mostrarInactivas)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-outfit font-medium transition-all border ${
                mostrarInactivas
                  ? 'bg-neutro-piedra/20 border-neutro-piedra/30 text-neutro-carbon'
                  : 'bg-white/80 border-white/60 text-neutro-piedra'
              }`}
            >
              {mostrarInactivas ? 'Ocultar inactivas' : 'Mostrar inactivas'}
            </button>
            <button
              onClick={() => setModoCrear(!modoCrear)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit font-semibold active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Agregar Preguntas
            </button>
          </div>
        </div>

        {/* Formulario crear nuevas preguntas */}
        {modoCrear && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-crecimiento-200/40 shadow-[0_8px_32px_rgba(164,198,57,0.1)] p-6 mb-6">
            <h2 className="text-lg font-bold text-neutro-carbon font-quicksand mb-4">
              Nuevas preguntas para el banco
            </h2>

            <div className="space-y-4">
              {nuevasPreguntas.map((np, index) => (
                <div key={index} className="flex flex-col gap-3 bg-white/80 rounded-2xl p-4 border border-white/60">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-crecimiento-100 flex items-center justify-center text-crecimiento-700 font-bold text-sm font-quicksand">
                      {index + 1}
                    </span>

                    <div className="flex-1 space-y-3 w-full">
                      <textarea
                        value={np.pregunta}
                        onChange={(e) => actualizarNuevaPregunta(index, 'pregunta', e.target.value)}
                        placeholder="Escribe la pregunta..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-neutro-piedra/20 rounded-xl focus:ring-2 focus:ring-sol-400 text-neutro-carbon font-outfit text-sm resize-none placeholder:text-neutro-piedra/60"
                      />

                      <div className="flex gap-3">
                        <select
                          value={np.area}
                          onChange={(e) => actualizarNuevaPregunta(index, 'area', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-neutro-carbon font-outfit text-sm focus:ring-2 focus:ring-sol-400"
                        >
                          {AREAS.map((a) => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>

                        <select
                          value={np.tipo_pregunta}
                          onChange={(e) => actualizarNuevaPregunta(index, 'tipo_pregunta', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-neutro-carbon font-outfit text-sm focus:ring-2 focus:ring-sol-400"
                        >
                          {TIPOS_PREGUNTA.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Respuesta correcta input */}
                      <div className="bg-crecimiento-50/30 rounded-xl p-3 border border-crecimiento-200/20">
                        {renderRespuestaCorrectaInput(np, index)}
                      </div>
                    </div>

                    {nuevasPreguntas.length > 1 && (
                      <button
                        onClick={() => quitarFilaCrear(index)}
                        className="flex-shrink-0 p-2 text-impulso-600 hover:bg-impulso-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={agregarFilaCrear}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-md transition-all font-outfit text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Otra pregunta
              </button>

              <div className="flex-1" />

              <button
                onClick={() => {
                  setModoCrear(false);
                  setNuevasPreguntas([emptyNuevaPregunta()]);
                }}
                className="px-5 py-2.5 bg-white/80 border border-white/60 text-neutro-piedra rounded-2xl transition-all font-outfit text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevasPreguntas}
                disabled={guardando}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit text-sm font-semibold disabled:opacity-50 active:scale-95"
              >
                <Save className="w-4 h-4" />
                {guardando ? 'Guardando...' : 'Guardar al banco'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de preguntas por área */}
        {preguntasFiltradas.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-8 text-center">
            <BookOpen className="w-12 h-12 text-neutro-piedra/40 mx-auto mb-4" />
            <p className="text-neutro-carbon font-outfit text-lg mb-2">
              {busqueda ? 'No se encontraron preguntas' : 'El banco de preguntas está vacío'}
            </p>
            <p className="text-neutro-piedra font-outfit text-sm">
              {busqueda
                ? 'Probá con otros términos de búsqueda.'
                : 'Hacé clic en "Agregar Preguntas" para empezar a cargar el banco.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {preguntasPorArea.map((grupo) => (
              <div key={grupo.value}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-block px-4 py-1.5 rounded-2xl text-sm font-semibold font-outfit border ${grupo.bg} ${grupo.color}`}>
                    {grupo.label}
                  </span>
                  <span className="text-sm text-neutro-piedra font-outfit">
                    {grupo.preguntas.length} pregunta{grupo.preguntas.length !== 1 ? 's' : ''}
                    {grupo.totalBanco !== grupo.preguntas.length && ` (${grupo.totalBanco} activas en banco)`}
                  </span>
                </div>

                <div className="space-y-2">
                  {grupo.preguntas.map((p, index) => (
                    <div
                      key={p.id}
                      className={`group bg-white/60 backdrop-blur-md rounded-2xl border p-4 transition-all ${
                        !p.activa ? 'opacity-60 border-neutro-piedra/20' : 'border-white/60 hover:shadow-md'
                      } ${editandoId === p.id ? 'ring-2 ring-sol-400' : ''}`}
                    >
                      {editandoId === p.id ? (
                        // Modo edición
                        <div className="space-y-3">
                          <textarea
                            value={editTexto}
                            onChange={(e) => setEditTexto(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2.5 bg-white border border-neutro-piedra/20 rounded-xl focus:ring-2 focus:ring-sol-400 text-neutro-carbon font-outfit text-sm resize-none"
                            autoFocus
                          />
                          <div className="flex flex-wrap gap-3 items-center">
                            <select
                              value={editArea}
                              onChange={(e) => setEditArea(e.target.value as Area)}
                              className="px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400"
                            >
                              {AREAS.map((a) => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))}
                            </select>
                            <select
                              value={editTipo}
                              onChange={(e) => {
                                const newTipo = e.target.value as TipoPregunta;
                                setEditTipo(newTipo);
                                setEditRespuestaCorrecta('');
                                setEditImagenUrl('');
                                setEditDatosExtra(newTipo === 'ordenar_palabras' ? { palabras: ['', '', ''] } : null);
                                setEditOpciones((newTipo === 'multiple_choice' || newTipo === 'respuesta_imagen')
                                  ? [{ texto_opcion: '', es_correcta: true, orden: 1 }, { texto_opcion: '', es_correcta: false, orden: 2 }]
                                  : []);
                              }}
                              className="px-3 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-sm font-outfit focus:ring-2 focus:ring-sol-400"
                            >
                              {TIPOS_PREGUNTA.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          {/* Respuesta correcta edit */}
                          <div className="bg-crecimiento-50/30 rounded-xl p-3 border border-crecimiento-200/20">
                            {renderEditRespuestaCorrecta()}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelarEdicion}
                              className="p-2 text-neutro-piedra hover:bg-neutro-piedra/10 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={guardarEdicion}
                              className="flex items-center gap-1.5 px-4 py-2 bg-crecimiento-400 text-white rounded-xl text-sm font-outfit font-medium hover:bg-crecimiento-500 transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo lectura
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-neutro-nube flex items-center justify-center text-neutro-piedra font-bold text-xs font-quicksand mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-neutro-carbon font-outfit text-sm leading-relaxed">
                              {p.pregunta}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 bg-neutro-nube rounded-lg">
                                {TIPOS_PREGUNTA.find((t) => t.value === p.tipo_pregunta)?.label || p.tipo_pregunta}
                              </span>
                              {renderRespuestaCorrectaBadge(p)}
                              {p.tipo_pregunta === 'multiple_choice' && p.opciones.length > 0 && (
                                <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 bg-neutro-nube rounded-lg">
                                  {p.opciones.length} opciones
                                </span>
                              )}
                              {p.tipo_pregunta === 'respuesta_imagen' && p.opciones.length > 0 && (
                                <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 bg-neutro-nube rounded-lg">
                                  {p.opciones.length} opciones
                                </span>
                              )}
                              {p.tipo_pregunta === 'ordenar_palabras' && (
                                <span className="text-xs text-sol-700 font-outfit px-2 py-0.5 bg-sol-50 rounded-lg border border-sol-200/30">
                                  🔤 Ordenar
                                </span>
                              )}
                              {!p.activa && (
                                <span className="text-xs text-neutro-piedra font-outfit px-2 py-0.5 bg-neutro-piedra/10 rounded-lg">
                                  Inactiva
                                </span>
                              )}
                            </div>
                            {/* Show opciones in read mode for multiple_choice */}
                            {p.tipo_pregunta === 'multiple_choice' && p.opciones.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {p.opciones.map((op, oi) => (
                                  <div key={oi} className={`flex items-center gap-2 text-xs font-outfit px-2 py-1 rounded-lg ${
                                    op.es_correcta ? 'bg-crecimiento-50 text-crecimiento-700' : 'text-neutro-piedra'
                                  }`}>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      op.es_correcta ? 'bg-crecimiento-400 border-crecimiento-500 text-white' : 'border-neutro-piedra/30'
                                    }`}>
                                      {op.es_correcta && <CheckCircle2 className="w-3 h-3" />}
                                    </span>
                                    {op.texto_opcion}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Show image + opciones for respuesta_imagen */}
                            {p.tipo_pregunta === 'respuesta_imagen' && (
                              <div className="mt-2 space-y-2">
                                {p.imagen_url && (
                                  <div className="rounded-xl overflow-hidden border border-white/60 max-w-[200px]">
                                    <img src={p.imagen_url} alt="Imagen pregunta" className="w-full h-24 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  </div>
                                )}
                                {p.opciones.length > 0 && (
                                  <div className="space-y-1">
                                    {p.opciones.map((op, oi) => (
                                      <div key={oi} className={`flex items-center gap-2 text-xs font-outfit px-2 py-1 rounded-lg ${
                                        op.es_correcta ? 'bg-crecimiento-50 text-crecimiento-700' : 'text-neutro-piedra'
                                      }`}>
                                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                          op.es_correcta ? 'bg-crecimiento-400 border-crecimiento-500 text-white' : 'border-neutro-piedra/30'
                                        }`}>
                                          {op.es_correcta && <CheckCircle2 className="w-3 h-3" />}
                                        </span>
                                        {op.texto_opcion}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Show palabras for ordenar_palabras */}
                            {p.tipo_pregunta === 'ordenar_palabras' && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(p.datos_extra?.palabras || p.respuesta_correcta?.split('|') || []).map((palabra: string, wi: number) => (
                                  <span key={wi} className="inline-flex items-center gap-1 px-2 py-1 bg-sol-50 text-sol-700 rounded-lg text-xs font-outfit border border-sol-200/30">
                                    <span className="font-bold">{wi + 1}.</span> {palabra}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleActiva(p)}
                              className={`p-2 rounded-xl transition-all ${
                                p.activa
                                  ? 'text-crecimiento-600 hover:bg-crecimiento-50'
                                  : 'text-neutro-piedra hover:bg-neutro-nube'
                              }`}
                              title={p.activa ? 'Desactivar' : 'Activar'}
                            >
                              {p.activa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => iniciarEdicion(p)}
                              className="p-2 text-sol-600 hover:bg-sol-50 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarPregunta(p)}
                              className="p-2 text-impulso-600 hover:bg-impulso-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
