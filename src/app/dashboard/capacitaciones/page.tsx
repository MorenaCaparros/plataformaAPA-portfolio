'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuloCapacitacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  area: string | null;
  tipo: 'video' | 'documento' | 'lectura' | 'otro';
  url_recurso: string | null;
  duracion_estimada_minutos: number | null;
  activo: boolean;
  orden: number;
  creado_por: string | null;
  created_at: string;
}

interface ProgresoModulo {
  modulo_id: string;
  estado: string;
  fecha_completado: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AREAS: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'lenguaje', label: 'Lenguaje y Vocabulario', color: 'text-impulso-700', bg: 'bg-impulso-100' },
  { value: 'grafismo', label: 'Grafismo y Motricidad', color: 'text-crecimiento-700', bg: 'bg-crecimiento-100' },
  { value: 'lectura_escritura', label: 'Lectura y Escritura', color: 'text-sol-700', bg: 'bg-sol-100' },
  { value: 'matematicas', label: 'Nociones Matemáticas', color: 'text-orange-700', bg: 'bg-orange-100' },
  { value: 'general', label: 'General', color: 'text-gray-700', bg: 'bg-gray-100' },
];

const TIPOS = [
  { value: 'video', label: '🎬 Video', },
  { value: 'documento', label: '📄 Documento' },
  { value: 'lectura', label: '📖 Lectura' },
  { value: 'otro', label: '🔗 Otro' },
];

function getArea(value: string | null) {
  return AREAS.find(a => a.value === value) ?? { value: value ?? '', label: value ?? 'Sin área', color: 'text-gray-600', bg: 'bg-gray-100' };
}

