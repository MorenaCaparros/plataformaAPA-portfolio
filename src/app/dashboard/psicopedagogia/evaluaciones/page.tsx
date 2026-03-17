'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList, Plus, Calendar, User, AlertCircle, FileText,
  Search, SlidersHorizontal, MapPin, ArrowUpDown, ChevronDown, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Evaluacion {
  id: string;
  nino_id: string;
  fecha: string;
  tipo: string;
  observaciones: string | null;
  conclusiones: string | null;
  acciones_sugeridas: string | null;
  nino: {
    id: string;
    alias: string;
    fecha_nacimiento: string | null;
    rango_etario: string | null;
    zona?: { nombre: string } | null;
  } | null;
  entrevistador: {
    nombre: string;
    apellido: string;
  } | null;
}

interface NinoPendiente {
  id: string;
  alias: string;
  ultima_evaluacion: string | null;
  dias_desde_evaluacion: number | null;
}

interface Zona {
  id: string;
  nombre: string;
}

type SortKey = 'fecha_desc' | 'fecha_asc' | 'nombre_asc' | 'nombre_desc';

const RANGOS_ETARIOS = ['5-7', '8-10', '11-13', '14-16', '17+'];

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function EvaluacionesPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [ninosPendientes, setNinosPendientes] = useState<NinoPendiente[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'evaluaciones' | 'pendientes'>('evaluaciones');

  // Filters
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState('todas');
  const [filtroRango, setFiltroRango] = useState('todos');
  const [sortKey, setSortKey] = useState<SortKey>('fecha_desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchZonas(); }, []);

  useEffect(() => {
    if (tab === 'evaluaciones') fetchEvaluaciones();
    else fetchNinosPendientes();
  }, [tab]);

  async function fetchZonas() {
    const { data } = await supabase.from('zonas').select('id, nombre').order('nombre');
    if (data) setZonas(data);
  }

  async function fetchEvaluaciones() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entrevistas')
        .select(`
          id, nino_id, fecha, tipo, observaciones, conclusiones, acciones_sugeridas,
          nino:ninos!entrevistas_nino_id_fkey(
            id, alias, fecha_nacimiento, rango_etario,
            zona:zonas(nombre)
          ),
          entrevistador:perfiles!entrevistas_entrevistador_id_fkey(nombre, apellido)
        `)
        .eq('tipo', 'inicial')
        .order('fecha', { ascending: false })
        .limit(200);
      if (error) throw error;
      setEvaluaciones((data as Evaluacion[]) || []);
    } catch (error) {
      console.error('Error al cargar evaluaciones:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNinosPendientes() {
    try {
      setLoading(true);
      const { data: ninos, error } = await supabase
        .from('ninos')
        .select('id, alias, entrevistas(fecha)')
        .order('alias', { ascending: true });
      if (error) throw error;

      const hoy = new Date();
      const pendientes: NinoPendiente[] = [];

      for (const nino of ninos || []) {
        const entrevistas = (nino as any).entrevistas || [];
        if (entrevistas.length === 0) {
          pendientes.push({ id: nino.id, alias: nino.alias, ultima_evaluacion: null, dias_desde_evaluacion: null });
        } else {
          const ordenadas = [...entrevistas].sort(
            (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
          const diasDesde = Math.floor(
            (hoy.getTime() - new Date(ordenadas[0].fecha).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diasDesde >= 180) {
            pendientes.push({ id: nino.id, alias: nino.alias, ultima_evaluacion: ordenadas[0].fecha, dias_desde_evaluacion: diasDesde });
          }
        }
      }
      setNinosPendientes(pendientes);
    } catch (error) {
      console.error('Error al cargar niños pendientes:', error);
    } finally {
      setLoading(false);
    }
  }

  /* ── Filtering + sorting ── */
  const evaluacionesFiltradas = evaluaciones
    .filter((ev) => {
      const alias = ev.nino?.alias?.toLowerCase() ?? '';
      if (busqueda && !alias.includes(busqueda.toLowerCase())) return false;
      if (filtroZona !== 'todas' && ev.nino?.zona?.nombre !== filtroZona) return false;
      if (filtroRango !== 'todos' && ev.nino?.rango_etario !== filtroRango) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'fecha_desc': return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        case 'fecha_asc':  return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        case 'nombre_asc': return (a.nino?.alias ?? '').localeCompare(b.nino?.alias ?? '', 'es');
        case 'nombre_desc': return (b.nino?.alias ?? '').localeCompare(a.nino?.alias ?? '', 'es');
        default: return 0;
      }
    });

  const hasActiveFilters = busqueda || filtroZona !== 'todas' || filtroRango !== 'todos' || sortKey !== 'fecha_desc';

  function clearFilters() {
    setBusqueda(''); setFiltroZona('todas'); setFiltroRango('todos'); setSortKey('fecha_desc');
  }

  function getNivel(conclusiones: string | null) {
    if (!conclusiones) return null;
    const match = conclusiones.match(/Nivel de alfabetización:\s*(.+)/);
    return match?.[1]?.trim() || null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-crecimiento-500 p-3 rounded-xl shadow-lg">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Evaluaciones Psicopedagógicas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Seguimiento del progreso cada 6 meses
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/psicopedagogia/evaluaciones/nueva"
            className="flex items-center justify-center gap-2 bg-crecimiento-500 hover:bg-crecimiento-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nueva Evaluación
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('evaluaciones')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                tab === 'evaluaciones'
                  ? 'bg-crecimiento-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                Historial de Evaluaciones
                {tab === 'evaluaciones' && evaluaciones.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {evaluacionesFiltradas.length}
                    {hasActiveFilters && evaluacionesFiltradas.length !== evaluaciones.length && ` / ${evaluaciones.length}`}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setTab('pendientes')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors relative ${
                tab === 'pendientes'
                  ? 'bg-crecimiento-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Evaluaciones Pendientes
                {ninosPendientes.length > 0 && tab !== 'pendientes' && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {ninosPendientes.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* ── Filter bar (evaluaciones tab only) ── */}
        {tab === 'evaluaciones' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre del niño..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-crecimiento-500 focus:border-crecimiento-500 outline-none transition"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-crecimiento-500 outline-none cursor-pointer"
                >
                  <option value="fecha_desc">Más recientes</option>
                  <option value="fecha_asc">Más antiguas</option>
                  <option value="nombre_asc">Nombre A→Z</option>
                  <option value="nombre_desc">Nombre Z→A</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Toggle advanced filters */}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  showFilters || filtroZona !== 'todas' || filtroRango !== 'todos'
                    ? 'bg-crecimiento-50 border-crecimiento-300 text-crecimiento-700 dark:bg-crecimiento-900/20 dark:border-crecimiento-600 dark:text-crecimiento-400'
                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {(filtroZona !== 'todas' || filtroRango !== 'todos') && (
                  <span className="bg-crecimiento-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[filtroZona !== 'todas', filtroRango !== 'todos'].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="relative min-w-[180px]">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={filtroZona}
                    onChange={(e) => setFiltroZona(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-crecimiento-500 outline-none cursor-pointer"
                  >
                    <option value="todas">Todas las zonas</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.nombre}>{z.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative min-w-[200px]">
                  <select
                    value={filtroRango}
                    onChange={(e) => setFiltroRango(e.target.value)}
                    className="w-full px-3 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white appearance-none focus:ring-2 focus:ring-crecimiento-500 outline-none cursor-pointer"
                  >
                    <option value="todos">Todos los rangos de edad</option>
                    {RANGOS_ETARIOS.map((r) => (
                      <option key={r} value={r}>{r} años</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Activos:</span>
                {busqueda && (
                  <span className="flex items-center gap-1 bg-crecimiento-100 text-crecimiento-700 dark:bg-crecimiento-900/30 dark:text-crecimiento-400 text-xs px-2.5 py-1 rounded-full">
                    "{busqueda}" <button onClick={() => setBusqueda('')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroZona !== 'todas' && (
                  <span className="flex items-center gap-1 bg-crecimiento-100 text-crecimiento-700 dark:bg-crecimiento-900/30 dark:text-crecimiento-400 text-xs px-2.5 py-1 rounded-full">
                    📍 {filtroZona} <button onClick={() => setFiltroZona('todas')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filtroRango !== 'todos' && (
                  <span className="flex items-center gap-1 bg-crecimiento-100 text-crecimiento-700 dark:bg-crecimiento-900/30 dark:text-crecimiento-400 text-xs px-2.5 py-1 rounded-full">
                    {filtroRango} años <button onClick={() => setFiltroRango('todos')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearFilters} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Limpiar todo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500" />
          </div>
        ) : tab === 'evaluaciones' ? (
          evaluacionesFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {evaluaciones.length === 0 ? 'No hay evaluaciones registradas' : 'Sin resultados'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {evaluaciones.length === 0
                  ? 'Comenzá realizando la primera evaluación'
                  : 'Ninguna evaluación coincide con los filtros actuales'}
              </p>
              {evaluaciones.length === 0 ? (
                <Link
                  href="/dashboard/psicopedagogia/evaluaciones/nueva"
                  className="inline-flex items-center gap-2 bg-crecimiento-500 hover:bg-crecimiento-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  <Plus className="w-5 h-5" /> Crear Primera Evaluación
                </Link>
              ) : (
                <button onClick={clearFilters} className="text-crecimiento-600 hover:text-crecimiento-700 font-medium">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {evaluacionesFiltradas.map((evaluacion) => {
                const nivel = getNivel(evaluacion.conclusiones);
                return (
                  <Link
                    key={evaluacion.id}
                    href={`/dashboard/psicopedagogia/evaluaciones/${evaluacion.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all p-5 border border-gray-200 dark:border-gray-700 group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-crecimiento-100 dark:bg-crecimiento-900/30 flex items-center justify-center text-lg font-bold text-crecimiento-600 dark:text-crecimiento-400 shrink-0">
                        {evaluacion.nino?.alias?.charAt(0).toUpperCase() ?? '?'}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-crecimiento-600 dark:group-hover:text-crecimiento-400 transition-colors">
                            {evaluacion.nino?.alias ?? '—'}
                          </h3>
                          {nivel && (
                            <span className="bg-crecimiento-100 dark:bg-crecimiento-900/30 text-crecimiento-700 dark:text-crecimiento-400 text-xs px-2 py-0.5 rounded-full font-medium">
                              📚 {nivel}
                            </span>
                          )}
                          {evaluacion.nino?.rango_etario && (
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                              {evaluacion.nino.rango_etario} años
                            </span>
                          )}
                          {evaluacion.nino?.zona?.nombre && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {evaluacion.nino.zona.nombre}
                            </span>
                          )}
                        </div>
                        {evaluacion.acciones_sugeridas && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            💡 {evaluacion.acciones_sugeridas}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 md:text-right shrink-0">
                        <div className="flex items-center gap-1.5 md:justify-end">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(evaluacion.fecha).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </div>
                        {evaluacion.entrevistador && (
                          <div className="flex items-center gap-1.5 md:justify-end">
                            <User className="w-4 h-4 text-gray-400" />
                            {evaluacion.entrevistador.nombre} {evaluacion.entrevistador.apellido}
                          </div>
                        )}
                      </div>

                      <FileText className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-crecimiento-400 transition-colors shrink-0 hidden md:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* ── Pendientes tab ── */
          ninosPendientes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <AlertCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                ¡Todas las evaluaciones al día!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No hay niños que requieran evaluación en este momento
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {ninosPendientes.map((nino) => (
                <Link
                  key={nino.id}
                  href={`/dashboard/psicopedagogia/evaluaciones/nueva?ninoId=${nino.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all p-5 border-l-4 border-red-500"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{nino.alias}</h3>
                        {nino.ultima_evaluacion ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Última evaluación hace <strong>{nino.dias_desde_evaluacion}</strong> días
                            <span className="ml-2 text-xs text-red-500">(Vencida)</span>
                          </p>
                        ) : (
                          <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                            Sin evaluación inicial
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="flex items-center gap-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium">
                      <Plus className="w-4 h-4" /> Evaluar
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
