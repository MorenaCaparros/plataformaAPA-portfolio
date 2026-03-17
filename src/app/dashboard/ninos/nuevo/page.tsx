'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { calcularEdad } from '@/lib/utils/date-helpers';
import MeetingRecorder from '@/components/forms/MeetingRecorder';
import VoiceToText from '@/components/forms/VoiceToText';
import type { MeetingRecordingResult } from '@/components/forms/MeetingRecorder';
import type { ConsentimientoData } from '@/components/forms/ConsentimientoGrabacionModal';
import {
  ArrowLeft, UserPlus, Calendar, Users, GraduationCap,
  Phone, Trash2, Plus, MapPin, Baby, Heart, CheckCircle,
  Camera, X, Stethoscope, UtensilsCrossed, AlertTriangle, FileText
} from 'lucide-react';
import type { Zona, Escuela, RangoEtario, Genero, TurnoEscolar } from '@/types/database';
import { jsPDF } from "jspdf";// ─── Helpers ───────────────────────────────────────────────

/** Derive rango_etario from age in years */
function edadARango(edad: number | null): RangoEtario | null {
  if (edad === null) return null;
  if (edad <= 7) return '5-7';
  if (edad <= 10) return '8-10';
  if (edad <= 13) return '11-13';
  if (edad <= 16) return '14-16';
  return '17+';
}

// ─── Types ───────────────────────────────────────────────

type TipoFamiliar = 'padre' | 'madre' | 'tutor' | 'referente_escolar' | 'otro';

interface FamiliarForm {
  key: string;
  tipo: TipoFamiliar;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  relacion: string;
  vive_con_nino: boolean;
  es_contacto_principal: boolean;
}

const FAMILIAR_LABELS: Record<TipoFamiliar, string> = {
  madre: 'Madre',
  padre: 'Padre',
  tutor: 'Tutor/a',
  referente_escolar: 'Referente Escolar',
  otro: 'Otro familiar',
};

function createFamiliar(tipo: TipoFamiliar): FamiliarForm {
  return {
    key: crypto.randomUUID(),
    tipo,
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    relacion: tipo === 'otro' ? '' : FAMILIAR_LABELS[tipo],
    vive_con_nino: tipo !== 'referente_escolar',
    es_contacto_principal: false,
  };
}

// ─── Salud: Tipos de profesional ──────────────────────────

const TIPOS_PROFESIONAL_SALUD = [
  { value: 'psicologo_psicopedagogo', label: 'Psicólogo / Psicopedagogo' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo/a' },
  { value: 'terapista_ocupacional', label: 'Terapista ocupacional' },
  { value: 'neurologo', label: 'Neurólogo/a' },
  { value: 'psiquiatra', label: 'Psiquiatra' },
  { value: 'kinesiologo', label: 'Kinesiólogo/a' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'otro', label: 'Otro profesional' },
];

interface ProblematicaSalud {
  key: string;
  descripcion: string;
  profesional_tratante: string; // valor de TIPOS_PROFESIONAL_SALUD
  activo: boolean;
}

function createProblematicaSalud(): ProblematicaSalud {
  return {
    key: crypto.randomUUID(),
    descripcion: '',
    profesional_tratante: '',
    activo: true,
  };
}

// ─── Shared input classes ─────────────────────────────────

const inputClass =
  'w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] placeholder:text-neutro-piedra/60 transition-all';
const labelClass = 'block text-sm font-medium text-neutro-carbon font-outfit mb-2';
const sectionTitleClass =
  'text-lg font-semibold text-neutro-carbon font-quicksand flex items-center gap-2 mb-4';

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export default function NuevoNinoPage() {
  const router = useRouter();
  const { user, perfil } = useAuth();
  const [loading, setLoading] = useState(false);

  // Voluntarios no pueden registrar niños — redirigir
  useEffect(() => {
    if (perfil?.rol === 'voluntario') {
      router.replace('/dashboard/ninos');
    }
  }, [perfil, router]);

  // Reference data
  const [zonas, setZonas] = useState<Pick<Zona, 'id' | 'nombre'>[]>([]);
  const [escuelas, setEscuelas] = useState<Pick<Escuela, 'id' | 'nombre'>[]>([]);

  // Form state — basic fields
  const [alias, setAlias] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState<Genero | ''>('');
  const [escolarizado, setEscolarizado] = useState(true);
  const [gradoEscolar, setGradoEscolar] = useState('');
  const [turnoEscolar, setTurnoEscolar] = useState<TurnoEscolar | ''>('');
  const [escuelaId, setEscuelaId] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // "¿Permanece en algún curso?"
  const [permaneceCurso, setPermaneceCurso] = useState<boolean | null>(null);
  const [cualCurso, setCualCurso] = useState('');

  // Modal state for creating new zona / escuela
  const [showZonaModal, setShowZonaModal] = useState(false);
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState('');
  const [creandoZona, setCreandoZona] = useState(false);

  const [showEscuelaModal, setShowEscuelaModal] = useState(false);
  const [nuevaEscuelaNombre, setNuevaEscuelaNombre] = useState('');
  const [creandoEscuela, setCreandoEscuela] = useState(false);

  // Foto de perfil (upload at registration for professionals)
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Familiares
  const [familiares, setFamiliares] = useState<FamiliarForm[]>([
    createFamiliar('madre'),
    createFamiliar('padre'),
  ]);

  // ─── Salud ─────────────────────────────────────────────────
  const [profesionalesSalud, setProfesionalesSalud] = useState<string[]>([]);
  const [problematicasSalud, setProblematicasSalud] = useState<ProblematicaSalud[]>([]);
  const [obraSocial, setObraSocial] = useState('');
  const [medicacionHabitual, setMedicacionHabitual] = useState('');
  const [usaLentes, setUsaLentes] = useState(false);
  const [usaAudifono, setUsaAudifono] = useState(false);
  const [requiereAcompanamiento, setRequiereAcompanamiento] = useState(false);
  const [observacionesSalud, setObservacionesSalud] = useState('');

  // ─── Alimentación ──────────────────────────────────────────
  const [alergias, setAlergias] = useState('');
  const [restriccionesAlimentarias, setRestriccionesAlimentarias] = useState('');
  const [recibeAlimentacionEscolar, setRecibeAlimentacionEscolar] = useState<boolean | null>(null);
  const [cantidadComidasDiarias, setCantidadComidasDiarias] = useState('');
  const [tipoAlimentacion, setTipoAlimentacion] = useState<'completa' | 'incompleta' | 'insuficiente' | 'desconocido' | ''>('');
  const [observacionesAlimentacion, setObservacionesAlimentacion] = useState('');

  // ─── Notas profesionales / IA ──────────────────────────────
  const [notasProfesional, setNotasProfesional] = useState('');

  // ─── Recording / Transcription state ───────────────────────
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcripcion, setTranscripcion] = useState('');
  const [duracionGrabacion, setDuracionGrabacion] = useState(0);
  const [consentimientoGrabacion, setConsentimientoGrabacion] = useState<ConsentimientoData | null>(null);
  const [resumenIA, setResumenIA] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [camposAutocompletados, setCamposAutocompletados] = useState(false);

  // ─── Derived values ───────────────────────────────────────

  const edadCalculada = useMemo(() => calcularEdad(fechaNacimiento || null), [fechaNacimiento]);
  const rangoCalculado = useMemo(() => edadARango(edadCalculada), [edadCalculada]);

  const rolActual = (perfil as any)?.rol as string | undefined;
  const esProfesional = ['psicopedagogia', 'director', 'admin', 'coordinador', 'trabajador_social'].includes(
    rolActual || ''
  );

  // ─── Fetch reference data ──────────────────────────────────

  useEffect(() => {
    fetchZonas();
    fetchEscuelas();
  }, []);

  useEffect(() => {
    if (perfil?.zona_id && !zonaId) {
      setZonaId(perfil.zona_id);
    }
  }, [perfil]);

  const fetchZonas = async () => {
    const { data } = await supabase
      .from('zonas')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre');
    setZonas(data || []);
  };

  const fetchEscuelas = async () => {
    const { data } = await supabase
      .from('escuelas')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre');
    setEscuelas(data || []);
  };

  // ─── Create new Zona / Escuela from modal ─────────────────

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
      setZonaId(data.id);
      setShowZonaModal(false);
      setNuevaZonaNombre('');
    } catch (err: any) {
      console.error('Error creando zona:', err);
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
      setEscuelaId(data.id);
      setShowEscuelaModal(false);
      setNuevaEscuelaNombre('');
    } catch (err: any) {
      console.error('Error creando escuela:', err);
      alert('Error al crear escuela: ' + err.message);
    } finally {
      setCreandoEscuela(false);
    }
  };


  // Función helper para subir a Drive
