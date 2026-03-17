'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  CheckCircle,
  History,
  User,
  GraduationCap,
  MapPin,
  Calendar,
  Info,
} from 'lucide-react';
import type { Nino, Zona, Escuela } from '@/types/database';

// ─── Opciones ──────────────────────────────────────────────────────────────

const RANGOS_ETARIOS = ['5-7', '8-10', '11-13', '14-16', '17+'];
const GENEROS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];
const NIVELES_ALFABETIZACION = [
  'pre_lector',
  'inicial',
  'basico',
  'intermedio',
  'avanzado',
  'sin_evaluar',
];
const TURNOS = [
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
];
const GRADOS = [
  '1° grado', '2° grado', '3° grado', '4° grado', '5° grado', '6° grado',
  '7° grado', '1° año', '2° año', '3° año', '4° año', '5° año', '6° año',
];

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface FormData {
  alias: string;
  legajo: string;
  fecha_nacimiento: string;
  rango_etario: string;
  genero: string;
  nivel_alfabetizacion: string;
  escolarizado: boolean;
  grado_escolar: string;
  turno_escolar: string;
  activo: boolean;
  fecha_ingreso: string;
  zona_id: string;
  escuela_id: string;
}

interface CambioHistorial {
  id: string;
  operacion: string;
  columnas_modificadas: string[];
  datos_anteriores: Record<string, unknown>;
  datos_nuevos: Record<string, unknown>;
  created_at: string;
  usuario_nombre: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function labelCampo(key: string): string {
  const labels: Record<string, string> = {
    alias: 'Alias',
    legajo: 'Legajo',
    fecha_nacimiento: 'Fecha de nacimiento',
    rango_etario: 'Rango etario',
    genero: 'Género',
    nivel_alfabetizacion: 'Nivel de alfabetización',
    escolarizado: 'Escolarizado',
    grado_escolar: 'Grado escolar',
    turno_escolar: 'Turno escolar',
    activo: 'Activo en el programa',
    fecha_ingreso: 'Fecha de ingreso',
    zona_id: 'Zona',
    escuela_id: 'Escuela',
  };
  return labels[key] || key;
}

function formatearValor(key: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (key === 'fecha_nacimiento' || key === 'fecha_ingreso') {
    return new Date(val as string).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }
  return String(val);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function EditarNinoPage() {
  const params = useParams();
  const router = useRouter();
  const { user, perfil } = useAuth();
  const ninoId = params.ninoId as string;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zonas, setZonas] = useState<Pick<Zona, 'id' | 'nombre'>[]>([]);
  const [escuelas, setEscuelas] = useState<Pick<Escuela, 'id' | 'nombre'>[]>([]);
  const [historial, setHistorial] = useState<CambioHistorial[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [ninoOriginal, setNinoOriginal] = useState<FormData | null>(null);

  const [form, setForm] = useState<FormData>({
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

  // Solo roles con permiso pueden editar
  const puedeEditar =
    perfil?.rol &&
    ['psicopedagogia', 'director', 'admin', 'coordinador', 'trabajador_social', 'trabajadora_social', 'equipo_profesional'].includes(
      perfil.rol
    );

  useEffect(() => {
    if (user && puedeEditar) {
      fetchDatos();
    } else if (user && !puedeEditar) {
      router.replace(`/dashboard/ninos/${ninoId}`);
    }
  }, [ninoId, user]);

  const fetchDatos = async () => {
    try {
      setLoading(true);

      // Cargar niño
      const { data: ninoData, error: ninoError } = await supabase
        .from('ninos')
        .select('*')
        .eq('id', ninoId)
        .single();
      if (ninoError) throw ninoError;

      const formInicial: FormData = {
        alias: ninoData.alias || '',
        legajo: ninoData.legajo || '',
        fecha_nacimiento: ninoData.fecha_nacimiento || '',
        rango_etario: ninoData.rango_etario || '',
        genero: ninoData.genero || '',
        nivel_alfabetizacion: ninoData.nivel_alfabetizacion || '',
        escolarizado: ninoData.escolarizado ?? false,
        grado_escolar: ninoData.grado_escolar || '',
        turno_escolar: ninoData.turno_escolar || '',
        activo: ninoData.activo ?? true,
        fecha_ingreso: ninoData.fecha_ingreso || '',
        zona_id: ninoData.zona_id || '',
        escuela_id: ninoData.escuela_id || '',
      };
      setForm(formInicial);
      setNinoOriginal(formInicial);

      // Cargar zonas y escuelas
      const [{ data: zonasData }, { data: escuelasData }] = await Promise.all([
        supabase.from('zonas').select('id, nombre').eq('activa', true).order('nombre'),
        supabase.from('escuelas').select('id, nombre').eq('activa', true).order('nombre'),
      ]);
      setZonas(zonasData || []);
      setEscuelas(escuelasData || []);

      // Cargar historial de cambios para este niño
      const { data: historialData } = await supabase
        .from('historial_cambios')
        .select('id, operacion, columnas_modificadas, datos_anteriores, datos_nuevos, created_at, usuario_id')
        .eq('tabla', 'ninos')
        .eq('registro_id', ninoId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (historialData && historialData.length > 0) {
        // Traer nombres de los usuarios
        const usuarioIds = [...new Set(historialData.map((h: any) => h.usuario_id).filter(Boolean))];
        let nombresMap: Record<string, string> = {};
        if (usuarioIds.length > 0) {
          const { data: perfilesData } = await supabase
            .from('perfiles')
            .select('id, nombre, apellido')
            .in('id', usuarioIds as string[]);
          (perfilesData || []).forEach((p: any) => {
            nombresMap[p.id] = `${p.nombre} ${p.apellido}`.trim();
          });
        }
        setHistorial(
          historialData.map((h: any) => ({
            id: h.id,
            operacion: h.operacion,
            columnas_modificadas: h.columnas_modificadas || [],
            datos_anteriores: h.datos_anteriores || {},
            datos_nuevos: h.datos_nuevos || {},
            created_at: h.created_at,
            usuario_nombre: nombresMap[h.usuario_id] || 'Usuario desconocido',
          }))
        );
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos del niño.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setExito(false);
    setError(null);
  };

  const handleGuardar = async () => {
    if (!user || !ninoOriginal) return;
    if (!form.alias.trim()) {
      setError('El alias es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      // Detectar qué campos cambiaron
      const camposModificados: string[] = [];
      const datosAnteriores: Record<string, unknown> = {};
      const datosNuevos: Record<string, unknown> = {};

      (Object.keys(form) as (keyof FormData)[]).forEach((key) => {
        const valOriginal = ninoOriginal[key];
        const valNuevo = form[key];
        // Normalizar para comparar (empty string vs null)
        const orig = valOriginal === '' ? null : valOriginal;
        const nuevo = valNuevo === '' ? null : valNuevo;
        if (orig !== nuevo) {
          camposModificados.push(key);
          datosAnteriores[key] = valOriginal;
          datosNuevos[key] = valNuevo;
        }
      });

      if (camposModificados.length === 0) {
        setError('No hay cambios para guardar.');
        return;
      }

      // Preparar objeto de update (solo campos modificados)
      const updatePayload: Record<string, unknown> = {};
      camposModificados.forEach((key) => {
        const val = form[key as keyof FormData];
        updatePayload[key] = val === '' ? null : val;
      });

      // Guardar cambios en ninos
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

      // Actualizar estado local
      setNinoOriginal({ ...form });
      setExito(true);

      // Recargar historial
      await fetchDatos();

      setTimeout(() => setExito(false), 3000);
    } catch (err: any) {
      console.error('Error guardando cambios:', err);
      setError(err.message || 'Error al guardar los cambios. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos del niño...</p>
        </div>
      </div>
    );
  }

  if (!puedeEditar) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-crecimiento-600 hover:text-crecimiento-700 font-medium mb-3 flex items-center gap-2 touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al perfil
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-crecimiento-500" />
                Editar datos del niño
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Legajo: <span className="font-mono font-medium">{form.legajo || '—'}</span>
              </p>
            </div>
            <button
              onClick={() => setMostrarHistorial((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                mostrarHistorial
                  ? 'bg-impulso-50 border-impulso-300 text-impulso-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <History className="w-4 h-4" />
              Historial
              {historial.length > 0 && (
                <span className="px-1.5 py-0.5 bg-impulso-100 text-impulso-700 rounded-full text-xs font-bold">
                  {historial.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Historial de cambios */}
        {mostrarHistorial && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-impulso-400">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-impulso-500" />
              Historial de ediciones
            </h2>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay ediciones previas registradas.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {historial.map((h) => (
                  <div key={h.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-impulso-700 bg-impulso-50 px-2 py-0.5 rounded-full">
                        {h.operacion}
                      </span>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700">{h.usuario_nombre}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(h.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    {h.columnas_modificadas.length > 0 && (
                      <div className="space-y-1.5">
                        {h.columnas_modificadas.map((col) => (
                          <div key={col} className="text-xs">
                            <span className="font-medium text-gray-600">{labelCampo(col)}:</span>{' '}
                            <span className="line-through text-red-500 mr-1">
                              {formatearValor(col, h.datos_anteriores[col])}
                            </span>
                            <span className="text-crecimiento-600 font-medium">→</span>{' '}
                            <span className="text-crecimiento-700 font-medium">
                              {formatearValor(col, h.datos_nuevos[col])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aviso de auditoría */}
        <div className="flex gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <p>
            Todos los cambios quedan registrados con tu nombre, la fecha y los valores anteriores y nuevos.
          </p>
        </div>

        {/* ── Sección: Identidad ── */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-crecimiento-500" />
            Identidad
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alias <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.alias}
                onChange={(e) => handleChange('alias', e.target.value)}
                placeholder="Nombre de pila o apodo"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legajo</label>
              <input
                type="text"
                value={form.legajo}
                onChange={(e) => handleChange('legajo', e.target.value)}
                placeholder="Ej: 2024-001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                <select
                  value={form.genero}
                  onChange={(e) => handleChange('genero', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Sin especificar</option>
                  {GENEROS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rango etario</label>
                <select
                  value={form.rango_etario}
                  onChange={(e) => handleChange('rango_etario', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Sin especificar</option>
                  {RANGOS_ETARIOS.map((r) => (
                    <option key={r} value={r}>{r} años</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Sección: Escolaridad ── */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sol-500" />
            Escolaridad
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange('escolarizado', !form.escolarizado)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.escolarizado ? 'bg-crecimiento-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.escolarizado ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {form.escolarizado ? 'Escolarizado' : 'No escolarizado'}
              </span>
            </div>
            {form.escolarizado && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grado / Año</label>
                  <select
                    value={form.grado_escolar}
                    onChange={(e) => handleChange('grado_escolar', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Sin especificar</option>
                    {GRADOS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                  <select
                    value={form.turno_escolar}
                    onChange={(e) => handleChange('turno_escolar', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Sin especificar</option>
                    {TURNOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escuela
              </label>
              <select
                value={form.escuela_id}
                onChange={(e) => handleChange('escuela_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
              >
                <option value="">Sin asignar</option>
                {escuelas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de alfabetización
              </label>
              <select
                value={form.nivel_alfabetizacion}
                onChange={(e) => handleChange('nivel_alfabetizacion', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
              >
                <option value="">Sin evaluar</option>
                {NIVELES_ALFABETIZACION.map((n) => (
                  <option key={n} value={n}>{n.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Sección: Programa ── */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-impulso-500" />
            Datos del Programa
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select
                value={form.zona_id}
                onChange={(e) => handleChange('zona_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm bg-white"
              >
                <option value="">Sin asignar</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>{z.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Fecha de ingreso al programa
              </label>
              <input
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) => handleChange('fecha_ingreso', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-300 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleChange('activo', !form.activo)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.activo ? 'bg-crecimiento-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.activo ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {form.activo ? 'Activo en el programa' : 'Inactivo / egresado'}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            {error}
          </div>
        )}
        {exito && (
          <div className="flex gap-3 px-4 py-3 bg-crecimiento-50 border border-crecimiento-200 rounded-xl text-sm text-crecimiento-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-crecimiento-500" />
            ¡Cambios guardados exitosamente! El historial fue actualizado.
          </div>
        )}

        {/* Botón guardar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-crecimiento-500 hover:bg-crecimiento-600 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all touch-manipulation min-h-[52px] text-base"
        >
          {guardando ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
