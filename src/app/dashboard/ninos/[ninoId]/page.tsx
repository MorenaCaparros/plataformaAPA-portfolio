'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { calcularEdad, formatearEdad } from '@/lib/utils/date-helpers';
import {
  ArrowLeft, Plus, BookOpen, ClipboardList, Target, Info, ChevronRight,
  UserCheck, Camera, Heart, GraduationCap, Phone, StickyNote, Calendar,
  Users, CheckCircle, XCircle, Upload, Trash2, Save, Stethoscope,
  Mic, Volume2, FileText, ChevronDown, ChevronUp, AlertTriangle, Pencil,
  X, History, MapPin
} from 'lucide-react';
import type { Nino, NinoSensible, Zona, Escuela, Perfil, FamiliarApoyo } from '@/types/database';
import FamiliarCard from '@/components/dashboard/FamiliarCard';
import GrabacionCard, { type GrabacionReunion } from '@/components/dashboard/GrabacionCard';

// ─── Helper: Drive URL → thumbnail URL for <img> tags ────────
function getDriveImageUrl(url: string | null): string | null {
  if (!url) return null;
  // Already a thumbnail URL — use as-is
  if (url.includes('drive.google.com/thumbnail')) return url;
  // webViewLink format: https://drive.google.com/file/d/{fileId}/view...
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  // lh3 format
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w800`;
  // Not a Drive URL (could be Supabase or other) — return as-is
  return url;
}

// ─── Types ───────────────────────────────────────────────────

interface NinoCompleto extends Nino {
  zonas: Pick<Zona, 'id' | 'nombre'> | null;
  escuelas: Pick<Escuela, 'id' | 'nombre'> | null;
  ninos_sensibles: NinoSensible | null;
}

interface Sesion {
  id: string;
  fecha: string;
  duracion_minutos: number;
  observaciones_libres: string;
  voluntario_id: string;
}

interface AsignacionActiva {
  id: string;
  fecha_asignacion: string;
  score_matching: number | null;
  voluntario: Pick<Perfil, 'id' | 'nombre' | 'apellido'> | null;
}

interface NotaBitacora {
  id: string;
  texto: string;
  fecha: string;
  autor_nombre: string;
}

// GrabacionReunion → re-exported desde @/components/dashboard/GrabacionCard

const TIPOS_PROFESIONAL_SALUD = [
  { value: 'psicologo_psicopedagogo', label: 'Psicólogo / Psicopedagogo' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo/a' },
  { value: 'terapista_ocupacional', label: 'Terapista ocupacional' },
  { value: 'neurologo', label: 'Neurólogo/a' },
  { value: 'psiquiatra', label: 'Psiquiatra' },
  { value: 'kinesiologo', label: 'Kinesiólogo/a' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'otro', label: 'Otro profesional' },
  // Legacy values for backward compatibility
  { value: 'psicologica', label: 'Psicológica' },
  { value: 'fonoaudiologica', label: 'Fonoaudiológica' },
  { value: 'psicopedagogica', label: 'Psicopedagógica' },
  { value: 'ocupacional', label: 'Ocupacional' },
  { value: 'otra', label: 'Otra' },
];

// ─── Component ───────────────────────────────────────────────

export default function NinoPerfilPage() {
  const params = useParams();
  const router = useRouter();
  const { user, perfil } = useAuth();
  const ninoId = params.ninoId as string;
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // State
  const [nino, setNino] = useState<NinoCompleto | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [asignacionActiva, setAsignacionActiva] = useState<AsignacionActiva | null>(null);
  const [familiares, setFamiliares] = useState<FamiliarApoyo[]>([]);
  const [familiarEditandoId, setFamiliarEditandoId] = useState<string | null>(null);
  const [familiarEditForm, setFamiliarEditForm] = useState<Partial<FamiliarApoyo>>({});
  const [guardandoFamiliar, setGuardandoFamiliar] = useState(false);
  const [notas, setNotas] = useState<NotaBitacora[]>([]);
  const [grabaciones, setGrabaciones] = useState<GrabacionReunion[]>([]);
  const [evaluacionesPsico, setEvaluacionesPsico] = useState<{
    id: string;
    fecha: string;
    conclusiones: string | null;
    acciones_sugeridas: string | null;
    autor_nombre: string;
  }[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [notaEditandoId, setNotaEditandoId] = useState<string | null>(null);
  const [notaEditandoTexto, setNotaEditandoTexto] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [eliminandoNotaId, setEliminandoNotaId] = useState<string | null>(null);
  const [asistenciaPorcentaje, setAsistenciaPorcentaje] = useState<number | null>(null);
  const [asistenciaHistorial, setAsistenciaHistorial] = useState<{ fecha: string; presente: boolean; motivo_ausencia: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total_sesiones: 0,
    mis_sesiones: 0,
    horas_totales: 0,
    primera_sesion: null as string | null,
    ultima_sesion: null as string | null,
  });

  // Editable fields (only for roles with edit access)
  const [editPermanencia, setEditPermanencia] = useState<boolean>(true);
  const [editAnoPermanencia, setEditAnoPermanencia] = useState<number>(new Date().getFullYear());
  const [editTerapia, setEditTerapia] = useState<string[]>([]);
  const [editComentariosSalud, setEditComentariosSalud] = useState<string>('');
  const [guardandoSalud, setGuardandoSalud] = useState(false);
  const [exitoSalud, setExitoSalud] = useState(false);
  const [editandoSalud, setEditandoSalud] = useState(false); // false = vista, true = formulario
  const [tieneEvaluacionInicial, setTieneEvaluacionInicial] = useState<boolean | null>(null);
  // Datos adicionales visibles para voluntarios (cargados desde API route)
  const [saludBasica, setSaludBasica] = useState<{
    alergias: string | null;
    medicacion_habitual: string | null;
    usa_lentes: boolean;
    usa_audifono: boolean;
    requiere_acompanamiento_especial: boolean;
  } | null>(null);
  const [contactoPrincipal, setContactoPrincipal] = useState<{
    tipo: string;
    nombre: string;
    telefono: string | null;
    relacion: string | null;
  } | null>(null);

  // ─── Modo edición inline ───────────────────────────────────
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editForm, setEditForm] = useState({
    alias: '',
    legajo: '',
    fecha_nacimiento: '',
    rango_etario: '',
    genero: '',
    nivel_alfabetizacion: '',
    escolarizado: false,
    grado_escolar: '',
    turno_escolar: '',
    activo: true,
    fecha_ingreso: '',
    zona_id: '',
    escuela_id: '',
  });
  const [editFormOriginal, setEditFormOriginal] = useState<typeof editForm | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [exitoEdicion, setExitoEdicion] = useState(false);
  const [ultimaEdicion, setUltimaEdicion] = useState<{ usuario: string; fecha: string } | null>(null);
  const [zonas, setZonas] = useState<{ id: string; nombre: string }[]>([]);
  const [escuelas, setEscuelas] = useState<{ id: string; nombre: string }[]>([]);
  const [zonasCargadas, setZonasCargadas] = useState(false);
  const [showZonaModal, setShowZonaModal] = useState(false);
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState('');
  const [creandoZona, setCreandoZona] = useState(false);
  const [showEscuelaModal, setShowEscuelaModal] = useState(false);
  const [nuevaEscuelaNombre, setNuevaEscuelaNombre] = useState('');
  const [creandoEscuela, setCreandoEscuela] = useState(false);
  // Quick zone selector (view mode)
  const [guardandoQuickZona, setGuardandoQuickZona] = useState(false);

  const isVoluntario = perfil?.rol === 'voluntario';
  const tieneAccesoCompleto = perfil?.rol && ['psicopedagogia', 'director', 'admin', 'coordinador', 'trabajador_social'].includes(perfil.rol);
  // equipo_profesional can edit basic nino fields + health, but can't see encrypted sensitive data
  const esEquipoProfesional = perfil?.rol === 'equipo_profesional';
  const puedeEditar = tieneAccesoCompleto || esEquipoProfesional;

  useEffect(() => {
    if (user) fetchDatos();
  }, [ninoId, user]);

  // ─── Data fetching ─────────────────────────────────────────

  const fetchDatos = async () => {
    try {
      setLoading(true);

      // 1. Niño with relations (CRITICAL — if this fails, redirect)
      // Para voluntarios usamos la API route (service_role) ya que RLS bloquea
      // la lectura directa de la tabla ninos con anon key.
      let ninoCompleto: NinoCompleto;

      if (isVoluntario) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Sin sesión');
        const res = await fetch(`/api/ninos/${ninoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`No se pudo cargar el niño (${res.status})`);
        const json = await res.json();
        ninoCompleto = json.nino as NinoCompleto;
        if (json.salud_basica) setSaludBasica(json.salud_basica);
        if (json.contacto_principal) setContactoPrincipal(json.contacto_principal);
      } else {
        const selectFields = tieneAccesoCompleto
          ? `*, zonas(id, nombre), escuelas(id, nombre), ninos_sensibles(*)`
          : `*, zonas(id, nombre), escuelas(id, nombre)`;

        const { data: ninoData, error: ninoError } = await supabase
          .from('ninos')
          .select(selectFields)
          .eq('id', ninoId)
          .single();

        if (ninoError) throw ninoError;
        ninoCompleto = ninoData as NinoCompleto;
      }

      setNino(ninoCompleto);

      // Load all zones for quick zone selector (puedeEditar users)
      if (tieneAccesoCompleto || perfil?.rol === 'equipo_profesional') {
        try {
          const { data: zonasData } = await supabase
            .from('zonas')
            .select('id, nombre')
            .eq('activa', true)
            .order('nombre', { ascending: true });
          if (zonasData) setZonas(zonasData);
        } catch (e) {
          // non-critical
        }
      }
      setEditPermanencia(ninoCompleto.activo);
      setEditAnoPermanencia(new Date().getFullYear());
      // 2a. Load salud_ninos (non-critical) — terapia + comentarios
      try {
        const { data: saludData } = await supabase
          .from('salud_ninos')
          .select('observaciones, condiciones_preexistentes')
          .eq('nino_id', ninoId)
          .maybeSingle();

        // condiciones_preexistentes stores terapia as "PROFESIONALES:val1,val2"
        const condiciones = saludData?.condiciones_preexistentes || '';
        if (condiciones.startsWith('PROFESIONALES:')) {
          const valores = condiciones.replace('PROFESIONALES:', '').split(',').filter(Boolean);
          setEditTerapia(valores);
        } else {
          setEditTerapia([]);
        }
        setEditComentariosSalud(saludData?.observaciones || '');
      } catch (e) {
        setEditTerapia([]);
        setEditComentariosSalud('');
      }

      // 2b. Check if child has a real psicopedagogical evaluation (entrevistas tipo='inicial')
      try {
        const { data: evalData } = await supabase
          .from('entrevistas')
          .select('id')
          .eq('nino_id', ninoId)
          .eq('tipo', 'inicial')
          .limit(1)
          .maybeSingle();
        setTieneEvaluacionInicial(!!evalData);
      } catch (e) {
        setTieneEvaluacionInicial(false);
      }

      // 2c. Load psicopedagogical evaluations for the dedicated section
      if (tieneAccesoCompleto || perfil?.rol === 'equipo_profesional') {
        try {
          const { data: evalsData } = await supabase
            .from('entrevistas')
            .select('id, fecha, conclusiones, acciones_sugeridas, perfiles:entrevistador_id(nombre, apellido)')
            .eq('nino_id', ninoId)
            .eq('tipo', 'inicial')
            .order('fecha', { ascending: false });

          if (evalsData) {
            setEvaluacionesPsico(
              evalsData.map((e: any) => ({
                id: e.id,
                fecha: e.fecha,
                conclusiones: e.conclusiones,
                acciones_sugeridas: e.acciones_sugeridas,
                autor_nombre: e.perfiles
                  ? `${e.perfiles.nombre} ${e.perfiles.apellido}`.trim()
                  : 'Desconocido',
              }))
            );
          }
        } catch (e) {
          // non-critical
        }
      }

      // 2. Active assignment (non-critical)
      try {
        const { data: asignacionData } = await supabase
          .from('asignaciones')
          .select('id, fecha_asignacion, score_matching, voluntario_id')
          .eq('nino_id', ninoId)
          .eq('activa', true)
          .limit(1)
          .maybeSingle();

        if (asignacionData) {
          // Fetch volunteer name separately to avoid FK hint issues
          let voluntario = null;
          if (asignacionData.voluntario_id) {
            const { data: volData } = await supabase
              .from('perfiles')
              .select('id, nombre, apellido')
              .eq('id', asignacionData.voluntario_id)
              .single();
            voluntario = volData;
          }
          setAsignacionActiva({
            id: asignacionData.id,
            fecha_asignacion: asignacionData.fecha_asignacion,
            score_matching: asignacionData.score_matching,
            voluntario,
          });
        }
      } catch (e) {
        console.warn('No se pudieron cargar asignaciones:', e);
      }

      // 3. Familiares / contacts (only for full-access roles, non-critical)
      if (tieneAccesoCompleto) {
        try {
          const { data: familiaresData } = await supabase
            .from('familiares_apoyo')
            .select('*')
            .eq('nino_id', ninoId)
            .order('tipo', { ascending: true });
          setFamiliares(familiaresData || []);
        } catch (e) {
          console.warn('No se pudieron cargar familiares:', e);
        }
      }

      // 4. Sessions (non-critical — table may not exist yet)
      try {
        let sesionesQuery = supabase
          .from('sesiones')
          .select('id, fecha, duracion_minutos, observaciones_libres, voluntario_id')
          .eq('nino_id', ninoId)
          .order('fecha', { ascending: false });

        if (isVoluntario) {
          sesionesQuery = sesionesQuery.eq('voluntario_id', user?.id);
        }

        const { data: sesionesData, error: sesionesError } = await sesionesQuery;
        
        if (!sesionesError) {
          setSesiones(sesionesData || []);

          // 5. Stats
          const { count: totalSesiones } = await supabase
            .from('sesiones')
            .select('*', { count: 'exact', head: true })
            .eq('nino_id', ninoId);

          const { count: misSesiones } = await supabase
            .from('sesiones')
            .select('*', { count: 'exact', head: true })
            .eq('nino_id', ninoId)
            .eq('voluntario_id', user?.id);

          const horasTotales = (sesionesData || []).reduce(
            (acc: number, s: any) => acc + (s.duracion_minutos || 0), 0
          );
          const fechaOrdenada = [...(sesionesData || [])].sort(
            (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
          );

          setEstadisticas({
            total_sesiones: totalSesiones || 0,
            mis_sesiones: misSesiones || 0,
            horas_totales: Math.round((horasTotales / 60) * 10) / 10,
            primera_sesion: fechaOrdenada[0]?.fecha || null,
            ultima_sesion: fechaOrdenada[fechaOrdenada.length - 1]?.fecha || null,
          });
        } else {
          console.warn('Tabla sesiones no disponible:', sesionesError.message);
        }
      } catch (e) {
        console.warn('No se pudieron cargar sesiones:', e);
      }

      // 6. Asistencia % + historial reciente (non-critical)
      try {
        const { count: totalAsistencias } = await supabase
          .from('asistencias')
          .select('*', { count: 'exact', head: true })
          .eq('nino_id', ninoId);
        const { count: presentes } = await supabase
          .from('asistencias')
          .select('*', { count: 'exact', head: true })
          .eq('nino_id', ninoId)
          .eq('presente', true);

        if (totalAsistencias && totalAsistencias > 0) {
          setAsistenciaPorcentaje(Math.round(((presentes || 0) / totalAsistencias) * 100));
        }

        // Historial reciente (últimos 20 registros)
        const { data: historialData } = await supabase
          .from('asistencias')
          .select('fecha, presente, motivo_ausencia')
          .eq('nino_id', ninoId)
          .order('fecha', { ascending: false })
          .limit(20);

        if (historialData) {
          setAsistenciaHistorial(historialData);
        }
      } catch (e) {
        console.warn('No se pudieron cargar asistencias:', e);
      }

      // 7. Notas / bitácora + Grabaciones (full access + equipo_profesional)
      // NOTE: Only fetch entrevistas that are NOT tipo='inicial' (those are psicopedagogical evaluations)
      const puedeEditarLocal = tieneAccesoCompleto || perfil?.rol === 'equipo_profesional';
      if (puedeEditarLocal) {
        try {
          const { data: notasData } = await supabase
            .from('entrevistas')
            .select('id, observaciones, fecha, entrevistador_id, perfiles:entrevistador_id(nombre, apellido)')
            .eq('nino_id', ninoId)
            .neq('tipo', 'inicial')
            .order('fecha', { ascending: false })
            .limit(20);

          if (notasData) {
            setNotas(
              notasData.map((n: any) => ({
                id: n.id,
                texto: n.observaciones || '',
                fecha: n.fecha,
                autor_nombre: n.perfiles
                  ? `${n.perfiles.nombre} ${n.perfiles.apellido}`
                  : 'Desconocido',
              }))
            );
          }
        } catch (e) {
          console.warn('No se pudieron cargar notas:', e);
        }

        // 8. Grabaciones de reuniones
        try {
          const { data: grabacionesData } = await supabase
            .from('grabaciones_voz')
            .select('id, storage_path, transcripcion, duracion_segundos, fecha_grabacion, entrevista_id, perfiles:usuario_id(nombre, apellido), entrevistas:entrevista_id(conclusiones)')
            .eq('nino_id', ninoId)
            .order('fecha_grabacion', { ascending: false })
            .limit(20);

          if (grabacionesData) {
            setGrabaciones(
              grabacionesData.map((g: any) => ({
                id: g.id,
                storage_path: g.storage_path,
                transcripcion: g.transcripcion,
                duracion_segundos: g.duracion_segundos,
                fecha_grabacion: g.fecha_grabacion,
                entrevista_conclusiones: g.entrevistas?.conclusiones || null,
                autor_nombre: g.perfiles
                  ? `${g.perfiles.nombre} ${g.perfiles.apellido}`
                  : 'Desconocido',
              }))
            );
          }
        } catch (e) {
          console.warn('No se pudieron cargar grabaciones:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching datos del niño:', error);
      alert('Error al cargar los datos del niño. Verificá que el niño existe.');
      router.push(isVoluntario ? '/dashboard' : '/dashboard/ninos');
    } finally {
      setLoading(false);
    }
  };

  // ─── Actions ───────────────────────────────────────────────

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !nino) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccioná una imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }

    try {
      setSubiendoFoto(true);
      const ext = file.name.split('.').pop();
      const path = `ninos/${ninoId}/perfil.${ext}`;

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Sesión expirada. Recargá la página.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/storage/upload?bucket=fotos-perfil&path=${encodeURIComponent(path)}&table=ninos&id=${ninoId}&column=foto_perfil_url`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir foto');

      setNino({ ...nino, foto_perfil_url: data.url });
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      alert(error.message || 'Error al subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleGuardarNota = async () => {
    if (!nuevaNota.trim() || !user) return;

    try {
      setGuardando(true);
      const { data, error } = await supabase
        .from('entrevistas')
        .insert({
          nino_id: ninoId,
          entrevistador_id: user.id,
          tipo: 'nota_bitacora',
          fecha: new Date().toISOString().split('T')[0],
          observaciones: nuevaNota.trim(),
        })
        .select('id, observaciones, fecha')
        .single();

      if (error) throw error;

      setNotas([
        {
          id: data.id,
          texto: data.observaciones || '',
          fecha: data.fecha,
          autor_nombre: `${(perfil as any)?.nombre || (perfil as any)?.metadata?.nombre || ''} ${(perfil as any)?.apellido || (perfil as any)?.metadata?.apellido || ''}`.trim() || 'Yo',
        },
        ...notas,
      ]);
      setNuevaNota('');
    } catch (error) {
      console.error('Error guardando nota:', error);
      alert('Error al guardar la nota');
    } finally {
      setGuardando(false);
    }
  };

  const handleTogglePermanencia = async (valor: boolean) => {
    if (!nino) return;
    try {
      const { error } = await supabase
        .from('ninos')
        .update({ activo: valor })
        .eq('id', ninoId);
      if (error) throw error;
      setEditPermanencia(valor);
      setNino({ ...nino, activo: valor });
    } catch (error) {
      console.error('Error actualizando permanencia:', error);
    }
  };

  const handleGuardarSalud = async () => {
    if (!nino) return;
    try {
      setGuardandoSalud(true);

      // Upsert salud_ninos — tipo_terapia stored as "PROFESIONALES:val1,val2" in condiciones_preexistentes
      const condicionesTexto = editTerapia.length > 0
        ? `PROFESIONALES:${editTerapia.join(',')}`
        : null;

      const { error: saludError } = await supabase
        .from('salud_ninos')
        .upsert(
          {
            nino_id: ninoId,
            condiciones_preexistentes: condicionesTexto,
            observaciones: editComentariosSalud.trim() || null,
            ultima_actualizacion: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'nino_id' }
        );
      if (saludError) throw saludError;

      setExitoSalud(true);
      setEditandoSalud(false); // volver a modo vista
      setTimeout(() => setExitoSalud(false), 3000);

    } catch (error) {
      console.error('Error guardando salud:', error);
      alert('Error al guardar datos de salud');
    } finally {
      setGuardandoSalud(false);
    }
  };

  // ─── Notas: editar y eliminar ─────────────────────────────

  const handleEditarNota = (nota: NotaBitacora) => {
    setNotaEditandoId(nota.id);
    setNotaEditandoTexto(nota.texto);
  };

  const handleGuardarNotaEditada = async () => {
    if (!notaEditandoId || !notaEditandoTexto.trim()) return;
    try {
      setGuardandoNota(true);
      const { error } = await supabase
        .from('entrevistas')
        .update({ observaciones: notaEditandoTexto.trim() })
        .eq('id', notaEditandoId);
      if (error) throw error;
      setNotas((prev) =>
        prev.map((n) => n.id === notaEditandoId ? { ...n, texto: notaEditandoTexto.trim() } : n)
      );
      setNotaEditandoId(null);
      setNotaEditandoTexto('');
    } catch (err) {
      console.error('Error editando nota:', err);
      alert('Error al editar la nota');
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleEliminarNota = async (id: string) => {
    if (!confirm('¿Eliminás esta nota? Esta acción no se puede deshacer.')) return;
    try {
      setEliminandoNotaId(id);
      const { error } = await supabase.from('entrevistas').delete().eq('id', id);
      if (error) throw error;
      setNotas((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error eliminando nota:', err);
      alert('Error al eliminar la nota');
    } finally {
      setEliminandoNotaId(null);
    }
  };

  // ─── Familiares: editar / crear ──────────────────────────

  const handleAbrirEditarFamiliar = (familiar: FamiliarApoyo) => {
    setFamiliarEditandoId(familiar.id);
    setFamiliarEditForm({
      nombre: familiar.nombre || '',
      telefono: familiar.telefono || '',
      email: familiar.email || '',
      relacion: familiar.relacion || '',
      vive_con_nino: familiar.vive_con_nino ?? false,
      es_contacto_principal: familiar.es_contacto_principal ?? false,
      notas: familiar.notas || '',
    });
  };

  const handleAbrirCrearFamiliar = (tipo: string) => {
    setFamiliarEditandoId(`__nuevo__${tipo}`);
    setFamiliarEditForm({
      nombre: '',
      telefono: '',
      email: '',
      relacion: '',
      vive_con_nino: false,
      es_contacto_principal: false,
      notas: '',
    });
  };

  const handleGuardarFamiliar = async () => {
    if (!familiarEditandoId) return;
    const esNuevo = familiarEditandoId.startsWith('__nuevo__');
    try {
      setGuardandoFamiliar(true);
      if (esNuevo) {
        const tipo = familiarEditandoId.replace('__nuevo__', '');
        const { data, error } = await supabase
          .from('familiares_apoyo')
          .insert({
            nino_id: ninoId,
            tipo,
            nombre: familiarEditForm.nombre || null,
            telefono: familiarEditForm.telefono || null,
            email: familiarEditForm.email || null,
            relacion: familiarEditForm.relacion || null,
            vive_con_nino: familiarEditForm.vive_con_nino ?? false,
            es_contacto_principal: familiarEditForm.es_contacto_principal ?? false,
            notas: familiarEditForm.notas || null,
          })
          .select()
          .single();
        if (error) throw error;
        setFamiliares((prev) => [...prev, data as FamiliarApoyo]);
      } else {
        const { error } = await supabase
          .from('familiares_apoyo')
          .update({
            nombre: familiarEditForm.nombre || null,
            telefono: familiarEditForm.telefono || null,
            email: familiarEditForm.email || null,
            relacion: familiarEditForm.relacion || null,
            vive_con_nino: familiarEditForm.vive_con_nino,
            es_contacto_principal: familiarEditForm.es_contacto_principal,
            notas: familiarEditForm.notas || null,
          })
          .eq('id', familiarEditandoId);
        if (error) throw error;
        setFamiliares((prev) =>
          prev.map((f) => f.id === familiarEditandoId ? { ...f, ...familiarEditForm } as FamiliarApoyo : f)
        );
      }
      setFamiliarEditandoId(null);
      setFamiliarEditForm({});
    } catch (err) {
      console.error('Error guardando familiar:', err);
      alert('Error al guardar los datos del familiar');
    } finally {
      setGuardandoFamiliar(false);
    }
  };

  // ─── Crear nueva zona / escuela desde modal ───────────────

  // ─── Quick zone change (view mode) ───────────────────────
  const handleQuickZonaChange = async (zonaId: string) => {
    if (!nino) return;
    setGuardandoQuickZona(true);
    try {
      const { error } = await supabase
        .from('ninos')
        .update({ zona_id: zonaId || null })
        .eq('id', ninoId);
      if (!error) {
        const zonaObj = zonas.find(z => z.id === zonaId) ?? null;
        setNino(prev => prev
          ? { ...prev, zona_id: zonaId || null, zonas: zonaObj ? { id: zonaObj.id, nombre: zonaObj.nombre } : null }
          : prev
        );
      }
    } finally {
      setGuardandoQuickZona(false);
    }
  };

  // ─── Crear nueva zona / escuela desde modal ───────────────

  const handleCrearZona = async () => {
    const nombre = nuevaZonaNombre.trim();
    if (!nombre) return;
    setCreandoZona(true);
    try {
      const { data, error } = await supabase
        .from('zonas')
        .insert({ nombre, activa: true })
        .select('id, nombre')
        .single();
      if (error) throw error;
      setZonas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEditForm((prev) => ({ ...prev, zona_id: data.id }));
      setShowZonaModal(false);
      setNuevaZonaNombre('');
    } catch (err: any) {
      alert('Error al crear zona: ' + err.message);
    } finally {
      setCreandoZona(false);
    }
  };

  const handleCrearEscuela = async () => {
    const nombre = nuevaEscuelaNombre.trim();
    if (!nombre) return;
    setCreandoEscuela(true);
    try {
      const { data, error } = await supabase
        .from('escuelas')
        .insert({ nombre, activa: true })
        .select('id, nombre')
        .single();
      if (error) throw error;
      setEscuelas((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEditForm((prev) => ({ ...prev, escuela_id: data.id }));
      setShowEscuelaModal(false);
      setNuevaEscuelaNombre('');
    } catch (err: any) {
      alert('Error al crear escuela: ' + err.message);
    } finally {
      setCreandoEscuela(false);
    }
  };

  // ─── Edición inline datos del niño ────────────────────────

  const abrirEdicion = async () => {    if (!nino) return;
    const form = {
      alias: nino.alias || '',
      legajo: nino.legajo || '',
      fecha_nacimiento: nino.fecha_nacimiento || '',
      rango_etario: nino.rango_etario || '',
      genero: nino.genero || '',
      nivel_alfabetizacion: nino.nivel_alfabetizacion || '',
      escolarizado: nino.escolarizado ?? false,
      grado_escolar: nino.grado_escolar || '',
      turno_escolar: nino.turno_escolar || '',
      activo: nino.activo ?? true,
      fecha_ingreso: nino.fecha_ingreso || '',
      zona_id: nino.zona_id || '',
      escuela_id: nino.escuela_id || '',
    };
    setEditForm(form);
    setEditFormOriginal(form);
    setErrorEdicion(null);
    setExitoEdicion(false);

    // Cargar zonas y escuelas si no están cargadas
    if (!zonasCargadas) {
      const [{ data: z }, { data: e }] = await Promise.all([
        supabase.from('zonas').select('id, nombre').eq('activa', true).order('nombre'),
        supabase.from('escuelas').select('id, nombre').eq('activa', true).order('nombre'),
      ]);
      setZonas(z || []);
      setEscuelas(e || []);
      setZonasCargadas(true);
    }

    // Cargar última edición del historial
    try {
      const { data: historialData } = await supabase
        .from('historial_cambios')
        .select('created_at, usuario_id')
        .eq('tabla', 'ninos')
        .eq('registro_id', ninoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historialData) {
        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('nombre, apellido')
          .eq('id', historialData.usuario_id)
          .single();
        setUltimaEdicion({
          usuario: perfilData ? `${perfilData.nombre} ${perfilData.apellido}`.trim() : 'Desconocido',
          fecha: historialData.created_at,
        });
      } else {
        setUltimaEdicion(null);
      }
    } catch { /* historial no crítico */ }

    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setErrorEdicion(null);
    setExitoEdicion(false);
  };

  const handleGuardarEdicion = async () => {
    if (!user || !editFormOriginal || !nino) return;
    if (!editForm.alias.trim()) {
      setErrorEdicion('El alias es obligatorio.');
      return;
    }
    try {
      setGuardandoEdicion(true);
      setErrorEdicion(null);

      // Detectar cambios
      const camposModificados: string[] = [];
      const datosAnteriores: Record<string, unknown> = {};
      const datosNuevos: Record<string, unknown> = {};

      (Object.keys(editForm) as (keyof typeof editForm)[]).forEach((key) => {
        const orig = editFormOriginal[key] === '' ? null : editFormOriginal[key];
        const nuevo = editForm[key] === '' ? null : editForm[key];
        if (orig !== nuevo) {
          camposModificados.push(key);
          datosAnteriores[key] = editFormOriginal[key];
          datosNuevos[key] = editForm[key];
        }
      });

      if (camposModificados.length === 0) {
        setErrorEdicion('No hay cambios para guardar.');
        return;
      }

      const updatePayload: Record<string, unknown> = {};
      camposModificados.forEach((key) => {
        const val = editForm[key as keyof typeof editForm];
        updatePayload[key] = val === '' ? null : val;
      });

      const { error: updateError } = await supabase
        .from('ninos')
        .update(updatePayload)
        .eq('id', ninoId);
      if (updateError) throw updateError;

      // Registrar en historial_cambios
      await supabase.from('historial_cambios').insert({
        tabla: 'ninos',
        registro_id: ninoId,
        operacion: 'UPDATE',
        usuario_id: user.id,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        columnas_modificadas: camposModificados,
      });

      // Actualizar nino en estado local
      const zonaActualizada = zonas.find((z) => z.id === editForm.zona_id) || nino.zonas;
      const escuelaActualizada = escuelas.find((e) => e.id === editForm.escuela_id) || nino.escuelas;
      setNino({
        ...nino,
        ...updatePayload,
        zonas: zonaActualizada as any,
        escuelas: escuelaActualizada as any,
      } as NinoCompleto);

      // Actualizar badge de última edición
      setUltimaEdicion({
        usuario: `${(perfil as any)?.nombre || ''} ${(perfil as any)?.apellido || ''}`.trim(),
        fecha: new Date().toISOString(),
      });

      setEditFormOriginal({ ...editForm });
      setExitoEdicion(true);
      setTimeout(() => {
        setModoEdicion(false);
        setExitoEdicion(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error guardando edición:', err);
      setErrorEdicion(err.message || 'Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatearFechaRelativa = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`;
    return formatearFecha(fecha);
  };

  const getFamiliarPorTipo = (tipo: string) => familiares.filter((f) => f.tipo === tipo);
  const madre = getFamiliarPorTipo('madre')[0];
  const padre = getFamiliarPorTipo('padre')[0];
  const referenteEscolar = getFamiliarPorTipo('referente_escolar')[0];

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sol-50 via-white to-crecimiento-50 flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(164,198,57,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4" />
          <p className="text-neutro-piedra font-outfit">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!nino) return null;

  const edadTexto = formatearEdad(nino.fecha_nacimiento, nino.rango_etario);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-white to-crecimiento-50 pb-28">
      {/* ═══ Header ═══ */}
      <div className="bg-white/70 backdrop-blur-lg border-b border-white/60 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-crecimiento-600 hover:text-crecimiento-700 font-medium mb-3 flex items-center gap-2 touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>

          <div className="flex items-start gap-4">
            {/* Foto de perfil */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-sol-200 to-crecimiento-200 flex items-center justify-center shadow-lg">
                {nino.foto_perfil_url ? (
                  <img
                    src={getDriveImageUrl(nino.foto_perfil_url) || nino.foto_perfil_url}
                    alt={nino.alias}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {nino.alias.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {puedeEditar && (
                <>
                  <button
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={subiendoFoto}
                    className="absolute -bottom-1 -right-1 w-11 h-11 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    title="Cambiar foto"
                  >
                    {subiendoFoto ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSubirFoto}
                  />
                </>
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">
                {tieneAccesoCompleto && nino.ninos_sensibles?.nombre_completo_encrypted
                  ? `${nino.ninos_sensibles.nombre_completo_encrypted} ${nino.ninos_sensibles.apellido_encrypted || ''}`.trim()
                  : nino.alias}
              </h1>
              {tieneAccesoCompleto && nino.ninos_sensibles?.nombre_completo_encrypted && (
                <p className="text-sm text-gray-500 mb-1">
                  Alias: <span className="font-medium">{nino.alias}</span>
                </p>
              )}
              {nino.legajo && (
                <p className="text-sm text-gray-500 font-mono mb-2">Legajo: {nino.legajo}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {edadTexto && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-sol-100 text-sol-700 font-medium">
                    {edadTexto}
                  </span>
                )}
                {nino.fecha_nacimiento && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatearFecha(nino.fecha_nacimiento)}
                  </span>
                )}
                {nino.escolarizado && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crecimiento-100 text-crecimiento-700 font-medium">
                    <GraduationCap className="w-4 h-4" />
                    {nino.grado_escolar || 'Escolarizado'}
                  </span>
                )}
                {nino.zonas && !puedeEditar && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-impulso-100 text-impulso-700 font-medium">
                    <MapPin className="w-3 h-3" />
                    {nino.zonas.nombre}
                  </span>
                )}
                {puedeEditar && zonas.length > 0 && (
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-impulso-50 border border-impulso-200 text-impulso-700 font-medium cursor-pointer hover:bg-impulso-100 transition-colors">
                    <MapPin className="w-3 h-3 text-impulso-500 flex-shrink-0" />
                    <select
                      value={nino.zona_id || ''}
                      onChange={(e) => handleQuickZonaChange(e.target.value)}
                      disabled={guardandoQuickZona}
                      className="text-sm bg-transparent border-none outline-none text-impulso-700 font-medium cursor-pointer disabled:opacity-50 max-w-[140px]"
                      title="Cambiar zona"
                    >
                      <option value="">Sin zona</option>
                      {zonas.map(z => (
                        <option key={z.id} value={z.id}>{z.nombre}</option>
                      ))}
                    </select>
                    {guardandoQuickZona && (
                      <div className="w-3 h-3 animate-spin rounded-full border-2 border-impulso-300 border-t-impulso-600 flex-shrink-0" />
                    )}
                  </label>
                )}
                {/* Permanencia badge */}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium ${
                    nino.activo
                      ? 'bg-crecimiento-100 text-crecimiento-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {nino.activo ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> Activo</>
                  ) : (
                    <><XCircle className="w-3.5 h-3.5" /> Inactivo</>
                  )}
                </span>
                {/* Asistencia badge */}
                {asistenciaPorcentaje !== null && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${
                      asistenciaPorcentaje >= 75
                        ? 'bg-crecimiento-100 text-crecimiento-700'
                        : asistenciaPorcentaje >= 50
                        ? 'bg-sol-100 text-sol-700'
                        : 'bg-impulso-100 text-impulso-700'
                    }`}
                  >
                    Asistencia: {asistenciaPorcentaje}%
                  </span>
                )}
                {/* Evaluación inicial badge */}
                {tieneEvaluacionInicial !== null && (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium text-xs ${
                      tieneEvaluacionInicial
                        ? 'bg-crecimiento-100 text-crecimiento-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={tieneEvaluacionInicial ? 'Tiene evaluación psicopedagógica inicial' : 'Sin evaluación psicopedagógica inicial'}
                  >
                    {tieneEvaluacionInicial ? (
                      <><CheckCircle className="w-3.5 h-3.5" /> Evaluación inicial</>
                    ) : (
                      <><AlertTriangle className="w-3.5 h-3.5" /> Sin eval. inicial</>
                    )}
                  </span>
                )}
              </div>
              {/* Badge última modificación */}
              {ultimaEdicion && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <History className="w-3.5 h-3.5" />
                  <span>
                    Modificado por <span className="font-medium text-gray-500">{ultimaEdicion.usuario}</span>{' '}
                    el {new Date(ultimaEdicion.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex gap-2">
              {!isVoluntario && (
                <button
                  onClick={() => router.push(`/dashboard/ninos/${ninoId}/asignar-voluntario`)}
                  className="px-4 py-2.5 bg-gradient-to-r from-impulso-400 to-crecimiento-500 hover:from-impulso-500 hover:to-crecimiento-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span className="hidden sm:inline">Asignar</span>
                </button>
              )}
              <button
                onClick={() => router.push(`/dashboard/sesiones/nueva/${ninoId}`)}
                className="px-4 py-2.5 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Nueva Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Panel de edición inline ═══ */}
      {modoEdicion && (
        <div className="bg-[#F9F7F3] border-b border-sol-200/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8">

              {/* Título del panel */}
              <div className="flex items-center gap-2 mb-6">
                <Pencil className="w-5 h-5 text-sol-500" />
                <h2 className="text-lg font-semibold text-neutro-carbon font-quicksand">
                  Editar datos de {nino.alias}
                </h2>
              </div>

              {/* Aviso auditoría */}
              <div className="flex items-start gap-2 bg-sol-50 border border-sol-200 rounded-2xl px-4 py-3 mb-6 text-sm text-sol-800">
                <History className="w-4 h-4 mt-0.5 flex-shrink-0 text-sol-600" />
                <span>Todos los cambios quedan registrados en el historial de auditoría con tu usuario y la fecha.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Alias */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">
                    Alias <span className="text-impulso-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.alias}
                    onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] placeholder:text-neutro-piedra/60 transition-all"
                    placeholder="Alias del niño"
                  />
                </div>

                {/* Legajo */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Legajo</label>
                  <input
                    type="text"
                    value={editForm.legajo}
                    onChange={(e) => setEditForm({ ...editForm, legajo: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] placeholder:text-neutro-piedra/60 transition-all"
                    placeholder="Número de legajo"
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={editForm.fecha_nacimiento}
                    onChange={(e) => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  />
                </div>

                {/* Rango etario */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Rango etario</label>
                  <select
                    value={editForm.rango_etario}
                    onChange={(e) => setEditForm({ ...editForm, rango_etario: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  >
                    <option value="">Sin especificar</option>
                    {['5-7', '8-10', '11-13', '14-16', '17+'].map((r) => (
                      <option key={r} value={r}>{r} años</option>
                    ))}
                  </select>
                </div>

                {/* Género */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Género</label>
                  <select
                    value={editForm.genero}
                    onChange={(e) => setEditForm({ ...editForm, genero: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  >
                    <option value="">Sin especificar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="no_binario">No binario</option>
                    <option value="prefiere_no_decir">Prefiere no decir</option>
                  </select>
                </div>

                {/* Nivel de alfabetización */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Nivel de alfabetización</label>
                  <select
                    value={editForm.nivel_alfabetizacion}
                    onChange={(e) => setEditForm({ ...editForm, nivel_alfabetizacion: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  >
                    <option value="">Sin especificar</option>
                    <option value="no_alfabetizado">No alfabetizado</option>
                    <option value="pre_silabico">Pre-silábico</option>
                    <option value="silabico">Silábico</option>
                    <option value="silabico_alfabetico">Silábico-alfabético</option>
                    <option value="alfabetizado">Alfabetizado</option>
                  </select>
                </div>

                {/* Escolarizado — radio */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-3">¿Está escolarizado?</label>
                  <div className="flex gap-4">
                    {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(({ value, label }) => (
                      <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_escolarizado"
                          checked={editForm.escolarizado === value}
                          onChange={() => setEditForm({ ...editForm, escolarizado: value })}
                          className="w-4 h-4 text-sol-500 border-gray-300 focus:ring-sol-400"
                        />
                        <span className="text-sm text-neutro-carbon font-outfit">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Activo — radio */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-3">¿Está activo en el programa?</label>
                  <div className="flex gap-4">
                    {[{ value: true, label: 'Sí — Activo' }, { value: false, label: 'No — Inactivo' }].map(({ value, label }) => (
                      <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_activo"
                          checked={editForm.activo === value}
                          onChange={() => setEditForm({ ...editForm, activo: value })}
                          className="w-4 h-4 text-sol-500 border-gray-300 focus:ring-sol-400"
                        />
                        <span className="text-sm text-neutro-carbon font-outfit">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Grado escolar (solo si escolarizado) */}
                {editForm.escolarizado && (
                  <div>
                    <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Grado escolar</label>
                    <select
                      value={editForm.grado_escolar}
                      onChange={(e) => setEditForm({ ...editForm, grado_escolar: e.target.value })}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                    >
                      <option value="">Sin especificar</option>
                      {['1°', '2°', '3°', '4°', '5°', '6°', '7°'].map((g) => (
                        <option key={g} value={g}>{g} grado</option>
                      ))}
                      {['1° sec', '2° sec', '3° sec', '4° sec', '5° sec'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Turno escolar (solo si escolarizado) */}
                {editForm.escolarizado && (
                  <div>
                    <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Turno escolar</label>
                    <select
                      value={editForm.turno_escolar}
                      onChange={(e) => setEditForm({ ...editForm, turno_escolar: e.target.value })}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                    >
                      <option value="">Sin especificar</option>
                      <option value="mañana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                      <option value="jornada_completa">Jornada completa</option>
                    </select>
                  </div>
                )}

                {/* Escuela (solo si escolarizado) */}
                {editForm.escolarizado && (
                  <div>
                    <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">
                      <GraduationCap className="inline w-4 h-4 mr-1" />
                      Escuela
                    </label>
                    <select
                      value={editForm.escuela_id}
                      onChange={(e) => {
                        if (e.target.value === '__nueva__') {
                          setShowEscuelaModal(true);
                        } else {
                          setEditForm({ ...editForm, escuela_id: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                    >
                      <option value="">Sin escuela asignada</option>
                      {escuelas.map((e) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                      <option value="__nueva__">＋ Agregar escuela...</option>
                    </select>
                  </div>
                )}

                {/* Zona */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Zona
                  </label>
                  <select
                    value={editForm.zona_id}
                    onChange={(e) => {
                      if (e.target.value === '__nueva__') {
                        setShowZonaModal(true);
                      } else {
                        setEditForm({ ...editForm, zona_id: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  >
                    <option value="">Sin zona asignada</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                    <option value="__nueva__">＋ Agregar zona...</option>
                  </select>
                </div>

                {/* Fecha de ingreso */}
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Fecha de ingreso al programa</label>
                  <input
                    type="date"
                    value={editForm.fecha_ingreso}
                    onChange={(e) => setEditForm({ ...editForm, fecha_ingreso: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
                  />
                </div>

              </div>

              {/* Feedback error / éxito */}
              {errorEdicion && (
                <div className="mt-5 flex items-center gap-2 bg-impulso-50 border border-impulso-200 rounded-2xl px-4 py-3 text-sm text-impulso-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {errorEdicion}
                </div>
              )}
              {exitoEdicion && (
                <div className="mt-5 flex items-center gap-2 bg-crecimiento-50 border border-crecimiento-200 rounded-2xl px-4 py-3 text-sm text-crecimiento-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ¡Cambios guardados correctamente!
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/60">
                <button
                  onClick={handleGuardarEdicion}
                  disabled={guardandoEdicion || exitoEdicion}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sol-400 to-crecimiento-500 hover:from-sol-500 hover:to-crecimiento-600 disabled:opacity-60 text-white rounded-2xl font-semibold font-outfit shadow-md hover:shadow-lg transition-all touch-manipulation min-h-[48px]"
                >
                  {guardandoEdicion ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : exitoEdicion ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {guardandoEdicion ? 'Guardando...' : exitoEdicion ? '¡Guardado!' : 'Guardar cambios'}
                </button>
                <button
                  onClick={cancelarEdicion}
                  disabled={guardandoEdicion}
                  className="px-5 py-3 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl font-semibold font-outfit hover:bg-white transition-all touch-manipulation min-h-[48px]"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ═══ Estadísticas ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-xs text-gray-500 mb-1">Total Sesiones</p>
            <p className="text-3xl font-bold text-gray-900">{estadisticas.total_sesiones}</p>
          </div>
          {isVoluntario && (
            <div className="bg-white rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 mb-1">Mis Sesiones</p>
              <p className="text-3xl font-bold text-crecimiento-600">{estadisticas.mis_sesiones}</p>
            </div>
          )}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-xs text-gray-500 mb-1">Horas Totales</p>
            <p className="text-3xl font-bold text-gray-900">{estadisticas.horas_totales}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-xs text-gray-500 mb-1">Última Sesión</p>
            <p className="text-sm font-bold text-gray-900">
              {estadisticas.ultima_sesion
                ? formatearFechaRelativa(estadisticas.ultima_sesion)
                : 'Ninguna'}
            </p>
          </div>
          {asistenciaPorcentaje !== null && (
            <div className="bg-white rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 mb-1">Asistencia</p>
              <p className={`text-3xl font-bold ${
                asistenciaPorcentaje >= 75 ? 'text-crecimiento-600' :
                asistenciaPorcentaje >= 50 ? 'text-sol-600' : 'text-impulso-600'
              }`}>
                {asistenciaPorcentaje}%
              </p>
            </div>
          )}
        </div>

        {/* ═══ Historial de Asistencia ═══ */}
        {asistenciaHistorial.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-crecimiento-500" />
              Historial de Asistencia
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {asistenciaHistorial.map((reg, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    reg.presente
                      ? 'bg-crecimiento-50/60'
                      : 'bg-impulso-50/60'
                  }`}
                >
                  {reg.presente ? (
                    <CheckCircle className="w-4 h-4 text-crecimiento-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-impulso-600 flex-shrink-0" />
                  )}
                  <span className="font-medium text-gray-700 min-w-[100px]">
                    {new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`font-semibold ${reg.presente ? 'text-crecimiento-700' : 'text-impulso-700'}`}>
                    {reg.presente ? 'Presente' : 'Ausente'}
                  </span>
                  {!reg.presente && reg.motivo_ausencia && (
                    <span className="text-gray-500 text-xs ml-auto truncate max-w-[200px]" title={reg.motivo_ausencia}>
                      — {reg.motivo_ausencia}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Información útil para voluntarios ═══ */}
        {isVoluntario && (nino.escuelas || nino.grado_escolar || saludBasica || contactoPrincipal || tieneEvaluacionInicial !== null) && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-crecimiento-500" />
              Información del Niño
            </h2>

            {/* Escolarización */}
            {(nino.escuelas || nino.grado_escolar || nino.escolarizado !== undefined) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  Escolarización
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">¿Va a la escuela?</p>
                    <p className="font-medium text-gray-900">{nino.escolarizado ? 'Sí' : 'No'}</p>
                  </div>
                  {nino.escuelas && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Escuela</p>
                      <p className="font-medium text-gray-900">{nino.escuelas.nombre}</p>
                    </div>
                  )}
                  {nino.grado_escolar && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Grado</p>
                      <p className="font-medium text-gray-900">{nino.grado_escolar}</p>
                    </div>
                  )}
                  {nino.turno_escolar && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Turno</p>
                      <p className="font-medium text-gray-900 capitalize">{nino.turno_escolar}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alergias y datos de salud básicos */}
            {saludBasica && (saludBasica.alergias || saludBasica.medicacion_habitual || saludBasica.usa_lentes || saludBasica.usa_audifono || saludBasica.requiere_acompanamiento_especial) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  Salud — Información Básica
                </p>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1.5 text-sm">
                  {saludBasica.alergias && (
                    <p>
                      <span className="font-semibold text-red-700">⚠️ Alergias: </span>
                      <span className="text-gray-800">{saludBasica.alergias}</span>
                    </p>
                  )}
                  {saludBasica.medicacion_habitual && (
                    <p>
                      <span className="font-semibold text-gray-700">💊 Medicación: </span>
                      <span className="text-gray-800">{saludBasica.medicacion_habitual}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {saludBasica.usa_lentes && (
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">👓 Usa lentes</span>
                    )}
                    {saludBasica.usa_audifono && (
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">🔊 Usa audífono</span>
                    )}
                    {saludBasica.requiere_acompanamiento_especial && (
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700 font-medium">⚡ Requiere acomp. especial</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contacto de emergencia */}
            {contactoPrincipal && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Contacto de Emergencia
                </p>
                <div className="p-3 bg-crecimiento-50 border border-crecimiento-100 rounded-lg text-sm">
                  <p className="font-medium text-gray-900">
                    {contactoPrincipal.nombre}
                    <span className="text-xs text-gray-500 font-normal ml-1.5">
                      ({contactoPrincipal.relacion || contactoPrincipal.tipo})
                    </span>
                  </p>
                  {contactoPrincipal.telefono && (
                    <a
                      href={`tel:${contactoPrincipal.telefono}`}
                      className="flex items-center gap-1.5 text-crecimiento-700 font-medium mt-1.5 hover:underline touch-manipulation"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {contactoPrincipal.telefono}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Evaluación psicopedagógica */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                Evaluación Psicopedagógica
              </p>
              {tieneEvaluacionInicial ? (
                <p className="text-sm text-crecimiento-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Evaluación inicial registrada
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin evaluación inicial registrada</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ Datos sensibles (solo psico/director/admin) ═══ */}
        {tieneAccesoCompleto && nino.ninos_sensibles && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
              🔒 Datos Sensibles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Nombre completo</p>
                <p className="font-medium text-gray-900">{nino.ninos_sensibles.nombre_completo_encrypted}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Apellido</p>
                <p className="font-medium text-gray-900">{nino.ninos_sensibles.apellido_encrypted}</p>
              </div>
              {nino.ninos_sensibles.fecha_nacimiento_encrypted && (
                <div>
                  <p className="text-gray-500 mb-0.5">Fecha de nacimiento (sensible)</p>
                  <p className="font-medium text-gray-900">{nino.ninos_sensibles.fecha_nacimiento_encrypted}</p>
                </div>
              )}
              {nino.ninos_sensibles.dni_encrypted && (
                <div>
                  <p className="text-gray-500 mb-0.5">DNI</p>
                  <p className="font-medium text-gray-900">{nino.ninos_sensibles.dni_encrypted}</p>
                </div>
              )}
              {nino.ninos_sensibles.direccion && (
                <div className="sm:col-span-2">
                  <p className="text-gray-500 mb-0.5">Dirección</p>
                  <p className="font-medium text-gray-900">{nino.ninos_sensibles.direccion}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ Información del niño ═══ */}
        {!isVoluntario && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-6 h-6" />
                Información del Niño
              </h2>
              {puedeEditar && (
                <button
                  onClick={modoEdicion ? cancelarEdicion : abrirEdicion}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all touch-manipulation ${
                    modoEdicion
                      ? 'bg-impulso-50 border-impulso-200 text-impulso-700 hover:bg-impulso-100'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {modoEdicion ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  {modoEdicion ? 'Cancelar' : 'Editar'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {nino.fecha_nacimiento && (
                <div>
                  <p className="text-gray-500 mb-0.5">Fecha de nacimiento</p>
                  <p className="font-medium text-gray-900">
                    {formatearFecha(nino.fecha_nacimiento)}
                    {' '}
                    <span className="text-gray-500">({edadTexto})</span>
                  </p>
                </div>
              )}
              {nino.genero && (
                <div>
                  <p className="text-gray-500 mb-0.5">Género</p>
                  <p className="font-medium text-gray-900 capitalize">{nino.genero.replace('_', ' ')}</p>
                </div>
              )}
              {nino.escuelas && (
                <div>
                  <p className="text-gray-500 mb-0.5">Escuela</p>
                  <p className="font-medium text-gray-900">{nino.escuelas.nombre}</p>
                </div>
              )}
              {nino.grado_escolar && (
                <div>
                  <p className="text-gray-500 mb-0.5">Grado</p>
                  <p className="font-medium text-gray-900">{nino.grado_escolar}</p>
                </div>
              )}
              {nino.turno_escolar && (
                <div>
                  <p className="text-gray-500 mb-0.5">Turno escolar</p>
                  <p className="font-medium text-gray-900 capitalize">{nino.turno_escolar}</p>
                </div>
              )}
              {nino.fecha_ingreso && (
                <div>
                  <p className="text-gray-500 mb-0.5">Fecha de ingreso al programa</p>
                  <p className="font-medium text-gray-900">{formatearFecha(nino.fecha_ingreso)}</p>
                </div>
              )}

              {/* Permanencia */}
              <div>
                <p className="text-gray-500 mb-0.5">Permanencia en el programa</p>
                {puedeEditar ? (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleTogglePermanencia(true)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        editPermanencia
                          ? 'bg-crecimiento-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => handleTogglePermanencia(false)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        !editPermanencia
                          ? 'bg-impulso-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-gray-900">
                    {nino.activo ? 'Sí — activo' : 'No — inactivo'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Salud — Profesionales (solo full access + equipo_profesional) ═══ */}
        {puedeEditar && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-impulso-500" />
                Salud — Profesionales
              </h2>
              {!editandoSalud && (
                <button
                  onClick={() => setEditandoSalud(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-impulso-600 hover:bg-impulso-50 border border-gray-200 hover:border-impulso-200 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
            </div>

            {editandoSalud ? (
              /* ── Modo edición ── */
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {TIPOS_PROFESIONAL_SALUD.map((t) => {
                    const isSelected = editTerapia.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          setEditTerapia((prev) =>
                            isSelected ? prev.filter((v) => v !== t.value) : [...prev, t.value]
                          );
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                          isSelected
                            ? 'bg-impulso-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Comentarios y datos relevantes de salud
                  </label>
                  <textarea
                    value={editComentariosSalud}
                    onChange={(e) => setEditComentariosSalud(e.target.value)}
                    placeholder="Diagnósticos, medicación, alergias, indicaciones especiales..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-impulso-300 focus:border-transparent resize-none text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGuardarSalud}
                    disabled={guardandoSalud}
                    className="flex items-center gap-2 px-5 py-2.5 bg-impulso-500 hover:bg-impulso-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors touch-manipulation min-h-[44px]"
                  >
                    {guardandoSalud ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {guardandoSalud ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditandoSalud(false)}
                    disabled={guardandoSalud}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors touch-manipulation min-h-[44px]"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* ── Modo vista (estilo bitácora) ── */
              <div className="p-3 bg-impulso-50 rounded-lg border border-impulso-100">
                {editTerapia.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTerapia.map((v) => {
                      const label = TIPOS_PROFESIONAL_SALUD.find((t) => t.value === v)?.label || v;
                      return (
                        <span key={v} className="px-2.5 py-1 bg-impulso-500 text-white rounded-full text-xs font-medium">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-2">No asiste a profesionales de salud</p>
                )}
                {editComentariosSalud.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{editComentariosSalud.trim()}</p>
                ) : (
                  !editTerapia.length && null
                )}
                {exitoSalud && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Guardado correctamente
                  </div>
                )}
                {!editTerapia.length && !editComentariosSalud.trim() && !exitoSalud && (
                  <p className="text-sm text-gray-400 italic">Sin datos de salud registrados</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ Familiares y contactos (solo full access) ═══ */}
        {tieneAccesoCompleto && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-impulso-400" />
              Familiares y Contactos
            </h2>

            <div className="space-y-4">
              {/* Madre */}
              <FamiliarCard
                label="Madre" tipo="madre" familiar={madre} icon="👩"
                editandoId={familiarEditandoId} editForm={familiarEditForm}
                onEditar={handleAbrirEditarFamiliar} onAgregar={handleAbrirCrearFamiliar}
                onCancelar={() => setFamiliarEditandoId(null)}
                onGuardar={handleGuardarFamiliar} guardando={guardandoFamiliar}
                onChangeForm={setFamiliarEditForm}
              />
              {/* Padre */}
              <FamiliarCard
                label="Padre" tipo="padre" familiar={padre} icon="👨"
                editandoId={familiarEditandoId} editForm={familiarEditForm}
                onEditar={handleAbrirEditarFamiliar} onAgregar={handleAbrirCrearFamiliar}
                onCancelar={() => setFamiliarEditandoId(null)}
                onGuardar={handleGuardarFamiliar} guardando={guardandoFamiliar}
                onChangeForm={setFamiliarEditForm}
              />
              {/* Referente escolar */}
              <FamiliarCard
                label="Referente escolar" tipo="referente_escolar" familiar={referenteEscolar} icon="🏫"
                editandoId={familiarEditandoId} editForm={familiarEditForm}
                onEditar={handleAbrirEditarFamiliar} onAgregar={handleAbrirCrearFamiliar}
                onCancelar={() => setFamiliarEditandoId(null)}
                onGuardar={handleGuardarFamiliar} guardando={guardandoFamiliar}
                onChangeForm={setFamiliarEditForm}
              />
              {/* Otros referentes (tutor, otro, etc.) */}
              {familiares
                .filter((f) => !['madre', 'padre', 'referente_escolar'].includes(f.tipo))
                .map((f) => (
                  <FamiliarCard
                    key={f.id}
                    label={f.tipo === 'tutor' ? 'Tutor/a' : (f.relacion || 'Otro referente')}
                    tipo={f.tipo}
                    familiar={f}
                    icon="👤"
                    editandoId={familiarEditandoId} editForm={familiarEditForm}
                    onEditar={handleAbrirEditarFamiliar} onAgregar={handleAbrirCrearFamiliar}
                    onCancelar={() => setFamiliarEditandoId(null)}
                    onGuardar={handleGuardarFamiliar} guardando={guardandoFamiliar}
                    onChangeForm={setFamiliarEditForm}
                  />
                ))}

              {/* Formulario inline para nuevo "otro" (cuando se abre desde el botón) */}
              {familiarEditandoId === '__nuevo__otro' && (
                <FamiliarCard
                  label="Otro referente" tipo="otro" familiar={undefined} icon="👤"
                  editandoId={familiarEditandoId} editForm={familiarEditForm}
                  onEditar={handleAbrirEditarFamiliar} onAgregar={handleAbrirCrearFamiliar}
                  onCancelar={() => setFamiliarEditandoId(null)}
                  onGuardar={handleGuardarFamiliar} guardando={guardandoFamiliar}
                  onChangeForm={setFamiliarEditForm}
                />
              )}

              {/* Botón agregar otro referente */}
              {familiarEditandoId !== '__nuevo__otro' && (
                <button
                  onClick={() => handleAbrirCrearFamiliar('otro')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-dashed border-sol-300 text-sol-700 bg-sol-50/40 hover:bg-sol-50 hover:border-sol-400 transition-all text-sm font-outfit font-medium min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Agregar otro referente
                </button>
              )}

              {familiares.length === 0 && !familiarEditandoId && (
                <p className="text-sm text-neutro-piedra italic font-outfit">No hay familiares registrados</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ Voluntario Asignado (solo no-voluntarios) ═══ */}
        {!isVoluntario && (
          <div className="bg-gradient-to-br from-crecimiento-50 to-sol-50 border border-crecimiento-200 rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-xl font-bold text-crecimiento-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Voluntario Asignado
            </h2>

            {asignacionActiva ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-crecimiento-500 to-sol-400 flex items-center justify-center text-white font-bold text-lg">
                    {asignacionActiva.voluntario?.nombre?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {asignacionActiva.voluntario
                        ? `${asignacionActiva.voluntario.nombre} ${asignacionActiva.voluntario.apellido}`
                        : 'Sin nombre'}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>Asignado: {formatearFecha(asignacionActiva.fecha_asignacion)}</span>
                      {asignacionActiva.score_matching != null && asignacionActiva.score_matching > 0 && (
                        <span className="px-2 py-0.5 bg-crecimiento-100 text-crecimiento-700 rounded-full text-xs font-medium">
                          Score: {asignacionActiva.score_matching}/100
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/ninos/${ninoId}/asignar-voluntario`)}
                  className="px-4 py-2 text-sm bg-white border border-crecimiento-300 text-crecimiento-700 rounded-lg hover:bg-crecimiento-50 transition-colors font-medium"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Sin voluntario asignado</p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/ninos/${ninoId}/asignar-voluntario`)}
                  className="px-4 py-2 text-sm bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 transition-colors font-medium"
                >
                  Asignar Voluntario
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ Notas / Bitácora (full access + equipo_profesional) ═══ */}
        {puedeEditar && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-sol-500" />
              Notas / Bitácora
            </h2>

            {/* Add new note */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Escribí una nota sobre este niño..."
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sol-400 focus:border-transparent resize-none text-sm"
              />
              <button
                onClick={handleGuardarNota}
                disabled={!nuevaNota.trim() || guardando}
                className="self-end px-4 py-2 bg-sol-500 hover:bg-sol-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors touch-manipulation min-h-[44px] flex items-center gap-1"
              >
                {guardando ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <><Save className="w-4 h-4" /> Guardar</>
                )}
              </button>
            </div>

            {/* Notes list */}
            {notas.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay notas registradas</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {notas.map((nota) => (
                  <div key={nota.id} className="p-3 bg-sol-50 rounded-lg border border-sol-100">
                    {notaEditandoId === nota.id ? (
                      /* ── Modo edición ── */
                      <div>
                        <textarea
                          value={notaEditandoTexto}
                          onChange={(e) => setNotaEditandoTexto(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-sol-200 rounded-lg focus:ring-2 focus:ring-sol-400 focus:border-transparent resize-none text-sm bg-white mb-2"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleGuardarNotaEditada}
                            disabled={guardandoNota || !notaEditandoTexto.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sol-500 hover:bg-sol-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            {guardandoNota ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Guardar
                          </button>
                          <button
                            onClick={() => { setNotaEditandoId(null); setNotaEditandoTexto(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Modo vista ── */
                      <>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{nota.texto}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatearFecha(nota.fecha)}</span>
                            <span>·</span>
                            <span>{nota.autor_nombre}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditarNota(nota)}
                              className="p-1.5 text-gray-400 hover:text-sol-600 hover:bg-sol-100 rounded-lg transition-colors"
                              title="Editar nota"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEliminarNota(nota.id)}
                              disabled={eliminandoNotaId === nota.id}
                              className="p-1.5 text-gray-400 hover:text-impulso-600 hover:bg-impulso-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar nota"
                            >
                              {eliminandoNotaId === nota.id ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-impulso-400 border-t-transparent" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Evaluaciones Psicopedagógicas (full access + equipo_profesional) ═══ */}
        {(tieneAccesoCompleto || esEquipoProfesional) && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-crecimiento-500" />
                Evaluaciones Psicopedagógicas
              </h2>
              <Link
                href={`/dashboard/psicopedagogia/evaluaciones/nueva?ninoId=${ninoId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva evaluación
              </Link>
            </div>

            {evaluacionesPsico.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Sin evaluación psicopedagógica inicial</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Se recomienda completarla antes de asignar un voluntario.
                  </p>
                  <Link
                    href={`/dashboard/psicopedagogia/evaluaciones/nueva?ninoId=${ninoId}`}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-700 underline hover:text-red-900"
                  >
                    <Plus className="w-3 h-3" /> Realizar evaluación ahora
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {evaluacionesPsico.map((ev) => {
                  // Extract nivel from conclusiones
                  const nivelMatch = ev.conclusiones?.match(/Nivel de alfabetización:\s*(.+)/);
                  const nivel = nivelMatch?.[1]?.trim();
                  // Extract short summary from conclusiones (skip header lines)
                  const lines = (ev.conclusiones || '').split('\n').filter(Boolean);
                  const diffIdx = lines.findIndex((l) => l === 'Dificultades identificadas:');
                  const diffs = diffIdx >= 0
                    ? lines.slice(diffIdx + 1).filter((l) => l.startsWith('- ')).slice(0, 3).map((l) => l.slice(2))
                    : [];

                  return (
                    <Link
                      key={ev.id}
                      href={`/dashboard/psicopedagogia/evaluaciones/${ev.id}`}
                      className="block p-4 bg-crecimiento-50 border border-crecimiento-200 rounded-xl hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-gray-900">
                              Evaluación Inicial
                            </span>
                            {nivel && (
                              <span className="px-2 py-0.5 bg-crecimiento-200 text-crecimiento-800 rounded-full text-xs font-medium">
                                📚 {nivel}
                              </span>
                            )}
                          </div>
                          {diffs.length > 0 && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              <span className="font-medium text-gray-700">Dificultades: </span>
                              {diffs.join(' · ')}
                            </p>
                          )}
                          {ev.acciones_sugeridas && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              💡 {ev.acciones_sugeridas}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">{formatearFecha(ev.fecha)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ev.autor_nombre}</p>
                          <ChevronRight className="w-4 h-4 text-crecimiento-400 mt-1 ml-auto group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Grabaciones de Reuniones (solo full access) ═══ */}
        {tieneAccesoCompleto && grabaciones.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-impulso-500" />
              Grabaciones de Reuniones
            </h2>

            <div className="space-y-4">
              {grabaciones.map((grabacion) => (
                <GrabacionCard
                  key={grabacion.id}
                  grabacion={grabacion}
                  formatearFecha={formatearFecha}
                />
              ))}
            </div>
          </div>
        )}

        {/* ═══ Historial de Sesiones ═══ */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(164,198,57,0.1)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-white/40 bg-white/20">
            <h2 className="text-xl font-bold text-neutro-carbon font-quicksand flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              {isVoluntario ? 'Mis Sesiones Registradas' : 'Historial de Sesiones'}
            </h2>
            <p className="text-sm text-neutro-piedra mt-1 font-outfit">
              {isVoluntario
                ? 'Tus sesiones con este niño'
                : 'Todas las sesiones registradas para este niño'}
            </p>
          </div>

          {sesiones.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-3 text-neutro-piedra/40" />
              <p className="text-neutro-piedra font-outfit mb-2">
                {isVoluntario
                  ? 'Aún no registraste ninguna sesión con este niño'
                  : 'No hay sesiones registradas todavía'}
              </p>
              <button
                onClick={() => router.push(`/dashboard/sesiones/nueva/${ninoId}`)}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold shadow-md transition-all touch-manipulation min-h-[52px] active:scale-95"
              >
                Registrar Primera Sesión
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {sesiones.map((sesion) => (
                <Link
                  key={sesion.id}
                  href={`/dashboard/sesiones/${sesion.id}`}
                  className="flex items-center gap-3 p-4 bg-white/60 rounded-2xl border border-white/60 hover:bg-white/90 hover:shadow-sm transition-all min-h-[60px] touch-manipulation active:scale-[0.99] group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutro-carbon font-quicksand">{formatearFecha(sesion.fecha)}</p>
                    <p className="text-sm text-neutro-piedra font-outfit">
                      {sesion.duracion_minutos} min
                      {sesion.observaciones_libres && (
                        <span className="ml-1.5 text-neutro-piedra/70">· {sesion.observaciones_libres.slice(0, 50)}{sesion.observaciones_libres.length > 50 ? '…' : ''}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutro-piedra/40 flex-shrink-0 group-hover:text-crecimiento-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Info para voluntarios ═══ */}
        {isVoluntario && (
          <div className="bg-sol-50/80 backdrop-blur-sm border border-sol-200/60 rounded-3xl p-4">
            <div className="flex gap-3">
              <Info className="w-6 h-6 text-sol-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-sol-900 font-medium mb-1 font-quicksand">Vista de Voluntario</p>
                <p className="text-sm text-sol-700 font-outfit">
                  Solo ves tus propias sesiones con este niño. Los coordinadores y el equipo profesional pueden ver todas las sesiones.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Sticky bottom CTA (mobile) ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-t border-white/60 px-4 pt-3 pb-5 flex gap-3 sm:hidden safe-bottom">
          <Link
            href={`/dashboard/sesiones/nueva/${ninoId}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 min-h-[52px] bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-bold text-sm active:scale-95 shadow-[0_4px_16px_rgba(164,198,57,0.35)] touch-manipulation"
          >
            <Plus className="w-5 h-5" /> Registrar Sesión
          </Link>
          {!isVoluntario && (
            <Link
              href={`/dashboard/ninos/${ninoId}/analisis`}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 min-h-[52px] bg-white/90 border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm active:scale-95 touch-manipulation"
            >
              🧠 IA
            </Link>
          )}
        </div>

      </div>

      {/* ── Modal: Agregar Zona ─────────────────────────────── */}
      {showZonaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutro-carbon font-quicksand">
                Agregar nueva zona
              </h3>
              <button
                type="button"
                onClick={() => { setShowZonaModal(false); setNuevaZonaNombre(''); }}
                className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Nombre de la zona *</label>
              <input
                type="text"
                value={nuevaZonaNombre}
                onChange={(e) => setNuevaZonaNombre(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent font-outfit min-h-[56px] transition-all"
                placeholder="Ej: Zona Norte, Barrio Centro..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCrearZona(); } }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowZonaModal(false); setNuevaZonaNombre(''); }}
                className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-outfit text-sm hover:shadow-md transition-all min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearZona}
                disabled={!nuevaZonaNombre.trim() || creandoZona}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-outfit text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all min-h-[44px]"
              >
                {creandoZona ? 'Creando...' : 'Crear zona'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Agregar Escuela ──────────────────────────── */}
      {showEscuelaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutro-carbon font-quicksand">
                Agregar nueva escuela
              </h3>
              <button
                type="button"
                onClick={() => { setShowEscuelaModal(false); setNuevaEscuelaNombre(''); }}
                className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">Nombre de la escuela *</label>
              <input
                type="text"
                value={nuevaEscuelaNombre}
                onChange={(e) => setNuevaEscuelaNombre(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent font-outfit min-h-[56px] transition-all"
                placeholder="Ej: Escuela N° 12, Instituto San Martín..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCrearEscuela(); } }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowEscuelaModal(false); setNuevaEscuelaNombre(''); }}
                className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-outfit text-sm hover:shadow-md transition-all min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearEscuela}
                disabled={!nuevaEscuelaNombre.trim() || creandoEscuela}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-outfit text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all min-h-[44px]"
              >
                {creandoEscuela ? 'Creando...' : 'Crear escuela'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components: extraídos a src/components/dashboard/ ───
