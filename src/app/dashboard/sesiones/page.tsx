'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Calendar, Clock, Download } from 'lucide-react';
import { calcularPromedioItems, VALOR_NO_COMPLETADO } from '@/lib/constants/items-observacion';

interface Sesion {
  id: string;
  fecha: string;
  duracion_minutos: number;
  observaciones_libres: string;
  items: any[];
  objetivo_sesion?: string | null;
  actividad_realizada?: string | null;
  ninos: {
    id?: string;
    alias: string;
    rango_etario: string;
    legajo?: string;
    ninos_sensibles?: {
      nombre_completo_encrypted?: string;
      apellido_encrypted?: string;
    }[];
  };
}

// Función helper para normalizar texto (quitar acentos)
const normalizarTexto = (texto: string) => {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function HistorialPage() {
  const router = useRouter();
  const { user, perfil } = useAuth();
  const [filtroNino, setFiltroNino] = useState<string>('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');
  const [pagina, setPagina] = useState(1);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPagina(1);
  }, [filtroNino, filtroBusqueda]);

  const esVoluntario = perfil?.rol === 'voluntario';

  // Query de niños para el filtro
  const { data: ninos = [] } = useQuery<Array<{ id: string; alias: string }>>({
    queryKey: ['sesiones-ninos-filtro', user?.id, perfil?.rol],
    queryFn: async () => {
      if (perfil?.rol === 'voluntario') {
        const { data } = await supabase
          .from('asignaciones')
          .select('nino_id, ninos (id, alias)')
          .eq('voluntario_id', user?.id)
          .eq('activa', true);

        return data?.map((item: any) => ({
          id: item.ninos.id,
          alias: item.ninos.alias
        })) || [];
      } else {
        const { data } = await supabase
          .from('ninos')
          .select('id, alias')
          .order('alias', { ascending: true });
        return data || [];
      }
    },
    enabled: !!user && !!perfil,
    staleTime: 1000 * 60 * 5,
  });

  // Query principal de sesiones — SIN la relación problemática de perfiles
  const { data: sesiones = [], isLoading: loading } = useQuery<Sesion[]>({
    queryKey: ['sesiones-historial', user?.id, perfil?.rol],
    queryFn: async () => {
      let query = supabase
        .from('sesiones')
        .select(`
          id,
          fecha,
          duracion_minutos,
          observaciones_libres,
          items,
          objetivo_sesion,
          actividad_realizada,
          voluntario_id,
          ninos (
            id,
            alias,
            rango_etario,
            legajo,
            ninos_sensibles (
              nombre_completo_encrypted,
              apellido_encrypted
            )
          )
        `)
        .order('fecha', { ascending: false });

      // Solo filtrar por voluntario_id si el rol es 'voluntario'
      if (perfil?.rol === 'voluntario') {
        query = query.eq('voluntario_id', user?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error cargando sesiones (la tabla puede no existir aún):', error.message);
        return [];
      }
      return (data || []) as unknown as Sesion[];
    },
    enabled: !!user && !!perfil,
    staleTime: 1000 * 60 * 2,
  });

  // Filtrar sesiones
  const sesionesFiltradas = sesiones.filter(sesion => {
    // Filtro por niño específico
    if (filtroNino !== 'todos') {
      const ninoEncontrado = ninos.find(n => n.alias === sesion.ninos.alias);
      if (ninoEncontrado?.id !== filtroNino) return false;
    }

    // Filtro por búsqueda (nombre, apellido o alias) - sin acentos
    if (filtroBusqueda) {
      const busqueda = normalizarTexto(filtroBusqueda);
      const alias = normalizarTexto(sesion.ninos.alias || '');
      const sensibles = Array.isArray((sesion.ninos as any).ninos_sensibles) 
        ? (sesion.ninos as any).ninos_sensibles[0] 
        : null;
      const nombreCompleto = normalizarTexto(sensibles?.nombre_completo_encrypted || '');
      const apellido = normalizarTexto(sensibles?.apellido_encrypted || '');

      return (
        alias.includes(busqueda) ||
        nombreCompleto.includes(busqueda) ||
        apellido.includes(busqueda)
      );
    }

    return true;
  });

  // Paginación (datos ya vienen ordenados por fecha DESC)
  const PAGE_SIZE = 20;
  const totalPaginas = Math.ceil(sesionesFiltradas.length / PAGE_SIZE);
  const sesionesPagina = sesionesFiltradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularPromedio = (items: any[]) => {
    return calcularPromedioItems(items);
  };

  // Descargar sesiones filtradas como CSV
  const descargarCSV = () => {
    if (sesionesFiltradas.length === 0) return;

    const headers = ['Fecha', 'Niño', 'Duración (min)', 'Promedio', 'Objetivo', 'Actividad realizada', 'Observaciones', 'Ítems completados', 'Ítems N/C'];
    const rows = sesionesFiltradas.map(sesion => {
      const items = sesion.items || [];
      const completados = items.filter((i: any) => i.valor && i.valor !== VALOR_NO_COMPLETADO).length;
      const noCompletados = items.filter((i: any) => i.valor === VALOR_NO_COMPLETADO).length;
      return [
        formatFecha(sesion.fecha),
        sesion.ninos.alias,
        sesion.duracion_minutos,
        calcularPromedio(items),
        `"${(sesion.objetivo_sesion || '').replace(/"/g, '""')}"`,
        `"${(sesion.actividad_realizada || '').replace(/"/g, '""')}"`,
        `"${(sesion.observaciones_libres || '').replace(/"/g, '""')}"`,
        completados,
        noCompletados
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sesiones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-sol-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando historial...</p>
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
              <Link href="/dashboard" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Historial
              </h1>
              <button
                onClick={descargarCSV}
                disabled={sesionesFiltradas.length === 0}
                className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-gradient-to-r from-sol-400 to-sol-500 text-white rounded-2xl hover:shadow-glow-sol transition-all font-outfit font-medium text-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Descargar sesiones como CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filtros flotantes */}
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] p-6 mb-6 space-y-5">
          {/* Búsqueda por nombre/apellido */}
          <div>
            <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">
              Buscar por nombre o apellido
            </label>
            <input
              type="text"
              placeholder="Ej: Lucas, González, etc."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] placeholder:text-neutro-piedra/60 transition-all"
            />
          </div>

          {/* Filtro por niño */}
          <div>
            <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-2">
              Filtrar por niño
            </label>
            <select
              value={filtroNino}
              onChange={(e) => setFiltroNino(e.target.value)}
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[56px] transition-all"
            >
              <option value="todos">Todos los niños ({sesiones.length})</option>
              {ninos.map(nino => (
                <option key={nino.id} value={nino.id}>
                  {nino.alias} ({sesiones.filter(s => s.ninos.alias === nino.alias).length})
                </option>
              ))}
            </select>
          </div>

          {/* Contador de resultados */}
          {sesiones.length > 0 && (
            <div className="px-4 py-2 bg-sol-50/50 backdrop-blur-sm border border-sol-200/30 rounded-2xl inline-flex items-center">
              <span className="text-sm text-neutro-piedra font-outfit">
                {sesionesFiltradas.length < sesiones.length
                  ? <><span className="font-semibold text-neutro-carbon">{sesionesFiltradas.length}</span> de <span className="font-semibold text-neutro-carbon">{sesiones.length}</span> sesiones</>
                  : <><span className="font-semibold text-neutro-carbon">{sesiones.length}</span> sesiones</>
                }
                {totalPaginas > 1 && <span className="ml-2 text-neutro-piedra/70">· pág. {pagina}/{totalPaginas}</span>}
              </span>
            </div>
          )}
        </div>

        {/* Lista de sesiones */}
        {sesionesFiltradas.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-sol-400/20 to-crecimiento-400/20 flex items-center justify-center">
                <FileText className="w-12 h-12 text-sol-600" />
              </div>
              <p className="text-neutro-carbon font-outfit text-lg mb-6">No hay sesiones registradas todavía.</p>
              {esVoluntario ? (
                ninos.length > 0 ? (
                  <Link
                    href="/dashboard/ninos"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] bg-gradient-to-r from-sol-400 to-sol-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(242,201,76,0.25)] transition-all font-outfit font-semibold shadow-[0_4px_16px_rgba(242,201,76,0.15)] active:scale-95"
                  >
                    Ver mis niños asignados
                  </Link>
                ) : (
                  <p className="text-sm text-neutro-piedra font-outfit">
                    Tu coordinador/a te asignará niños próximamente. Cuando tengas niños asignados, podrás registrar sesiones desde acá.
                  </p>
                )
              ) : (
                <Link
                  href="/dashboard/ninos"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] bg-gradient-to-r from-sol-400 to-sol-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(242,201,76,0.25)] transition-all font-outfit font-semibold shadow-[0_4px_16px_rgba(242,201,76,0.15)] active:scale-95"
                >
                  Registrar primera sesión
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
          <div className="space-y-5">
            {sesionesPagina.map((sesion) => (
              <div key={sesion.id} className="group bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 transition-all duration-300 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] hover:-translate-y-0.5 active:scale-[0.99]">
                <Link href={`/dashboard/sesiones/${sesion.id}`} className="block p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-1">{sesion.ninos.alias}</h3>
                      <p className="text-sm text-neutro-piedra font-outfit">{sesion.ninos.rango_etario} años</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1">
                      <p className="text-sm font-medium text-neutro-carbon font-outfit">{formatFecha(sesion.fecha)}</p>
                      <span className="px-3 py-1 bg-sol-50 text-sol-700 text-xs font-semibold font-outfit rounded-2xl border border-sol-200/30">
                        {sesion.duracion_minutos} min
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-neutro-piedra mb-2 font-outfit">Promedio general</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-neutro-lienzo rounded-full h-3 overflow-hidden border border-sol-200/30">
                        <div 
                          className="bg-gradient-to-r from-sol-400 to-crecimiento-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(242,201,76,0.4)]"
                          style={{ width: `${(calcularPromedio(sesion.items) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-base font-bold text-neutro-carbon font-quicksand min-w-[3rem] text-right">
                        {calcularPromedio(sesion.items)}/5
                      </span>
                    </div>
                  </div>

                  {/* Objetivo y Actividad */}
                  {(sesion.objetivo_sesion || sesion.actividad_realizada) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {sesion.objetivo_sesion && (
                        <div className="px-3 py-2 bg-impulso-50/50 border border-impulso-200/40 rounded-2xl">
                          <p className="text-xs text-impulso-600 font-outfit font-semibold mb-0.5">🎯 Objetivo</p>
                          <p className="text-sm text-neutro-carbon font-outfit line-clamp-2">{sesion.objetivo_sesion}</p>
                        </div>
                      )}
                      {sesion.actividad_realizada && (
                        <div className="px-3 py-2 bg-crecimiento-50/50 border border-crecimiento-200/40 rounded-2xl">
                          <p className="text-xs text-crecimiento-600 font-outfit font-semibold mb-0.5">✏️ Actividad</p>
                          <p className="text-sm text-neutro-carbon font-outfit line-clamp-2">{sesion.actividad_realizada}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {sesion.observaciones_libres && (
                    <div className="mt-4 pt-4 border-t border-white/60">
                      <p className="text-xs text-neutro-piedra mb-2 font-outfit font-medium">Observaciones:</p>
                      <p className="text-sm text-neutro-carbon font-outfit line-clamp-2">
                        {sesion.observaciones_libres}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 text-right">
                    <span className="text-sm text-sol-600 font-medium font-outfit group-hover:text-crecimiento-600 transition-colors">
                      Ver detalle →
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={pagina === 1}
                className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 text-neutro-carbon font-outfit font-medium text-sm hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              >
                ← Anterior
              </button>
              <span className="text-sm text-neutro-carbon font-outfit">
                <span className="font-bold">{pagina}</span> / <span className="font-bold">{totalPaginas}</span>
              </span>
              <button
                onClick={() => { setPagina(p => Math.min(totalPaginas, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={pagina === totalPaginas}
                className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 text-neutro-carbon font-outfit font-medium text-sm hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              >
                Siguiente →
              </button>
            </div>
          )}
          </>
        )}
      </main>
    </div>
  );
}