const subirADrive = async (archivo: File | Blob, nombre: string, carpetaId: string) => {
  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('fileName', nombre);
  formData.append('folderId', carpetaId); 

  const res = await fetch('/api/drive/subir', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir a Drive');
  
  return data.url; // Retorna el enlace web de Drive
};

// Función específica para guardar Audio + PDF en carpetas organizadas
  const guardarEntrevistaOrganizada = async (
    audio: Blob, 
    pdf: Blob, 
    nombreNino: string,
    rootId: string
  ) => {
    const formData = new FormData();
    const fechaHoy = new Date().toISOString().split('T')[0]; // 2026-02-17

    formData.append('audio', audio, `audio-${fechaHoy}.webm`);
    formData.append('pdf', pdf, `consentimiento-${fechaHoy}.pdf`);
    formData.append('nombreNino', nombreNino);
    formData.append('fecha', fechaHoy);
    formData.append('rootFolderId', rootId);

    const res = await fetch('/api/drive/guardar-entrevista', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error al guardar entrevista');
    
    return data; // Retorna { audioUrl, pdfUrl }
  };
  // ─── Foto handler ───────────────────────────────────────

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccioná una imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  // ─── Familiar helpers ─────────────────────────────────────

  const addFamiliar = (tipo: TipoFamiliar = 'otro') => {
    setFamiliares((prev) => [...prev, createFamiliar(tipo)]);
  };

  const removeFamiliar = (key: string) => {
    setFamiliares((prev) => prev.filter((f) => f.key !== key));
  };

  const updateFamiliar = (key: string, field: keyof FamiliarForm, value: any) => {
    setFamiliares((prev) =>
      prev.map((f) => (f.key === key ? { ...f, [field]: value } : f))
    );
  };

  // ─── Salud helpers ────────────────────────────────────────

  const toggleProfesionalSalud = (value: string) => {
    setProfesionalesSalud((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const addProblematicaSalud = () => {
    setProblematicasSalud((prev) => [...prev, createProblematicaSalud()]);
  };

  const removeProblematicaSalud = (key: string) => {
    setProblematicasSalud((prev) => prev.filter((p) => p.key !== key));
  };

  const updateProblematicaSalud = (key: string, field: keyof ProblematicaSalud, value: any) => {
    setProblematicasSalud((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p))
    );
  };

  // ─── Recording callbacks ──────────────────────────────────

  const handleRecordingComplete = useCallback((result: MeetingRecordingResult) => {
    setAudioBlob(result.audioBlob);
    setTranscripcion(result.transcripcion);
    setDuracionGrabacion(result.duracionSegundos);
    setConsentimientoGrabacion(result.consentimiento);
  }, []);

  const handleAnalizar = useCallback(async (textoTranscripcion: string) => {
    if (!textoTranscripcion.trim()) return;
    setAnalizando(true);

    try {
      const res = await fetch('/api/ia/transcripcion-ingreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripcion: textoTranscripcion, modo: 'ambos' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al analizar');
      }

      const { datos_extraidos, resumen } = await res.json();

      // Auto-fill form fields from AI extraction
      if (datos_extraidos) {
        if (datos_extraidos.alias) {
          if (esProfesional) {
            // For professionals: set nombreCompleto (which auto-syncs to alias)
            if (!nombreCompleto) setNombreCompleto(datos_extraidos.alias);
            if (!alias) setAlias(datos_extraidos.alias);
          } else {
            // For voluntarios: set alias directly
            if (!alias) setAlias(datos_extraidos.alias);
          }
        }
        if (datos_extraidos.apellido && !apellido) setApellido(datos_extraidos.apellido);
        if (datos_extraidos.fecha_nacimiento && !fechaNacimiento) setFechaNacimiento(datos_extraidos.fecha_nacimiento);
        if (datos_extraidos.genero && !genero) setGenero(datos_extraidos.genero);
        if (datos_extraidos.escolarizado !== null && datos_extraidos.escolarizado !== undefined) {
          setEscolarizado(datos_extraidos.escolarizado);
        }
        if (datos_extraidos.grado_escolar && !gradoEscolar) setGradoEscolar(datos_extraidos.grado_escolar);
        if (datos_extraidos.turno_escolar && !turnoEscolar) setTurnoEscolar(datos_extraidos.turno_escolar);

        // Try to match escuela by name
        if (datos_extraidos.nombre_escuela && !escuelaId) {
          const match = escuelas.find(
            (e) => e.nombre.toLowerCase().includes(datos_extraidos.nombre_escuela.toLowerCase())
          );
          if (match) setEscuelaId(match.id);
        }

        // Auto-fill familiares from extraction
        if (datos_extraidos.familiares && Array.isArray(datos_extraidos.familiares) && datos_extraidos.familiares.length > 0) {
          const nuevosFamiliares: FamiliarForm[] = datos_extraidos.familiares.map((f: any) => ({
            key: crypto.randomUUID(),
            tipo: (['madre', 'padre', 'tutor', 'referente_escolar', 'otro'].includes(f.tipo) ? f.tipo : 'otro') as TipoFamiliar,
            nombre: f.nombre || '',
            apellido: f.apellido || '',
            telefono: f.telefono || '',
            email: f.email || '',
            relacion: f.relacion || FAMILIAR_LABELS[f.tipo as TipoFamiliar] || '',
            vive_con_nino: f.vive_con_nino ?? true,
            es_contacto_principal: false,
          }));
          // Replace empty familiares or merge
          const familiaresLlenos = familiares.filter((f) => f.nombre.trim() || f.apellido.trim());
          if (familiaresLlenos.length === 0) {
            setFamiliares(nuevosFamiliares);
          } else {
            // Add new ones that don't already exist
            const existingNames = new Set(familiaresLlenos.map((f) => `${f.nombre} ${f.apellido}`.toLowerCase().trim()));
            const nuevos = nuevosFamiliares.filter((f: FamiliarForm) => !existingNames.has(`${f.nombre} ${f.apellido}`.toLowerCase().trim()));
            if (nuevos.length > 0) setFamiliares([...familiaresLlenos, ...nuevos]);
          }
        }

        if (datos_extraidos.observaciones && !observaciones) {
          setObservaciones(datos_extraidos.observaciones);
        }

        setCamposAutocompletados(true);
      }

      // Save summary
      if (resumen) {
        setResumenIA(resumen);
      }
    } catch (error: any) {
      console.error('Error analizando transcripción:', error);
      alert('Error al analizar la transcripción: ' + error.message);
    } finally {
      setAnalizando(false);
    }
  }, [alias, nombreCompleto, apellido, fechaNacimiento, genero, gradoEscolar, turnoEscolar, escuelaId, escuelas, familiares, observaciones]);

  // ─── Submit ────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For professionals: ensure alias is synced from nombre
    const aliasFinal = esProfesional ? (nombreCompleto.trim() || alias.trim()) : alias.trim();

    if (!aliasFinal) {
      alert(esProfesional ? 'El nombre es obligatorio.' : 'El nombre del niño es obligatorio.');
      return;
    }

    if (esProfesional && !apellido.trim()) {
      alert('El apellido es obligatorio.');
      return;
    }

    setLoading(true);

    try {
      // 1. Insert niño
      const { data: nino, error: ninoError } = await supabase
        .from('ninos')
        .insert({
          alias: aliasFinal,
          fecha_nacimiento: fechaNacimiento || null,
          rango_etario: rangoCalculado ?? null,
          genero: genero || null,
          escolarizado,
          grado_escolar: escolarizado && gradoEscolar ? gradoEscolar : null,
          turno_escolar: escolarizado && turnoEscolar ? turnoEscolar : null,
          escuela_id: escolarizado && escuelaId ? escuelaId : null,
          zona_id: zonaId || perfil?.zona_id || null,
          fecha_ingreso: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (ninoError) throw ninoError;

      const ninoId = nino.id;

      // 1b. Subir FOTO a Google Drive (si está configurado)
      if (fotoFile) {
        try {
          const ext = fotoFile.name.split('.').pop();
          const fileName = `perfil-${ninoId}.${ext}`;
          const driveFolderId = process.env.NEXT_PUBLIC_DRIVE_FOLDER_FOTOS; 

          if (driveFolderId) {
            const driveUrl = await subirADrive(fotoFile, fileName, driveFolderId);
            await supabase
              .from('ninos')
              .update({ foto_perfil_url: driveUrl })
              .eq('id', ninoId);
          }
          // Si no hay carpeta de Drive configurada, simplemente no se sube la foto
        } catch (fotoErr) {
          console.error('Error procesando foto:', fotoErr);
          // No bloquear el registro — la foto se puede subir después desde el perfil
        }
      }

      // 1c. Insert ninos_sensibles if nombre/apellido provided
      if (nombreCompleto.trim() || apellido.trim()) {
        const { error: sensibleError } = await supabase
          .from('ninos_sensibles')
          .insert({
            nino_id: ninoId,
            nombre_completo_encrypted: nombreCompleto.trim() || aliasFinal,
            apellido_encrypted: apellido.trim(),
          });
        if (sensibleError) console.error('Error guardando datos sensibles:', sensibleError);
      }

      // 2. Auto-assign current volunteer
      if (user?.id && rolActual === 'voluntario') {
        const { error: asignacionError } = await supabase
          .from('asignaciones')
          .insert({
            nino_id: ninoId,
            voluntario_id: user.id,
            activa: true,
            fecha_asignacion: new Date().toISOString().split('T')[0],
          });
        if (asignacionError) console.error('Error al crear asignación:', asignacionError);
      }

      // 3. Insert familiares (only those with a name filled in)
      const familiaresConNombre = familiares.filter((f) => f.nombre.trim() || f.apellido.trim());
      if (familiaresConNombre.length > 0) {
        const rows = familiaresConNombre.map((f) => {
          const nombreCompleto = [f.nombre.trim(), f.apellido.trim()].filter(Boolean).join(' ');
          return {
            nino_id: ninoId,
            tipo: f.tipo,
            nombre: nombreCompleto,
            telefono: f.telefono.trim() || null,
            email: f.email.trim() || null,
            relacion: f.relacion.trim() || null,
            vive_con_nino: f.vive_con_nino,
            es_contacto_principal: f.es_contacto_principal,
          };
        });
        const { error: famError } = await supabase
          .from('familiares_apoyo')
          .insert(rows);
        if (famError) console.error('Error guardando familiares:', famError);
      }

      // 3b. Insert salud_ninos
      const tieneDatosSalud = profesionalesSalud.length > 0 || problematicasSalud.some(p => p.descripcion.trim()) || obraSocial.trim() || medicacionHabitual.trim() || usaLentes || usaAudifono || requiereAcompanamiento || observacionesSalud.trim();
      if (tieneDatosSalud) {
        try {
          const condicionesTexto = [
            profesionalesSalud.length > 0
              ? `Profesionales: ${profesionalesSalud.map(v => TIPOS_PROFESIONAL_SALUD.find(t => t.value === v)?.label || v).join(', ')}`
              : '',
            ...problematicasSalud
              .filter(p => p.descripcion.trim())
              .map(p => {
                const prof = p.profesional_tratante
                  ? TIPOS_PROFESIONAL_SALUD.find(t => t.value === p.profesional_tratante)?.label || p.profesional_tratante
                  : '';
                return `• ${p.descripcion.trim()}${prof ? ` (${prof})` : ''}${!p.activo ? ' [resuelto]' : ''}`;
              }),
          ].filter(Boolean).join('\n');

          const { error: saludError } = await supabase
            .from('salud_ninos')
            .insert({
              nino_id: ninoId,
              obra_social: obraSocial.trim() || null,
              alergias: alergias.trim() || null, // alergias shared with alimentación
              medicacion_habitual: medicacionHabitual.trim() || null,
              condiciones_preexistentes: condicionesTexto || null,
              usa_lentes: usaLentes,
              usa_audifono: usaAudifono,
              requiere_acompanamiento_especial: requiereAcompanamiento,
              observaciones: observacionesSalud.trim() || null,
            });
          if (saludError) console.error('Error guardando salud:', saludError);
        } catch (saludErr) {
          console.error('Error guardando datos de salud:', saludErr);
        }
      }

      // 3c. Insert alimentacion_ninos
      const tieneDatosAlimentacion = alergias.trim() || restriccionesAlimentarias.trim() || recibeAlimentacionEscolar !== null || cantidadComidasDiarias || tipoAlimentacion || observacionesAlimentacion.trim();
      if (tieneDatosAlimentacion) {
        try {
          const obsAlimentacion = [
            restriccionesAlimentarias.trim() ? `Restricciones: ${restriccionesAlimentarias.trim()}` : '',
            observacionesAlimentacion.trim() || '',
          ].filter(Boolean).join('\n');

          const { error: alimentacionError } = await supabase
            .from('alimentacion_ninos')
            .insert({
              nino_id: ninoId,
              recibe_alimentacion_escolar: recibeAlimentacionEscolar,
              cantidad_comidas_diarias: cantidadComidasDiarias ? parseInt(cantidadComidasDiarias) : null,
              tipo_alimentacion: tipoAlimentacion || null,
              alergias: alergias.trim() || null,
              observaciones: obsAlimentacion || null,
            });
          if (alimentacionError) console.error('Error guardando alimentación:', alimentacionError);
        } catch (alimErr) {
          console.error('Error guardando datos de alimentación:', alimErr);
        }
      }

      // 4. Create entrevista inicial (with observations + AI summary)
      let entrevistaId: string | null = null;
      const cursoInfo = permaneceCurso === true
        ? `Permanece en curso: Sí${cualCurso.trim() ? ` — ${cualCurso.trim()}` : ''}`
        : permaneceCurso === false
          ? 'Permanece en curso: No'
          : '';
      const tieneContenido = observaciones.trim() || resumenIA.trim() || transcripcion.trim() || cursoInfo || notasProfesional.trim();

      if (tieneContenido) {
        const conclusiones = [
          resumenIA ? `--- Resumen generado por IA ---\n${resumenIA}` : '',
          observaciones.trim() ? `--- Observaciones manuales ---\n${observaciones.trim()}` : '',
          cursoInfo ? `--- Curso ---\n${cursoInfo}` : '',
          notasProfesional.trim() ? `--- Notas de la trabajadora social ---\n${notasProfesional.trim()}` : '',
        ].filter(Boolean).join('\n\n');

        const { data: entrevista, error: entrevistaError } = await supabase
          .from('entrevistas')
          .insert({
            nino_id: ninoId,
            entrevistador_id: user?.id ?? null,
            tipo: 'inicial',
            fecha: new Date().toISOString().split('T')[0],
            duracion_minutos: duracionGrabacion > 0 ? Math.ceil(duracionGrabacion / 60) : null,
            observaciones: transcripcion.trim() || null,
            conclusiones: conclusiones || null,
          })
          .select('id')
          .single();

        if (entrevistaError) {
          console.error('Error guardando entrevista:', entrevistaError);
        } else {
          entrevistaId = entrevista.id;
        }
      }

      // 5. Upload audio + save grabacion_voz record
      if (audioBlob && audioBlob.size > 0) {
        let audioUrl: string | null = null;
        let pdfUrl: string | null = null;

        // A. Intentar subir a Drive (si está configurado)
        const driveRootAudios = process.env.NEXT_PUBLIC_DRIVE_FOLDER_AUDIOS;
        
        if (driveRootAudios) {
          try {
            // Generar PDF con jsPDF
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("Consentimiento Informado", 10, 20);
            doc.setFontSize(12);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 30);
            doc.text(`Niño/a: ${esProfesional ? (nombreCompleto || alias) : alias}`, 10, 40);
            
            if (consentimientoGrabacion) {
              doc.text(`Firmante: ${consentimientoGrabacion.nombre_firmante} (DNI: ${consentimientoGrabacion.dni_firmante})`, 10, 50);
              doc.setFontSize(10);
              const legalText = doc.splitTextToSize(consentimientoGrabacion.texto_consentimiento, 180);
              doc.text(legalText, 10, 70);
              
              if (consentimientoGrabacion.firma_imagen_base64) {
                doc.text("Firma:", 10, 130);
                doc.addImage(consentimientoGrabacion.firma_imagen_base64, 'PNG', 10, 135, 60, 30);
              }
            }

            if (transcripcion) {
              doc.addPage();
              doc.setFontSize(14);
              doc.text("Transcripción", 10, 20);
              doc.setFontSize(10);
              const lines = doc.splitTextToSize(transcripcion, 180);
              doc.text(lines, 10, 30);
            }

            const pdfBlob = doc.output('blob');

            const driveResult = await guardarEntrevistaOrganizada(
              audioBlob, 
              pdfBlob, 
              esProfesional ? (nombreCompleto || alias) : alias,
              driveRootAudios
            );
            audioUrl = driveResult.audioUrl;
            pdfUrl = driveResult.pdfUrl;
          } catch (driveErr) {
            console.error('Error subiendo a Drive (se guardará sin enlace):', driveErr);
            // No bloquear — guardamos la grabación sin links de Drive
          }
        }

        // B. Guardar en Supabase SIEMPRE (con o sin links de Drive)
        try {
          const transcripcionFinal = [
            pdfUrl ? `PDF Respaldo: ${pdfUrl}` : null,
            transcripcion,
          ].filter(Boolean).join('\n\n');

          await supabase.from('grabaciones_voz').insert({
            entrevista_id: entrevistaId,
            nino_id: ninoId,
            usuario_id: user?.id,
            storage_path: audioUrl || 'pendiente-drive',
            transcripcion: transcripcionFinal || null,
            duracion_segundos: duracionGrabacion,
            formato: 'webm',
            tamanio_bytes: audioBlob.size,
            procesada: true,
            consentimiento_nombre: consentimientoGrabacion?.nombre_firmante || null,
            consentimiento_relacion: consentimientoGrabacion?.relacion_con_nino || null,
            consentimiento_dni: consentimientoGrabacion?.dni_firmante || null,
            consentimiento_firma: consentimientoGrabacion?.firma_imagen_base64 || null,
            consentimiento_fecha: consentimientoGrabacion?.fecha_consentimiento || null,
            consentimiento_texto: consentimientoGrabacion?.texto_consentimiento || null,
            consentimiento_acepta_grabacion: consentimientoGrabacion?.acepta_grabacion ?? false,
            consentimiento_acepta_transcripcion: consentimientoGrabacion?.acepta_transcripcion ?? false,
            consentimiento_acepta_almacenamiento: consentimientoGrabacion?.acepta_almacenamiento ?? false,
          });
        } catch (dbErr) {
          console.error('Error guardando grabación en base de datos:', dbErr);
        }
      }

      alert('✅ Niño registrado exitosamente');
      router.push(`/dashboard/ninos/${ninoId}`);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al registrar niño: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link
                href="/dashboard/ninos"
                className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand flex items-center gap-2">
                <UserPlus size={24} className="text-crecimiento-500" />
                Registrar Niño
              </h1>
              <div className="w-16 sm:w-24" />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Form ──────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── SECTION 1: Datos del niño ───────────────────── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <Baby size={20} className="text-sol-500" />
              Datos del niño
            </h2>

            {/* ── Campos de nombre según rol ────────────────── */}
            {esProfesional ? (
              <>
                {/* Profesionales: Nombre + Apellido (el nombre se usa como alias automáticamente) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        🔒 Nombre *
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreCompleto}
                      onChange={(e) => {
                        setNombreCompleto(e.target.value);
                        // Auto-sync: el nombre se convierte en el alias (visible para voluntarios)
                        setAlias(e.target.value);
                      }}
                      className={inputClass}
                      placeholder="Nombre del niño"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        🔒 Apellido *
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className={inputClass}
                      placeholder="Apellido del niño"
                    />
                  </div>
                </div>
                <p className="-mt-3 text-xs text-amber-600 font-outfit">
                  🔒 Datos sensibles — el apellido solo será visible para el equipo profesional. Los voluntarios verán únicamente el nombre.
                </p>
              </>
            ) : (
              /* Voluntarios: Nombre y Apellido en dos campos separados */
              <>
                <p className="text-sm font-medium text-neutro-carbon font-outfit -mb-1">Nombre y Apellido</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nombre *</label>
                    <input
                      type="text"
                      required
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      className={inputClass}
                      placeholder="Ej: Juan, María..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Apellido</label>
                    <input
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className={inputClass}
                      placeholder="Ej: García, López..."
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-neutro-piedra font-outfit">
                  Los datos completos los podrá verificar el equipo profesional desde el perfil del niño.
                </p>
              </>
            )}

            {/* Foto de perfil (profesionales) */}
            {esProfesional && (
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-crecimiento-500" />
                    Foto de perfil
                  </span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-sol-200 to-crecimiento-200 flex items-center justify-center shadow-md flex-shrink-0">
                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={28} className="text-white/70" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="block w-full text-sm text-neutro-piedra font-outfit file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-medium file:bg-crecimiento-100 file:text-crecimiento-700 hover:file:bg-crecimiento-200 file:cursor-pointer file:transition-colors"
                    />
                    <p className="mt-1.5 text-xs text-neutro-piedra font-outfit">
                      Máximo 5MB. Los voluntarios podrán ver la foto pero no modificarla.
                    </p>
                  </div>
                  {fotoPreview && (
                    <button
                      type="button"
                      onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                      className="p-2 text-neutro-piedra hover:text-impulso-500 transition-colors"
                      title="Quitar foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fecha de nacimiento + age preview */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-sol-500" />
                  Fecha de nacimiento
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="date"
                  value={fechaNacimiento}
                  max={new Date().toISOString().split('T')[0]}
                  min="2005-01-01"
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className={inputClass + ' sm:max-w-[220px]'}
                />
                {edadCalculada !== null && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 bg-sol-100 text-sol-800 rounded-full text-sm font-semibold font-outfit">
                      {edadCalculada} años
                    </span>
                    <span className="text-xs text-neutro-piedra font-outfit">
                      (Rango: {rangoCalculado})
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-neutro-piedra font-outfit">
                La edad y el rango etario se calculan automáticamente.
              </p>
            </div>

            {/* Género */}
            <div>
              <label className={labelClass}>Género</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as Genero | '')}
                className={inputClass}
              >
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                <option value="prefiero_no_decir">Prefiero no decir</option>
              </select>
            </div>

            {/* Zona */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-crecimiento-500" />
                  Equipo / Zona
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  value={zonaId}
                  onChange={(e) => {
                    if (e.target.value === '__nueva__') {
                      setShowZonaModal(true);
                    } else {
                      setZonaId(e.target.value);
                    }
                  }}
                  className={inputClass + ' flex-1'}
                >
                  <option value="">Sin asignar</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre}
                    </option>
                  ))}
                  <option value="__nueva__">＋ Agregar zona...</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Escolaridad ──────────────────────── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <GraduationCap size={20} className="text-crecimiento-500" />
              Escolaridad
            </h2>

            {/* ¿Asiste a la escuela? */}
            <div>
              <label className={labelClass}>¿Asiste a la escuela? *</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="escolarizado"
                    checked={escolarizado}
                    onChange={() => setEscolarizado(true)}
                    className="w-5 h-5 text-crecimiento-500 focus:ring-crecimiento-400"
                  />
                  <span className="text-neutro-carbon font-outfit">Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="escolarizado"
                    checked={!escolarizado}
                    onChange={() => { setEscolarizado(false); setPermaneceCurso(null); setCualCurso(''); }}
                    className="w-5 h-5 text-crecimiento-500 focus:ring-crecimiento-400"
                  />
                  <span className="text-neutro-carbon font-outfit">No</span>
                </label>
              </div>
            </div>

            {escolarizado && (
              <>
                {/* Escuela */}
                <div>
                  <label className={labelClass}>Escuela</label>
                  <div className="flex gap-2">
                    <select
                      value={escuelaId}
                      onChange={(e) => {
                        if (e.target.value === '__nueva__') {
                          setShowEscuelaModal(true);
                        } else {
                          setEscuelaId(e.target.value);
                        }
                      }}
                      className={inputClass + ' flex-1'}
                    >
                      <option value="">Sin especificar</option>
                      {escuelas.map((esc) => (
                        <option key={esc.id} value={esc.id}>
                          {esc.nombre}
                        </option>
                      ))}
                      <option value="__nueva__">＋ Agregar escuela...</option>
                    </select>
                  </div>
                </div>

                {/* Grado + Turno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Grado escolar</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      step="1"
                      value={gradoEscolar}
                      onChange={(e) => setGradoEscolar(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => {
                        // Block non-numeric keys (allow backspace, delete, arrows, tab)
                        if (
                          !/[0-9]/.test(e.key) &&
                          !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
                        ) {
                          e.preventDefault();
                        }
                      }}
                      className={inputClass}
                      placeholder="Ej: 3"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Turno</label>
                    <select
                      value={turnoEscolar}
                      onChange={(e) => setTurnoEscolar(e.target.value as TurnoEscolar | '')}
                      className={inputClass}
                    >
                      <option value="">Sin especificar</option>
                      <option value="mañana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ¿Permanece en algún curso? - solo aplica si asiste a la escuela */}
            {escolarizado && (
              <>
                <div>
                  <label className={labelClass}>¿Permaneció o permanece en algún curso?</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="radio"
                        name="permaneceCurso"
                        checked={permaneceCurso === true}
                        onChange={() => setPermaneceCurso(true)}
                        className="w-5 h-5 text-crecimiento-500 focus:ring-crecimiento-400"
                      />
                      <span className="text-neutro-carbon font-outfit">Sí</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="radio"
                        name="permaneceCurso"
                        checked={permaneceCurso === false}
                        onChange={() => { setPermaneceCurso(false); setCualCurso(''); }}
                        className="w-5 h-5 text-crecimiento-500 focus:ring-crecimiento-400"
                      />
                      <span className="text-neutro-carbon font-outfit">No</span>
                    </label>
                  </div>
                </div>

                {permaneceCurso && (
                  <div>
                    <label className={labelClass}>¿Cuál?</label>
                    <input
                          type="text"
                          value={cualCurso}
                          onChange={(e) => setCualCurso(e.target.value)}
                          className={inputClass}
                          placeholder="Ej: Apoyo escolar, Fútbol, Catequesis..."
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── SECTION 3: Familiares / Contactos ────────────── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <Users size={20} className="text-impulso-500" />
              Familiares y Contactos
            </h2>
            <p className="text-xs text-neutro-piedra font-outfit -mt-2">
              Completá lo que sepas. Los campos vacíos se pueden cargar después.
            </p>

            {familiares.map((fam) => (
              <FamiliarCard
                key={fam.key}
                familiar={fam}
                onChange={(field, value) => updateFamiliar(fam.key, field, value)}
                onRemove={() => removeFamiliar(fam.key)}
                canRemove={familiares.length > 1}
              />
            ))}

            {/* Add buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addFamiliar('tutor')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-white/60 text-sm font-outfit text-neutro-carbon hover:shadow-md transition-all min-h-[44px]"
              >
                <Plus size={14} /> Tutor/a
              </button>
              <button
                type="button"
                onClick={() => addFamiliar('referente_escolar')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-white/60 text-sm font-outfit text-neutro-carbon hover:shadow-md transition-all min-h-[44px]"
              >
                <Plus size={14} /> Referente Escolar
              </button>
              <button
                type="button"
                onClick={() => addFamiliar('otro')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-white/60 text-sm font-outfit text-neutro-carbon hover:shadow-md transition-all min-h-[44px]"
              >
                <Plus size={14} /> Otro
              </button>
            </div>
          </div>

          {/* ── SECTION 4: Salud ─────────────────────────────── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <Stethoscope size={20} className="text-impulso-500" />
              Salud
            </h2>
            <p className="text-xs text-neutro-piedra font-outfit -mt-2">
              Información sobre profesionales de salud, complicaciones y condiciones relevantes.
            </p>

            {/* Profesionales de salud que asiste / asistió */}
            <div>
              <label className={labelClass}>
                ¿Asiste o asistió a algún profesional de salud?
              </label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_PROFESIONAL_SALUD.map((t) => {
                  const isSelected = profesionalesSalud.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleProfesionalSalud(t.value)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium font-outfit transition-all touch-manipulation ${
                        isSelected
                          ? 'bg-impulso-500 text-white shadow-md'
                          : 'bg-white/80 border border-white/60 text-neutro-carbon hover:shadow-md'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {profesionalesSalud.length === 0 && (
                <p className="text-xs text-neutro-piedra/70 font-outfit mt-2 italic">
                  No se indicaron profesionales (o no especificado)
                </p>
              )}
            </div>

            {/* Problemáticas / complicaciones de salud */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-sol-600" />
                  Problemáticas o complicaciones de salud
                </span>
              </label>
              {problematicasSalud.map((prob) => (
                <div key={prob.key} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 bg-white/50 rounded-2xl border border-white/60">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={prob.descripcion}
                      onChange={(e) => updateProblematicaSalud(prob.key, 'descripcion', e.target.value)}
                      className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
                      placeholder="Descripción del problema o complicación"
                    />
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={prob.profesional_tratante}
                      onChange={(e) => updateProblematicaSalud(prob.key, 'profesional_tratante', e.target.value)}
                      className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
                    >
                      <option value="">Profesional…</option>
                      {TIPOS_PROFESIONAL_SALUD.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-outfit text-neutro-carbon min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={prob.activo}
                        onChange={(e) => updateProblematicaSalud(prob.key, 'activo', e.target.checked)}
                        className="w-4 h-4 rounded text-crecimiento-500 focus:ring-crecimiento-400"
                      />
                      Activo
                    </label>
                    <button
                      type="button"
                      onClick={() => removeProblematicaSalud(prob.key)}
                      className="p-2 text-neutro-piedra hover:text-impulso-500 transition-colors rounded-xl"
                      title="Quitar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addProblematicaSalud}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-white/60 text-sm font-outfit text-neutro-carbon hover:shadow-md transition-all min-h-[44px]"
              >
                <Plus size={14} /> Agregar problemática
              </button>
            </div>

            {/* Obra social y medicación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Obra social</label>
                <input
                  type="text"
                  value={obraSocial}
                  onChange={(e) => setObraSocial(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: OSDE, IOMA, sin cobertura..."
                />
              </div>
              <div>
                <label className={labelClass}>Medicación habitual</label>
                <input
                  type="text"
                  value={medicacionHabitual}
                  onChange={(e) => setMedicacionHabitual(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Ritalina, Risperidona..."
                />
              </div>
            </div>

            {/* Checkboxes de salud */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
                <input
                  type="checkbox"
                  checked={usaLentes}
                  onChange={(e) => setUsaLentes(e.target.checked)}
                  className="w-4 h-4 rounded text-impulso-500 focus:ring-impulso-400"
                />
                Usa lentes
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
                <input
                  type="checkbox"
                  checked={usaAudifono}
                  onChange={(e) => setUsaAudifono(e.target.checked)}
                  className="w-4 h-4 rounded text-impulso-500 focus:ring-impulso-400"
                />
                Usa audífono
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
                <input
                  type="checkbox"
                  checked={requiereAcompanamiento}
                  onChange={(e) => setRequiereAcompanamiento(e.target.checked)}
                  className="w-4 h-4 rounded text-impulso-500 focus:ring-impulso-400"
                />
                Requiere acompañamiento especial
              </label>
            </div>

            {/* Observaciones de salud */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + ' !mb-0'}>Observaciones de salud</label>
                <VoiceToText
                  currentText={observacionesSalud}
                  onTranscript={setObservacionesSalud}
                  disabled={loading}
                />
              </div>
              <textarea
                value={observacionesSalud}
                onChange={(e) => setObservacionesSalud(e.target.value)}
                rows={3}
                className={inputClass + ' min-h-[80px] resize-y'}
                placeholder="Detalles adicionales sobre la salud del niño/a..."
              />
            </div>
          </div>

          {/* ── SECTION 5: Alimentación ──────────────────────── */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <UtensilsCrossed size={20} className="text-sol-600" />
              Alimentación
            </h2>
            <p className="text-xs text-neutro-piedra font-outfit -mt-2">
              Alergias, restricciones y situación alimentaria.
            </p>

            {/* Alergias */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-impulso-500" />
                  Alergias alimentarias
                </span>
              </label>
              <input
                type="text"
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                className={inputClass}
                placeholder="Ej: Gluten, lácteos, maní... (dejar vacío si no hay)"
              />
            </div>

            {/* Restricciones alimentarias */}
            <div>
              <label className={labelClass}>Restricciones alimentarias</label>
              <input
                type="text"
                value={restriccionesAlimentarias}
                onChange={(e) => setRestriccionesAlimentarias(e.target.value)}
                className={inputClass}
                placeholder="Ej: Vegetariano, celíaco, sin cerdo..."
              />
            </div>

            {/* ¿Recibe alimentación escolar? */}
            <div>
              <label className={labelClass}>¿Recibe alimentación escolar?</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="recibeAlimentacionEscolar"
                    checked={recibeAlimentacionEscolar === true}
                    onChange={() => setRecibeAlimentacionEscolar(true)}
                    className="w-5 h-5 text-sol-500 focus:ring-sol-400"
                  />
                  <span className="text-neutro-carbon font-outfit">Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="recibeAlimentacionEscolar"
                    checked={recibeAlimentacionEscolar === false}
                    onChange={() => setRecibeAlimentacionEscolar(false)}
                    className="w-5 h-5 text-sol-500 focus:ring-sol-400"
                  />
                  <span className="text-neutro-carbon font-outfit">No</span>
                </label>
              </div>
            </div>

            {/* Cantidad de comidas + Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Comidas diarias (aprox.)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={cantidadComidasDiarias}
                  onChange={(e) => setCantidadComidasDiarias(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                  placeholder="Ej: 3"
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de alimentación</label>
                <select
                  value={tipoAlimentacion}
                  onChange={(e) => setTipoAlimentacion(e.target.value as typeof tipoAlimentacion)}
                  className={inputClass}
                >
                  <option value="">Sin especificar</option>
                  <option value="completa">Completa</option>
                  <option value="incompleta">Incompleta</option>
                  <option value="insuficiente">Insuficiente</option>
                  <option value="desconocido">Desconocido</option>
                </select>
              </div>
            </div>

            {/* Observaciones alimentación */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + ' !mb-0'}>Observaciones sobre alimentación</label>
                <VoiceToText
                  currentText={observacionesAlimentacion}
                  onTranscript={setObservacionesAlimentacion}
                  disabled={loading}
                />
              </div>
              <textarea
                value={observacionesAlimentacion}
                onChange={(e) => setObservacionesAlimentacion(e.target.value)}
                rows={2}
                className={inputClass + ' min-h-[70px] resize-y'}
                placeholder="Detalles adicionales sobre la alimentación..."
              />
            </div>
          </div>

          {/* ── SECTION 6: Observaciones / Comentarios (todos los roles) */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
            <h2 className={sectionTitleClass}>
              <Heart size={20} className="text-impulso-400" />
              {esProfesional ? 'Observaciones iniciales' : 'Comentarios'}
            </h2>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + ' !mb-0'}>
                  {esProfesional
                    ? 'Notas u observaciones al momento del ingreso'
                    : 'Comentarios o notas sobre el niño'}
                </label>
                <VoiceToText
                  currentText={observaciones}
                  onTranscript={setObservaciones}
                  disabled={loading}
                />
              </div>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className={inputClass + ' min-h-[120px] resize-y'}
                placeholder={
                  esProfesional
                    ? 'Contexto familiar, situación particular, derivación, etc. (también podés dictar con el micrófono 🎤)'
                    : 'Algo que quieras anotar sobre el niño... (también podés dictar con el micrófono 🎤)'
                }
              />
            </div>
          </div>

          {/* ── SECTION 7: Notas profesionales (solo profesionales) ── */}
          {esProfesional && (
            <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 space-y-5">
              <h2 className={sectionTitleClass}>
                <FileText size={20} className="text-crecimiento-600" />
                Notas de la trabajadora social / IA
              </h2>
              <p className="text-xs text-neutro-piedra font-outfit -mt-2">
                Espacio para anotaciones profesionales, conclusiones o análisis generado por IA.
              </p>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' !mb-0'}>Notas o comentarios profesionales</label>
                  <VoiceToText
                    currentText={notasProfesional}
                    onTranscript={setNotasProfesional}
                    disabled={loading}
                  />
                </div>
                <textarea
                  value={notasProfesional}
                  onChange={(e) => setNotasProfesional(e.target.value)}
                  rows={4}
                  className={inputClass + ' min-h-[120px] resize-y'}
                  placeholder="Análisis, conclusiones, derivaciones sugeridas, contexto importante... (también podés dictar con el micrófono 🎤)"
                />
              </div>
            </div>
          )}

          {/* ── SECTION 8: Grabación de reunión (professional) ── */}
          {esProfesional && (
            <div className="space-y-4">
              <MeetingRecorder
                onRecordingComplete={handleRecordingComplete}
                onTranscripcionChange={setTranscripcion}
                onAnalizar={handleAnalizar}
                analizando={analizando}
                disabled={loading}
              />

              {/* AI auto-fill confirmation banner */}
              {camposAutocompletados && (
                <div className="flex items-start gap-3 bg-crecimiento-50/60 border border-crecimiento-200/40 rounded-2xl p-4">
                  <CheckCircle size={20} className="text-crecimiento-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-crecimiento-800 font-outfit">
                      Campos autocompletados por IA
                    </p>
                    <p className="text-xs text-crecimiento-600 font-outfit mt-1">
                      Revisá los datos extraídos y corregí lo que sea necesario antes de guardar.
                    </p>
                  </div>
                </div>
              )}

              {/* AI-generated meeting summary */}
              {resumenIA && (
                <div className="bg-white/60 backdrop-blur-md border border-sol-200/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-neutro-carbon font-outfit flex items-center gap-2">
                      <span className="text-base">✨</span> Resumen de la reunión (generado por IA)
                    </h4>
                  </div>
                  <textarea
                    value={resumenIA}
                    onChange={(e) => setResumenIA(e.target.value)}
                    rows={5}
                    className={inputClass + ' min-h-[100px] resize-y text-sm'}
                  />
                  <p className="text-xs text-neutro-piedra font-outfit">
                    Este resumen se guardará en el perfil del niño. Podés editarlo antes de guardar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Buttons ───────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:flex-1 px-6 py-4 min-h-[56px] bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] font-medium font-outfit active:scale-95 transition-all flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-6 py-4 min-h-[56px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] font-semibold font-outfit disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center shadow-[0_4px_16px_rgba(164,198,57,0.15)]"
            >
              {loading ? 'Guardando...' : '✓ Registrar Niño'}
            </button>
          </div>
        </form>

        {/* ── Info footer ──────────────────────────────────── */}
        <div className="bg-sol-50/60 backdrop-blur-sm border border-sol-200/40 rounded-3xl p-6 shadow-[0_4px_16px_rgba(242,201,76,0.08)]">
          <h3 className="font-semibold text-sol-800 mb-3 font-quicksand flex items-center gap-2">
            <span className="text-xl">ℹ️</span> Importante
          </h3>
          <ul className="text-sm text-sol-700 space-y-2 font-outfit">
            {!esProfesional && (
              <li>• Los datos sensibles (apellido, DNI) los cargará el equipo profesional desde el perfil del niño</li>
            )}
            {esProfesional && (
              <li>• El nombre se usará como identificador visible para los voluntarios (sin apellido)</li>
            )}
            <li>• El nivel de alfabetización se establece mediante evaluación, no al registrar</li>
            {rolActual === 'voluntario' && (
              <li>• El niño quedará automáticamente asignado a vos</li>
            )}
            <li>• Se generará un número de legajo automáticamente</li>
            <li>• Podés empezar a registrar sesiones inmediatamente</li>
          </ul>
        </div>
      </main>

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
                className="p-2 text-neutro-piedra hover:text-neutro-carbon transition-colors rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className={labelClass}>Nombre de la zona *</label>
              <input
                type="text"
                value={nuevaZonaNombre}
                onChange={(e) => setNuevaZonaNombre(e.target.value)}
                className={inputClass}
                placeholder="Ej: Zona Norte, Barrio Centro..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCrearZona(); } }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowZonaModal(false); setNuevaZonaNombre(''); }}
                className="px-4 py-2.5 rounded-2xl bg-white border border-neutro-200 text-neutro-carbon font-outfit text-sm hover:shadow-md transition-all min-h-[44px]"
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
                className="p-2 text-neutro-piedra hover:text-neutro-carbon transition-colors rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className={labelClass}>Nombre de la escuela *</label>
              <input
                type="text"
                value={nuevaEscuelaNombre}
                onChange={(e) => setNuevaEscuelaNombre(e.target.value)}
                className={inputClass}
                placeholder="Ej: Escuela N° 12, Instituto San Martín..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCrearEscuela(); } }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowEscuelaModal(false); setNuevaEscuelaNombre(''); }}
                className="px-4 py-2.5 rounded-2xl bg-white border border-neutro-200 text-neutro-carbon font-outfit text-sm hover:shadow-md transition-all min-h-[44px]"
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

// ═══════════════════════════════════════════════════════════
// FAMILIAR CARD COMPONENT
// ═══════════════════════════════════════════════════════════

function FamiliarCard({
  familiar,
  onChange,
  onRemove,
  canRemove,
}: {
  familiar: FamiliarForm;
  onChange: (field: keyof FamiliarForm, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const tipoColors: Record<TipoFamiliar, string> = {
    madre: 'bg-impulso-50 border-impulso-200/50',
    padre: 'bg-crecimiento-50 border-crecimiento-200/50',
    tutor: 'bg-sol-50 border-sol-200/50',
    referente_escolar: 'bg-blue-50 border-blue-200/50',
    otro: 'bg-neutro-100 border-neutro-200/50',
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-all ${
        tipoColors[familiar.tipo] || tipoColors.otro
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={familiar.tipo}
            onChange={(e) => {
              const nuevoTipo = e.target.value as TipoFamiliar;
              onChange('tipo', nuevoTipo);
              // Resetear relacion: vacío para 'otro', label automático para el resto
              onChange('relacion', nuevoTipo === 'otro' ? '' : FAMILIAR_LABELS[nuevoTipo]);
            }}
            className="text-sm font-semibold font-outfit bg-transparent border-none focus:ring-0 p-0 pr-6 text-neutro-carbon cursor-pointer"
          >
            <option value="madre">👩 Madre</option>
            <option value="padre">👨 Padre</option>
            <option value="tutor">🧑‍🤝‍🧑 Tutor/a</option>
            <option value="referente_escolar">🏫 Referente Escolar</option>
            <option value="otro">👤 Otro</option>
          </select>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-neutro-piedra hover:text-impulso-500 transition-colors rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Especificar vínculo — solo visible cuando tipo es 'otro' */}
      {familiar.tipo === 'otro' && (
        <div>
          <label className="block text-xs font-medium text-neutro-piedra font-outfit mb-1">
            Especificar vínculo <span className="text-impulso-400">*</span>
          </label>
          <input
            type="text"
            value={familiar.relacion}
            onChange={(e) => onChange('relacion', e.target.value)}
            className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
            placeholder="Ej: Abuela, Tía, Vecino/a, Hermano/a mayor..."
            required
          />
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutro-piedra font-outfit mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={familiar.nombre}
            onChange={(e) => onChange('nombre', e.target.value)}
            className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
            placeholder={`Nombre del/la ${FAMILIAR_LABELS[familiar.tipo].toLowerCase()}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutro-piedra font-outfit mb-1">
            Apellido
          </label>
          <input
            type="text"
            value={familiar.apellido}
            onChange={(e) => onChange('apellido', e.target.value)}
            className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
            placeholder={`Apellido del/la ${FAMILIAR_LABELS[familiar.tipo].toLowerCase()}`}
          />
        </div>
      </div>

      {/* Teléfono + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutro-piedra font-outfit mb-1">
            <span className="flex items-center gap-1">
              <Phone size={12} /> Teléfono
            </span>
          </label>
          <input
            type="tel"
            value={familiar.telefono}
            onChange={(e) => onChange('telefono', e.target.value)}
            className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
            placeholder="Ej: 11-2345-6789"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutro-piedra font-outfit mb-1">
            Email (opcional)
          </label>
          <input
            type="email"
            value={familiar.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={inputClass + ' !min-h-[44px] !py-2 text-sm'}
            placeholder="email@ejemplo.com"
          />
        </div>
      </div>

      {/* Flags */}
      <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
            <input
              type="checkbox"
              checked={familiar.vive_con_nino}
              onChange={(e) => onChange('vive_con_nino', e.target.checked)}
              className="w-4 h-4 rounded text-crecimiento-500 focus:ring-crecimiento-400"
            />
            Vive con el niño
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
            <input
              type="checkbox"
              checked={familiar.es_contacto_principal}
              onChange={(e) => onChange('es_contacto_principal', e.target.checked)}
              className="w-4 h-4 rounded text-sol-500 focus:ring-sol-400"
            />
            Contacto principal
          </label>
        </div>
    </div>
  );
}
