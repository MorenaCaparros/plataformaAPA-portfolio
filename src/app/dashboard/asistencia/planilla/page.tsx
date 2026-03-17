'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Calendar, Filter, BarChart2, Users } from 'lucide-react';

interface NinoRow {
  id: string;
  alias: string;
  zona_nombre: string | null;
  zona_id: string | null;
}

interface AsistenciaRecord {
  nino_id: string;
  fecha: string;
  presente: boolean;
}

interface Zona {
  id: string;
  nombre: string;
}

const DIAS_ES: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00');
  const dia = DIAS_ES[d.getDay()];
  const num = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dia} ${num}/${mes}`;
}

export default function PlanillaAsistenciaPage() {
  const { user, perfil, loading: authLoading } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const hace28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [fechaDesde, setFechaDesde] = useState(hace28);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [ninos, setNinos] = useState<NinoRow[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaFiltro, setZonaFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);

  const esVoluntario = perfil?.rol === 'voluntario';
  const puedeVerZonas = !esVoluntario;

  // ─── Cargar niños ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && user && perfil) {
      fetchNinos();
      if (puedeVerZonas) fetchZonas();
    }
  }, [authLoading, user, perfil]);

  // ─── Cargar asistencias cuando cambien los niños o el rango ───────────────
  useEffect(() => {
    if (ninos.length > 0) fetchAsistencias();
  }, [ninos, fechaDesde, fechaHasta]);

  const fetchZonas = async () => {
    const { data } = await supabase.from('zonas').select('id, nombre').order('nombre');
    setZonas(data || []);
  };

  const fetchNinos = async () => {
    try {
      setLoading(true);
      let ninosData: NinoRow[] = [];

      if (esVoluntario) {
        const { data, error } = await supabase
          .from('asignaciones')
          .select('nino_id, ninos (id, alias, zona_id, zonas (nombre))')
          .eq('voluntario_id', user!.id)
          .eq('activa', true);

        if (error) throw error;
        ninosData = (data || [])
          .map((a: any) => a.ninos)
          .filter(Boolean)
          .map((n: any) => ({
            id: n.id,
            alias: n.alias,
            zona_id: n.zona_id || null,
            zona_nombre: n.zonas?.nombre || null,
          }));
      } else {
        const query = supabase
          .from('ninos')
          .select('id, alias, zona_id, zonas (nombre)')
          .eq('activo', true)
          .order('alias', { ascending: true });

        if (perfil?.rol === 'coordinador' && perfil?.zona_id) {
          query.eq('zona_id', perfil.zona_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        ninosData = (data || []).map((n: any) => ({
          id: n.id,
          alias: n.alias,
          zona_id: n.zona_id || null,
          zona_nombre: n.zonas?.nombre || null,
        }));
      }

      // Orden alfabético
      ninosData.sort((a, b) =>
        a.alias.localeCompare(b.alias, 'es', { sensitivity: 'base' })
      );
      setNinos(ninosData);
    } catch (error) {
      console.error('Error fetching niños:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAsistencias = async () => {
    try {
      setLoadingAsistencias(true);
      const ninoIds = ninos.map(n => n.id);
      if (ninoIds.length === 0) return;

      const { data, error } = await supabase
        .from('asistencias')
        .select('nino_id, fecha, presente')
        .in('nino_id', ninoIds)
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta)
        .order('fecha', { ascending: true });

      if (error) throw error;
      setAsistencias(data || []);
    } catch (error) {
      console.error('Error fetching asistencias:', error);
    } finally {
      setLoadingAsistencias(false);
    }
  };

  // ─── Fechas con al menos un registro ──────────────────────────────────────
  const fechasConDatos = useMemo(() => {
    const set = new Set(asistencias.map(a => a.fecha));
    return Array.from(set).sort();
  }, [asistencias]);

  // ─── Mapa nino_id → fecha → estado ────────────────────────────────────────
  const mapaAsistencias = useMemo(() => {
    const map: Record<string, Record<string, 'presente' | 'ausente'>> = {};
    for (const a of asistencias) {
      if (!map[a.nino_id]) map[a.nino_id] = {};
      map[a.nino_id][a.fecha] = a.presente ? 'presente' : 'ausente';
    }
    return map;
  }, [asistencias]);

  // ─── Niños filtrados por zona ──────────────────────────────────────────────
  const ninosFiltrados = useMemo(() => {
    if (!zonaFiltro) return ninos;
    return ninos.filter(n => n.zona_id === zonaFiltro);
  }, [ninos, zonaFiltro]);

  // ─── Stats generales ───────────────────────────────────────────────────────
  const statsGenerales = useMemo(() => {
    let totalRegistros = 0;
    let totalPresentes = 0;
    for (const a of asistencias) {
      if (ninosFiltrados.some(n => n.id === a.nino_id)) {
        totalRegistros++;
        if (a.presente) totalPresentes++;
      }
    }
    const pct = totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100) : null;
    return { totalRegistros, totalPresentes, pct };
  }, [asistencias, ninosFiltrados]);

  // ─── % de asistencia por niño ──────────────────────────────────────────────
  const pctPorNino = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const nino of ninosFiltrados) {
      const registros = fechasConDatos.filter(
        f => mapaAsistencias[nino.id]?.[f] !== undefined
      );
      if (registros.length === 0) { map[nino.id] = null; continue; }
      const presentes = registros.filter(f => mapaAsistencias[nino.id]?.[f] === 'presente').length;
      map[nino.id] = Math.round((presentes / registros.length) * 100);
    }
    return map;
  }, [ninosFiltrados, fechasConDatos, mapaAsistencias]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando planilla...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link
                href="/dashboard/asistencia"
                className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Registrar asistencia</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                📊 Planilla
              </h1>
              <div className="w-20 sm:w-36" />
            </div>
          </div>
        </div>
      </nav>

      <main className="px-4 sm:px-6 pb-12">
        {/* Filtros: rango de fechas + zona */}
        <div className="max-w-2xl mx-auto mb-4 space-y-3">
          {/* Rango de fechas */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.08)] p-4">
            <label className="text-sm font-medium mb-3 flex items-center gap-2 text-neutro-carbon font-outfit">
              <Calendar className="w-4 h-4" />
              Rango de fechas
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <p className="text-xs text-neutro-piedra mb-1 font-outfit">Desde</p>
                <input
                  type="date"
                  value={fechaDesde}
                  max={fechaHasta}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-outfit focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 transition-all"
                />
              </div>
              <span className="text-neutro-piedra font-outfit text-sm mt-4">→</span>
              <div className="flex-1">
                <p className="text-xs text-neutro-piedra mb-1 font-outfit">Hasta</p>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde}
                  max={today}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-outfit focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Filtro por zona */}
          {puedeVerZonas && zonas.length > 1 && (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.08)] p-4">
              <label className="text-sm font-medium mb-2 flex items-center gap-2 text-neutro-carbon font-outfit">
                <Filter className="w-4 h-4" />
                Zona
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setZonaFiltro('')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-outfit font-medium transition-all ${
                    !zonaFiltro
                      ? 'bg-crecimiento-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                {zonas.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setZonaFiltro(z.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-outfit font-medium transition-all ${
                      zonaFiltro === z.id
                        ? 'bg-crecimiento-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {z.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats generales */}
          {statsGenerales.pct !== null && (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.08)] p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-crecimiento-500" />
                  <span className="text-sm font-semibold text-neutro-carbon font-outfit">
                    Asistencia general:
                  </span>
                  <span className={`text-lg font-bold font-quicksand ${
                    statsGenerales.pct >= 75
                      ? 'text-crecimiento-600'
                      : statsGenerales.pct >= 50
                        ? 'text-sol-600'
                        : 'text-impulso-600'
                  }`}>
                    {statsGenerales.pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutro-piedra font-outfit">
                  <Users className="w-4 h-4" />
                  {ninosFiltrados.length} niños · {fechasConDatos.length} fechas
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    statsGenerales.pct >= 75
                      ? 'bg-crecimiento-400'
                      : statsGenerales.pct >= 50
                        ? 'bg-sol-400'
                        : 'bg-impulso-400'
                  }`}
                  style={{ width: `${statsGenerales.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── TABLA ─────────────────────────────────────────────────────────── */}
        {loadingAsistencias ? (
          <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-3" />
            <p className="text-neutro-piedra font-outfit text-sm">Cargando datos...</p>
          </div>
        ) : fechasConDatos.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-10 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-neutro-carbon font-quicksand font-semibold text-lg mb-2">
              Sin registros en este período
            </p>
            <p className="text-neutro-piedra font-outfit text-sm">
              No hay asistencias cargadas entre el{' '}
              {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}{' '}
              y el{' '}
              {new Date(fechaHasta + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}.
            </p>
          </div>
        ) : ninosFiltrados.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-10 text-center">
            <div className="text-5xl mb-4">👤</div>
            <p className="text-neutro-carbon font-quicksand font-semibold text-lg">
              No hay niños en esta zona
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.08)] bg-white/60 backdrop-blur-md">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/80">
                  {/* Columna fija: nombre */}
                  <th className="sticky left-0 z-10 bg-white/90 backdrop-blur-sm px-4 py-3 text-left font-semibold text-neutro-carbon font-quicksand border-b border-r border-gray-100 min-w-[140px] max-w-[180px]">
                    Niño
                  </th>
                  {/* Columnas de fechas */}
                  {fechasConDatos.map(fecha => (
                    <th
                      key={fecha}
                      className="px-2 py-3 text-center font-medium text-neutro-piedra font-outfit border-b border-gray-100 min-w-[60px] whitespace-nowrap"
                    >
                      <span className="text-xs">{formatFechaCorta(fecha)}</span>
                    </th>
                  ))}
                  {/* Columna %  */}
                  <th className="sticky right-0 z-10 bg-white/90 backdrop-blur-sm px-3 py-3 text-center font-semibold text-neutro-carbon font-quicksand border-b border-l border-gray-100 min-w-[56px]">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {ninosFiltrados.map((nino, rowIdx) => {
                  const pct = pctPorNino[nino.id];
                  const rowBg = rowIdx % 2 === 0 ? 'bg-white/40' : 'bg-gray-50/40';

                  return (
                    <tr key={nino.id} className={`${rowBg} hover:bg-crecimiento-50/30 transition-colors`}>
                      {/* Nombre (sticky) */}
                      <td className={`sticky left-0 z-10 backdrop-blur-sm px-4 py-3 font-medium text-neutro-carbon font-quicksand border-r border-gray-100 truncate max-w-[180px] ${rowBg}`}>
                        <div className="truncate">{nino.alias}</div>
                        {nino.zona_nombre && !zonaFiltro && (
                          <div className="text-xs text-neutro-piedra font-outfit truncate">{nino.zona_nombre}</div>
                        )}
                      </td>

                      {/* Celdas de fechas */}
                      {fechasConDatos.map(fecha => {
                        const estado = mapaAsistencias[nino.id]?.[fecha];
                        return (
                          <td key={fecha} className="px-2 py-3 text-center border-gray-50">
                            {estado === 'presente' ? (
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-crecimiento-500 text-white text-lg mx-auto"
                                title="Presente"
                              >
                                ✓
                              </span>
                            ) : estado === 'ausente' ? (
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-impulso-100 text-impulso-600 text-lg mx-auto"
                                title="Ausente"
                              >
                                ✗
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 text-gray-300 text-xl mx-auto">
                                ·
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* % (sticky right) */}
                      <td className={`sticky right-0 z-10 backdrop-blur-sm px-3 py-3 text-center border-l border-gray-100 font-semibold font-outfit ${rowBg}`}>
                        {pct === null ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <span className={`text-sm ${
                            pct >= 75
                              ? 'text-crecimiento-600'
                              : pct >= 50
                                ? 'text-sol-600'
                                : 'text-impulso-600'
                          }`}>
                            {pct}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Leyenda */}
        {fechasConDatos.length > 0 && (
          <div className="max-w-2xl mx-auto mt-4 flex items-center gap-4 text-xs text-neutro-piedra font-outfit flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-crecimiento-500 text-white text-xs">✓</span>
              Presente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-impulso-100 text-impulso-600 text-xs">✗</span>
              Ausente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 text-gray-300 text-base">·</span>
              Sin registro
            </span>
            <span className="ml-auto text-neutro-piedra/70">
              Solo se muestran fechas con al menos un registro
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
