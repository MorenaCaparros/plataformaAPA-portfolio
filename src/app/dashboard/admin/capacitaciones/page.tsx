'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Capacitacion {
  id: string;
  nombre: string;
  area: string;
  tipo: string;
  es_obligatoria: boolean | null;
  activa: boolean | null;
}

interface VoluntarioConProgreso {
  id: string;
  nombre: string;
  apellido: string;
  completadas: number;
  total: number;
  obligatoriasCompletadas: number;
  obligatoriasTotal: number;
  progreso: Array<{
    capacitacion_id: string;
    estado: string | null;
    fecha_completado: string | null;
    puntaje_final: number | null;
    porcentaje: number | null;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AREAS: Record<string, string> = {
  lenguaje: 'Lenguaje',
  grafismo: 'Grafismo',
  lectura_escritura: 'Lectura y Escritura',
  matematicas: 'Matemáticas',
  general: 'General',
  lenguaje_vocabulario: 'Lenguaje y Vocabulario',
  grafismo_motricidad: 'Grafismo y Motricidad',
  nociones_matematicas: 'Nociones Matemáticas',
};

const ESTADOS_COMPLETADO = ['completada', 'aprobada'];

function getEstadoBadge(estado: string | null) {
  if (!estado || estado === 'pendiente') {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Pendiente</span>;
  }
  if (estado === 'en_progreso') {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-sol-100 text-sol-700">En curso</span>;
  }
  if (ESTADOS_COMPLETADO.includes(estado)) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-crecimiento-100 text-crecimiento-700">✓ Completada</span>;
  }
  if (estado === 'reprobada') {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">✗ No aprobada</span>;
  }
  return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">{estado}</span>;
}

function BarraProgreso({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = pct === 100 ? 'bg-crecimiento-500' : pct > 50 ? 'bg-sol-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-14 text-right">{value}/{total}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCapacitacionesPage() {
  const { perfil } = useAuth();
  const router = useRouter();

  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [voluntarios, setVoluntarios] = useState<VoluntarioConProgreso[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [filtroCapacitacion, setFiltroCapacitacion] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [voluntarioDetalle, setVoluntarioDetalle] = useState<VoluntarioConProgreso | null>(null);

  useEffect(() => {
    if (perfil && perfil.rol !== 'director') {
      router.push('/dashboard');
      return;
    }
    if (perfil?.rol === 'director') {
      fetchData();
    }
  }, [perfil, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Traer todas las capacitaciones activas
      const { data: caps, error: capsError } = await supabase
        .from('capacitaciones')
        .select('id, nombre, area, tipo, es_obligatoria, activa')
        .eq('activa', true)
        .order('nombre');

      if (capsError) throw capsError;
      setCapacitaciones(caps || []);

      // Traer todos los voluntarios
      const { data: perfiles, error: perfilesError } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido')
        .eq('rol', 'voluntario')
        .order('nombre');

      if (perfilesError) throw perfilesError;

      // Traer todos los progresos
      const { data: progresos, error: progresosError } = await supabase
        .from('voluntarios_capacitaciones')
        .select('voluntario_id, capacitacion_id, estado, fecha_completado, puntaje_final, porcentaje');

      if (progresosError) throw progresosError;

      type CapRow = { id: string; nombre: string; area: string; tipo: string; es_obligatoria: boolean | null; activa: boolean | null };
      type PerfilRow = { id: string; nombre: string; apellido: string };
      type ProgresoRow = { voluntario_id: string | null; capacitacion_id: string | null; estado: string | null; fecha_completado: string | null; puntaje_final: number | null; porcentaje: number | null };

      const capsList: CapRow[] = caps || [];
      const totalCaps = capsList.length;
      const obligatorias = capsList.filter((c: CapRow) => c.es_obligatoria).length;

      const voluntariosConProgreso: VoluntarioConProgreso[] = (perfiles as PerfilRow[] || []).map((p: PerfilRow) => {
        const progresosVoluntario = (progresos as ProgresoRow[] || []).filter((pr: ProgresoRow) => pr.voluntario_id === p.id);

        const completadas = progresosVoluntario.filter((pr: ProgresoRow) =>
          ESTADOS_COMPLETADO.includes(pr.estado || '')
        ).length;

        const obligatoriasCompletadas = capsList
          .filter((c: CapRow) => c.es_obligatoria)
          .filter((c: CapRow) =>
            progresosVoluntario.some(
              (pr: ProgresoRow) => pr.capacitacion_id === c.id && ESTADOS_COMPLETADO.includes(pr.estado || '')
            )
          ).length;

        return {
          id: p.id,
          nombre: p.nombre,
          apellido: p.apellido,
          completadas,
          total: totalCaps,
          obligatoriasCompletadas,
          obligatoriasTotal: obligatorias,
          progreso: progresosVoluntario.map((pr: ProgresoRow) => ({
            capacitacion_id: pr.capacitacion_id ?? '',
            estado: pr.estado,
            fecha_completado: pr.fecha_completado,
            puntaje_final: pr.puntaje_final,
            porcentaje: pr.porcentaje,
          })),
        };
      });

      setVoluntarios(voluntariosConProgreso);
    } catch (error) {
      console.error('Error cargando tracking de capacitaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtros ────────────────────────────────────────────────────────────────

  const voluntariosFiltrados = voluntarios.filter(v => {
    const nombreCompleto = `${v.nombre} ${v.apellido}`.toLowerCase();
    if (busqueda && !nombreCompleto.includes(busqueda.toLowerCase())) return false;

    if (filtroCapacitacion !== 'todas') {
      const prg = v.progreso.find(p => p.capacitacion_id === filtroCapacitacion);
      if (filtroEstado === 'completada') {
        return prg && ESTADOS_COMPLETADO.includes(prg.estado || '');
      }
      if (filtroEstado === 'no_completada') {
        return !prg || !ESTADOS_COMPLETADO.includes(prg.estado || '');
      }
      if (filtroEstado === 'en_progreso') {
        return prg?.estado === 'en_progreso';
      }
    } else {
      if (filtroEstado === 'completada') return v.completadas === v.total && v.total > 0;
      if (filtroEstado === 'no_completada') return v.completadas < v.total;
      if (filtroEstado === 'pendiente') return v.completadas === 0;
    }

    return true;
  });

  // ─── Stats resumen ──────────────────────────────────────────────────────────

  const totalCompletaronTodo = voluntarios.filter(v => v.total > 0 && v.completadas === v.total).length;
  const totalCompletaronObligatorias = voluntarios.filter(v => v.obligatoriasTotal > 0 && v.obligatoriasCompletadas === v.obligatoriasTotal).length;
  const totalSinComenzar = voluntarios.filter(v => v.completadas === 0).length;

  if (!perfil || perfil.rol !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo directores pueden acceder a esta página.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tracking de capacitaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard/admin" className="text-gray-600 hover:text-gray-900 text-sm">
              ← Volver al panel
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracking de Capacitaciones</h1>
          <p className="text-gray-600">Seguimiento del progreso de los voluntarios en cada capacitación</p>
        </div>

        {/* Stats resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-crecimiento-500">
            <p className="text-xs text-gray-500 mb-1">Total voluntarios</p>
            <p className="text-2xl font-bold text-gray-900">{voluntarios.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-impulso-400">
            <p className="text-xs text-gray-500 mb-1">Completaron todo</p>
            <p className="text-2xl font-bold text-gray-900">{totalCompletaronTodo}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-sol-400">
            <p className="text-xs text-gray-500 mb-1">Obligatorias completas</p>
            <p className="text-2xl font-bold text-gray-900">{totalCompletaronObligatorias}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-400">
            <p className="text-xs text-gray-500 mb-1">Sin comenzar</p>
            <p className="text-2xl font-bold text-gray-900">{totalSinComenzar}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar voluntario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-sm"
              />
            </div>
            <div className="sm:w-64">
              <select
                value={filtroCapacitacion}
                onChange={e => setFiltroCapacitacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-sm"
              >
                <option value="todas">Todas las capacitaciones</option>
                {capacitaciones.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.es_obligatoria ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-44">
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-sm"
              >
                <option value="todos">Todos los estados</option>
                <option value="completada">✓ Completaron</option>
                <option value="no_completada">✗ No completaron</option>
                <option value="en_progreso">En curso</option>
                {filtroCapacitacion === 'todas' && <option value="pendiente">Sin comenzar</option>}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">* = capacitación obligatoria &nbsp;·&nbsp; Mostrando {voluntariosFiltrados.length} de {voluntarios.length} voluntarios</p>
        </div>

        {/* Tabla de seguimiento */}
        {filtroCapacitacion === 'todas' ? (
          /* Vista general: una fila por voluntario con barra de progreso */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voluntario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso general</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obligatorias</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {voluntariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No hay voluntarios que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : voluntariosFiltrados.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {v.nombre} {v.apellido}
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <BarraProgreso value={v.completadas} total={v.total} />
                      </td>
                      <td className="px-4 py-3">
                        {v.obligatoriasTotal > 0 ? (
                          <span className={`text-xs font-medium ${v.obligatoriasCompletadas === v.obligatoriasTotal ? 'text-crecimiento-600' : 'text-red-600'}`}>
                            {v.obligatoriasCompletadas}/{v.obligatoriasTotal}
                            {v.obligatoriasCompletadas < v.obligatoriasTotal && ' ⚠️'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setVoluntarioDetalle(v)}
                          className="text-xs text-crecimiento-600 hover:text-crecimiento-800 font-medium"
                        >
                          Ver detalle →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Vista por capacitación específica: una fila por voluntario con estado */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {(() => {
              const cap = capacitaciones.find(c => c.id === filtroCapacitacion);
              return (
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                  <p className="font-semibold text-gray-900">{cap?.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {AREAS[cap?.area || ''] || cap?.area}
                    {cap?.es_obligatoria && <span className="ml-2 text-red-600 font-medium">• Obligatoria</span>}
                  </p>
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voluntario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntaje</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha completado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {voluntariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No hay voluntarios que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : voluntariosFiltrados.map(v => {
                    const prg = v.progreso.find(p => p.capacitacion_id === filtroCapacitacion);
                    return (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {v.nombre} {v.apellido}
                        </td>
                        <td className="px-4 py-3">
                          {getEstadoBadge(prg?.estado ?? null)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {prg?.puntaje_final != null ? `${prg.puntaje_final}` : '—'}
                          {prg?.porcentaje != null ? ` (${prg.porcentaje}%)` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {prg?.fecha_completado
                            ? new Date(prg.fecha_completado).toLocaleDateString('es-AR')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal detalle voluntario */}
        {voluntarioDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {voluntarioDetalle.nombre} {voluntarioDetalle.apellido}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {voluntarioDetalle.completadas}/{voluntarioDetalle.total} capacitaciones completadas
                  </p>
                </div>
                <button
                  onClick={() => setVoluntarioDetalle(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-2">
                {capacitaciones.map(cap => {
                  const prg = voluntarioDetalle.progreso.find(p => p.capacitacion_id === cap.id);
                  return (
                    <div key={cap.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {cap.nombre}
                          {cap.es_obligatoria && <span className="ml-2 text-xs text-red-500">obligatoria</span>}
                        </p>
                        <p className="text-xs text-gray-400">{AREAS[cap.area] || cap.area}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        {getEstadoBadge(prg?.estado ?? null)}
                        {prg?.fecha_completado && (
                          <span className="text-xs text-gray-400">
                            {new Date(prg.fecha_completado).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
