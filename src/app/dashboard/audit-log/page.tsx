'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import DashboardHeader from '@/components/dashboard/ui/DashboardHeader';
import {
  ShieldCheckIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_rol: string | null;
  tabla: string;
  fila_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  valores_antes: Record<string, unknown> | null;
  valores_despues: Record<string, unknown> | null;
  campos_modificados: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACCION_BADGE: Record<string, { label: string; classes: string }> = {
  INSERT: { label: 'Creación',    classes: 'bg-crecimiento-100 text-crecimiento-700' },
  UPDATE: { label: 'Modificación', classes: 'bg-sol-100 text-sol-700' },
  DELETE: { label: 'Eliminación', classes: 'bg-impulso-100 text-impulso-700' },
};

const TABLA_LABEL: Record<string, string> = {
  perfiles:     'Usuarios',
  ninos:        'Niños',
  sesiones:     'Sesiones',
  asignaciones: 'Asignaciones',
  documentos:   'Documentos',
};

function AccionBadge({ accion }: { accion: string }) {
  const badge = ACCION_BADGE[accion] ?? { label: accion, classes: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-outfit ${badge.classes}`}>
      {badge.label}
    </span>
  );
}

function CamposModificados({ campos }: { campos: string[] | null }) {
  if (!campos?.length) return <span className="text-neutro-piedra text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {campos.slice(0, 4).map((c) => (
        <span key={c} className="bg-neutro-lienzo border border-neutro-piedra/20 text-neutro-piedra text-xs px-2 py-0.5 rounded-lg font-mono">
          {c}
        </span>
      ))}
      {campos.length > 4 && (
        <span className="text-neutro-piedra text-xs">+{campos.length - 4}</span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AuditLogPage() {
  const { perfil } = useAuth();

  // Filtros
  const [tabla,   setTabla]   = useState('');
  const [accion,  setAccion]  = useState('');
  const [userId,  setUserId]  = useState('');
  const [desde,   setDesde]   = useState('');
  const [hasta,   setHasta]   = useState('');
  const [page,    setPage]    = useState(1);

  // Carga de datos
  const fetchLogs = useCallback(async (): Promise<LogsResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sin sesión');

    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (tabla)  params.set('tabla',   tabla);
    if (accion) params.set('accion',  accion);
    if (userId) params.set('user_id', userId);
    if (desde)  params.set('desde',   new Date(desde).toISOString());
    if (hasta)  params.set('hasta',   new Date(hasta + 'T23:59:59').toISOString());

    const res = await fetch(`/api/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error');
    return res.json();
  }, [tabla, accion, userId, desde, hasta, page]);

  const { data, isLoading, error, refetch } = useQuery<LogsResponse>({
    queryKey: ['audit-logs', tabla, accion, userId, desde, hasta, page],
    queryFn: fetchLogs,
    staleTime: 30_000,
  });

  // Solo admin/director pueden ver esta página
  if (perfil && !['admin', 'director'].includes(perfil.rol)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheckIcon className="w-16 h-16 text-impulso-400" />
        <p className="font-outfit text-neutro-piedra text-lg">Sin permisos para ver esta sección.</p>
      </div>
    );
  }

  const handleFiltrar = () => {
    setPage(1);
    refetch();
  };

  const handleLimpiar = () => {
    setTabla(''); setAccion(''); setUserId(''); setDesde(''); setHasta('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Log de Auditoría"
        subtitle="Registro de todas las acciones realizadas en el sistema"
        action={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Actualizar
          </button>
        }
      />

      {/* Panel de filtros */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-4 h-4 text-sol-600" />
          <span className="font-outfit font-semibold text-neutro-carbon text-sm">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Tabla */}
          <div className="flex flex-col gap-1">
            <label className="font-outfit text-xs text-neutro-piedra">Tabla</label>
            <select
              value={tabla}
              onChange={(e) => setTabla(e.target.value)}
              className="rounded-xl border border-neutro-piedra/20 bg-white/80 px-3 py-2 text-sm font-outfit text-neutro-carbon focus:outline-none focus:ring-2 focus:ring-crecimiento-400"
            >
              <option value="">Todas</option>
              {Object.entries(TABLA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Acción */}
          <div className="flex flex-col gap-1">
            <label className="font-outfit text-xs text-neutro-piedra">Acción</label>
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="rounded-xl border border-neutro-piedra/20 bg-white/80 px-3 py-2 text-sm font-outfit text-neutro-carbon focus:outline-none focus:ring-2 focus:ring-crecimiento-400"
            >
              <option value="">Todas</option>
              <option value="INSERT">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>

          {/* Desde */}
          <div className="flex flex-col gap-1">
            <label className="font-outfit text-xs text-neutro-piedra">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl border border-neutro-piedra/20 bg-white/80 px-3 py-2 text-sm font-outfit text-neutro-carbon focus:outline-none focus:ring-2 focus:ring-crecimiento-400"
            />
          </div>

          {/* Hasta */}
          <div className="flex flex-col gap-1">
            <label className="font-outfit text-xs text-neutro-piedra">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-xl border border-neutro-piedra/20 bg-white/80 px-3 py-2 text-sm font-outfit text-neutro-carbon focus:outline-none focus:ring-2 focus:ring-crecimiento-400"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-1">
            <label className="font-outfit text-xs text-neutro-piedra invisible">.</label>
            <div className="flex gap-2">
              <button
                onClick={handleFiltrar}
                className="flex-1 bg-crecimiento-400 hover:bg-crecimiento-500 text-white rounded-xl px-3 py-2 text-sm font-outfit font-medium transition-colors"
              >
                Filtrar
              </button>
              <button
                onClick={handleLimpiar}
                className="px-3 py-2 bg-white/80 border border-neutro-piedra/20 text-neutro-piedra rounded-xl text-sm font-outfit hover:bg-neutro-lienzo transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden shadow-sm">

        {/* Estado: cargando */}
        {isLoading && (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Estado: error */}
        {error && (
          <div className="p-8 text-center text-impulso-600 font-outfit">
            Error al cargar: {(error as Error).message}
          </div>
        )}

        {/* Tabla */}
        {!isLoading && !error && (
          <>
            {/* Header info */}
            <div className="px-6 py-4 border-b border-neutro-piedra/10 flex items-center justify-between">
              <span className="font-outfit text-sm text-neutro-piedra">
                {data?.total ?? 0} registros encontrados
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutro-lienzo/60">
                    <th className="text-left px-6 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">Fecha / Hora</th>
                    <th className="text-left px-4 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-4 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">Tabla</th>
                    <th className="text-left px-4 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">Acción</th>
                    <th className="text-left px-4 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">Campos modificados</th>
                    <th className="text-left px-4 py-3 font-outfit font-semibold text-neutro-piedra text-xs uppercase tracking-wide">ID fila</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutro-piedra/10">
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-neutro-piedra font-outfit">
                        No hay registros con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {data?.data.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-neutro-piedra/10">
              {data?.data.length === 0 && (
                <p className="text-center py-12 text-neutro-piedra font-outfit">
                  No hay registros con los filtros seleccionados.
                </p>
              )}
              {data?.data.map((log) => (
                <MobileLogCard key={log.id} log={log} />
              ))}
            </div>

            {/* Paginación */}
            {(data?.total_pages ?? 0) > 1 && (
              <div className="px-6 py-4 border-t border-neutro-piedra/10 flex items-center justify-between gap-4">
                <span className="font-outfit text-xs text-neutro-piedra">
                  Página {data?.page} de {data?.total_pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutro-piedra/20 text-neutro-piedra disabled:opacity-40 hover:bg-neutro-lienzo transition-colors font-outfit text-xs"
                  >
                    <ChevronLeftIcon className="w-3 h-3" /> Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data?.total_pages ?? p, p + 1))}
                    disabled={page >= (data?.total_pages ?? 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutro-piedra/20 text-neutro-piedra disabled:opacity-40 hover:bg-neutro-lienzo transition-colors font-outfit text-xs"
                  >
                    Siguiente <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Fila de tabla (desktop) ──────────────────────────────────────────────────
function LogRow({ log }: { log: AuditLog }) {
  const fecha = (() => {
    try { return format(parseISO(log.created_at), "dd MMM yyyy, HH:mm", { locale: es }); }
    catch { return log.created_at; }
  })();

  return (
    <tr className="hover:bg-neutro-lienzo/40 transition-colors">
      <td className="px-6 py-3 font-outfit text-xs text-neutro-piedra whitespace-nowrap">{fecha}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-outfit text-xs font-medium text-neutro-carbon truncate max-w-[160px]">
            {log.user_email ?? 'Sistema'}
          </span>
          {log.user_rol && (
            <span className="font-outfit text-[10px] text-neutro-piedra capitalize">{log.user_rol}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-outfit text-xs text-neutro-carbon">
        {TABLA_LABEL[log.tabla] ?? log.tabla}
      </td>
      <td className="px-4 py-3">
        <AccionBadge accion={log.accion} />
      </td>
      <td className="px-4 py-3">
        <CamposModificados campos={log.campos_modificados} />
      </td>
      <td className="px-4 py-3 font-mono text-[10px] text-neutro-piedra truncate max-w-[120px]">
        {log.fila_id}
      </td>
    </tr>
  );
}

// ─── Card mobile ──────────────────────────────────────────────────────────────
function MobileLogCard({ log }: { log: AuditLog }) {
  const fecha = (() => {
    try { return format(parseISO(log.created_at), "dd MMM yyyy, HH:mm", { locale: es }); }
    catch { return log.created_at; }
  })();

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <AccionBadge accion={log.accion} />
        <span className="font-outfit text-xs text-neutro-piedra">{fecha}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="font-outfit text-xs font-medium text-neutro-carbon">{log.user_email ?? 'Sistema'}</span>
        <span className="font-outfit text-xs text-neutro-carbon">{TABLA_LABEL[log.tabla] ?? log.tabla}</span>
      </div>
      <CamposModificados campos={log.campos_modificados} />
    </div>
  );
}