function getTipoLabel(tipo: string) {
  return TIPOS.find(t => t.value === tipo)?.label ?? tipo;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ titulo, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{titulo}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── FormModulo ───────────────────────────────────────────────────────────────

interface FormModuloProps {
  inicial?: Partial<ModuloCapacitacion>;
  onGuardar: (datos: Partial<ModuloCapacitacion>) => Promise<void>;
  guardando: boolean;
}

function FormModulo({ inicial = {}, onGuardar, guardando }: FormModuloProps) {
  const [nombre, setNombre] = useState(inicial.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial.descripcion ?? '');
  const [area, setArea] = useState(inicial.area ?? 'general');
  const [tipo, setTipo] = useState<ModuloCapacitacion['tipo']>(inicial.tipo ?? 'lectura');
  const [urlRecurso, setUrlRecurso] = useState(inicial.url_recurso ?? '');
  const [duracion, setDuracion] = useState(String(inicial.duracion_estimada_minutos ?? ''));
  const [orden, setOrden] = useState(String(inicial.orden ?? 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      area: area || null,
      tipo,
      url_recurso: urlRecurso.trim() || null,
      duracion_estimada_minutos: duracion ? parseInt(duracion) : null,
      activo: true,
      orden: parseInt(orden) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
        <input
          required
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Técnicas de lectura guiada"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
        <textarea
          rows={3}
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Descripción breve del módulo..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área</label>
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
          >
            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as ModuloCapacitacion['tipo'])}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
          >
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL / Enlace del recurso</label>
        <input
          type="url"
          value={urlRecurso}
          onChange={e => setUrlRecurso(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (min)</label>
          <input
            type="number"
            min="1"
            value={duracion}
            onChange={e => setDuracion(e.target.value)}
            placeholder="30"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden</label>
          <input
            type="number"
            min="0"
            value={orden}
            onChange={e => setOrden(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-crecimiento-400 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={guardando || !nombre.trim()}
          className="px-5 py-2 bg-crecimiento-500 hover:bg-crecimiento-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar módulo'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ROLES_GESTION = ['director', 'coordinador', 'equipo_profesional', 'psicopedagogia'];

export default function CapacitacionesPage() {
  const { user, perfil } = useAuth();
  const router = useRouter();

  const [modulos, setModulos] = useState<ModuloCapacitacion[]>([]);
  const [progreso, setProgreso] = useState<ProgresoModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroArea, setFiltroArea] = useState<string>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Estado modal creación/edición
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState<ModuloCapacitacion | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<ModuloCapacitacion | null>(null);

  const esGestor = perfil?.rol && ROLES_GESTION.includes(perfil.rol);
  const esVoluntario = perfil?.rol === 'voluntario';

  useEffect(() => {
    if (!user || !perfil) return;
    if (!esGestor && !esVoluntario) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, perfil]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar módulos activos (o todos si es gestor)
      const query = supabase
        .from('modulos_capacitacion')
        .select('*')
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true });

      if (esVoluntario) {
        query.eq('activo', true);
      }

      const { data: modulosData, error: modError } = await query;
      if (modError) throw modError;
      setModulos(modulosData ?? []);

      // Si es voluntario, cargar su progreso
      if (esVoluntario && perfil?.id) {
        const { data: progresoData } = await supabase
          .from('progreso_modulos_capacitacion')
          .select('modulo_id, estado, fecha_completado')
          .eq('voluntario_id', perfil.id);
        setProgreso(progresoData ?? []);
      }
    } catch (err) {
      console.error('Error cargando módulos:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Voluntario: marcar completado ──────────────────────────────────────────
  const marcarCompletado = async (moduloId: string) => {
    if (!perfil?.id) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('progreso_modulos_capacitacion')
        .upsert({
          voluntario_id: perfil.id,
          modulo_id: moduloId,
          estado: 'completado',
          fecha_completado: new Date().toISOString(),
        }, { onConflict: 'voluntario_id,modulo_id' });

      if (error) throw error;
      setProgreso(prev => {
        const existing = prev.find(p => p.modulo_id === moduloId);
        if (existing) return prev.map(p => p.modulo_id === moduloId ? { ...p, estado: 'completado', fecha_completado: new Date().toISOString() } : p);
        return [...prev, { modulo_id: moduloId, estado: 'completado', fecha_completado: new Date().toISOString() }];
      });
      setMsg({ tipo: 'ok', texto: '✅ Módulo marcado como completado' });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al guardar el progreso' });
    } finally {
      setGuardando(false);
    }
  };

  // ── Gestor: crear módulo ───────────────────────────────────────────────────
  const crearModulo = async (datos: Partial<ModuloCapacitacion>) => {
    if (!perfil?.id) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('modulos_capacitacion')
        .insert({ ...datos, creado_por: perfil.id });
      if (error) throw error;
      setModalCrear(false);
      setMsg({ tipo: 'ok', texto: '✅ Módulo creado exitosamente' });
      setTimeout(() => setMsg(null), 3000);
      await fetchData();
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al crear el módulo' });
    } finally {
      setGuardando(false);
    }
  };

  // ── Gestor: editar módulo ──────────────────────────────────────────────────
  const editarModulo = async (datos: Partial<ModuloCapacitacion>) => {
    if (!modalEditar) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('modulos_capacitacion')
        .update(datos)
        .eq('id', modalEditar.id);
      if (error) throw error;
      setModalEditar(null);
      setMsg({ tipo: 'ok', texto: '✅ Módulo actualizado' });
      setTimeout(() => setMsg(null), 3000);
      await fetchData();
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al actualizar el módulo' });
    } finally {
      setGuardando(false);
    }
  };

  // ── Gestor: eliminar módulo ────────────────────────────────────────────────
  const eliminarModulo = async () => {
    if (!confirmEliminar) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('modulos_capacitacion')
        .delete()
        .eq('id', confirmEliminar.id);
      if (error) throw error;
      setConfirmEliminar(null);
      setMsg({ tipo: 'ok', texto: '🗑️ Módulo eliminado' });
      setTimeout(() => setMsg(null), 3000);
      setModulos(prev => prev.filter(m => m.id !== confirmEliminar.id));
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al eliminar el módulo' });
    } finally {
      setGuardando(false);
    }
  };

  // ── Gestor: toggle activo ──────────────────────────────────────────────────
  const toggleActivo = async (modulo: ModuloCapacitacion) => {
    try {
      const { error } = await supabase
        .from('modulos_capacitacion')
        .update({ activo: !modulo.activo })
        .eq('id', modulo.id);
      if (error) throw error;
      setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, activo: !m.activo } : m));
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al cambiar el estado del módulo' });
    }
  };

  // ── Derivados ──────────────────────────────────────────────────────────────
  const modulosFiltrados = filtroArea === 'todos'
    ? modulos
    : modulos.filter(m => (m.area ?? 'general') === filtroArea);

  const completados = progreso.filter(p => p.estado === 'completado').length;
  const totalActivos = modulos.filter(m => m.activo).length;
  const progresoPorc = totalActivos > 0 ? Math.round((completados / totalActivos) * 100) : 0;

  const estaCompletado = (moduloId: string) => progreso.some(p => p.modulo_id === moduloId && p.estado === 'completado');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {esGestor ? '🎓 Gestión de Capacitaciones' : '🎓 Mis Capacitaciones'}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {esGestor
                ? 'Creá y administrá los módulos de capacitación para los voluntarios'
                : 'Materiales de formación para voluntarios alfabetizadores'}
            </p>
          </div>
          {esGestor && (
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-xl font-medium text-sm transition-colors shadow-md"
            >
              + Nuevo módulo
            </button>
          )}
        </div>

        {/* Toast */}
        {msg && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            msg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.texto}
          </div>
        )}

        {/* Banner de progreso (solo voluntarios) */}
        {esVoluntario && totalActivos > 0 && (
          <div className="bg-gradient-to-r from-crecimiento-500 to-crecimiento-700 rounded-2xl p-6 mb-8 text-white shadow-lg">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-crecimiento-100 text-sm font-medium">Tu progreso general</p>
                <p className="text-4xl font-bold mt-1">{completados} <span className="text-2xl text-crecimiento-200">/ {totalActivos}</span></p>
                <p className="text-crecimiento-100 text-sm">módulos completados</p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-extrabold">{progresoPorc}%</p>
              </div>
            </div>
            <div className="w-full bg-crecimiento-600/50 rounded-full h-3">
              <div
                className="bg-white rounded-full h-3 transition-all duration-700"
                style={{ width: `${progresoPorc}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats gestor */}
        {esGestor && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{modulos.length}</p>
              <p className="text-xs text-gray-500">Total módulos</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-crecimiento-600">{modulos.filter(m => m.activo).length}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-400">{modulos.filter(m => !m.activo).length}</p>
              <p className="text-xs text-gray-500">Inactivos</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-sol-600">{AREAS.filter(a => modulos.some(m => (m.area ?? 'general') === a.value)).length}</p>
              <p className="text-xs text-gray-500">Áreas cubiertas</p>
            </div>
          </div>
        )}

        {/* Filtro por área */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFiltroArea('todos')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroArea === 'todos'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
          >
            Todos
          </button>
          {AREAS.map(a => (
            <button
              key={a.value}
              onClick={() => setFiltroArea(a.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroArea === a.value
                  ? `${a.bg} ${a.color} ring-2 ring-offset-1 ring-current`
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Lista de módulos */}
        {modulosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 text-center">
            <p className="text-5xl mb-4">🎓</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {esGestor ? 'No hay módulos todavía. ¡Crea el primero!' : 'No hay módulos de capacitación disponibles aún.'}
            </p>
            {esGestor && (
              <button
                onClick={() => setModalCrear(true)}
                className="mt-4 px-5 py-2.5 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-xl text-sm font-medium"
              >
                + Crear primer módulo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {modulosFiltrados.map(modulo => {
              const area = getArea(modulo.area);
              const completado = estaCompletado(modulo.id);
              const abierto = expandido === modulo.id;
              const fechaComp = progreso.find(p => p.modulo_id === modulo.id)?.fecha_completado;

              return (
                <div
                  key={modulo.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all ${
                    completado && esVoluntario
                      ? 'border-crecimiento-200 dark:border-crecimiento-800'
                      : 'border-gray-100 dark:border-gray-700'
                  } ${!modulo.activo && esGestor ? 'opacity-60' : ''}`}
                >
                  {/* Cabecera del módulo */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer"
                    onClick={() => setExpandido(abierto ? null : modulo.id)}
                  >
                    {/* Ícono estado */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                      completado && esVoluntario ? 'bg-crecimiento-100' : area.bg
                    }`}>
                      {completado && esVoluntario ? '✅' : getTipoLabel(modulo.tipo).split(' ')[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{modulo.nombre}</h3>
                        {!modulo.activo && esGestor && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inactivo</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${area.bg} ${area.color}`}>{area.label}</span>
                        <span>{getTipoLabel(modulo.tipo)}</span>
                        {modulo.duracion_estimada_minutos && <span>⏱ {modulo.duracion_estimada_minutos} min</span>}
                        {completado && esVoluntario && fechaComp && (
                          <span className="text-crecimiento-600 font-medium">
                            Completado el {new Date(fechaComp).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones gestor */}
                    {esGestor && (
                      <div className="flex items-center gap-2 ml-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleActivo(modulo)}
                          title={modulo.activo ? 'Desactivar' : 'Activar'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                            modulo.activo
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {modulo.activo ? '👁' : '🚫'}
                        </button>
                        <button
                          onClick={() => setModalEditar(modulo)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-sol-50 text-sol-600 hover:bg-sol-100 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setConfirmEliminar(modulo)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    )}

                    <span className={`text-gray-400 text-sm transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▼</span>
                  </div>

                  {/* Contenido expandido */}
                  {abierto && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                      {modulo.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{modulo.descripcion}</p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        {modulo.url_recurso && (
                          <a
                            href={modulo.url_recurso}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-impulso-50 hover:bg-impulso-100 text-impulso-700 rounded-lg text-sm font-medium transition-colors border border-impulso-200"
                          >
                            🔗 Abrir recurso
                          </a>
                        )}

                        {esVoluntario && !completado && (
                          <button
                            onClick={() => marcarCompletado(modulo.id)}
                            disabled={guardando}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-crecimiento-500 hover:bg-crecimiento-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            ✅ Marcar como completado
                          </button>
                        )}

                        {esVoluntario && completado && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-crecimiento-50 text-crecimiento-700 rounded-lg text-sm font-medium border border-crecimiento-200">
                            ✅ Módulo completado
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear */}
      {modalCrear && (
        <Modal titulo="Nuevo módulo de capacitación" onClose={() => setModalCrear(false)}>
          <FormModulo onGuardar={crearModulo} guardando={guardando} />
        </Modal>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <Modal titulo={`Editar: ${modalEditar.nombre}`} onClose={() => setModalEditar(null)}>
          <FormModulo inicial={modalEditar} onGuardar={editarModulo} guardando={guardando} />
        </Modal>
      )}

      {/* Modal Confirmar Eliminar */}
      {confirmEliminar && (
        <Modal titulo="Confirmar eliminación" onClose={() => setConfirmEliminar(null)}>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            ¿Estás seguro de que querés eliminar el módulo <strong className="text-gray-900 dark:text-white">"{confirmEliminar.nombre}"</strong>?
            Esta acción no se puede deshacer y también eliminará el progreso de todos los voluntarios en este módulo.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmEliminar(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={eliminarModulo}
              disabled={guardando}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {guardando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
