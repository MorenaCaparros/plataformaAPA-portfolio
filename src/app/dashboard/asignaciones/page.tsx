'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  MapPin,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Star,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  X,
  ChevronRight
} from 'lucide-react';

interface Zona {
  id: string;
  nombre: string;
}

interface NinoConAsignacion {
  id: string;
  alias: string;
  rango_etario: string;
  zona_id: string | null;
  zona_nombre: string | null;
  asignacion: {
    id: string;
    voluntario_id: string;
    voluntario_nombre: string;
    fecha_asignacion: string;
    score_matching: number;
  } | null;
  tiene_deficits: boolean;
}

interface VoluntarioConCarga {
  id: string;
  nombre: string;
  zona_id: string | null;
  zona_nombre: string | null;
  asignaciones_activas: number;
  disponibilidad: 'alta' | 'media' | 'baja';
  tiene_autoevaluacion: boolean;
  ninos_asignados: {
    id: string;
    alias: string;
    score: number;
  }[];
}

interface EstadisticasGlobales {
  total_ninos: number;
  ninos_asignados: number;
  ninos_sin_asignar: number;
  total_voluntarios: number;
  voluntarios_disponibles: number;
  voluntarios_sobrecargados: number;
}

interface SugerenciaMatching {
  voluntario_id: string;
  voluntario_nombre: string;
  score: number;
  habilidades: {
    lenguaje: number;
    grafismo: number;
    lectura_escritura: number;
    matematicas: number;
  };
  asignaciones_actuales: number;
  disponibilidad: 'alta' | 'media' | 'baja';
  detalles_score: {
    score_habilidades: number;
    score_disponibilidad: number;
    score_zona: number;
  };
}

function AsignacionesPageContent() {
  const { user, perfil, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const zonaParam = searchParams.get('zona');
  
  const queryClient = useQueryClient();

  // Filtros
  const [filtroZona, setFiltroZona] = useState<string>(zonaParam || 'todas');
  const [filtroEstadoNino, setFiltroEstadoNino] = useState<'todos' | 'asignado' | 'sin_asignar'>('todos');
  const [filtroDisponibilidadVol, setFiltroDisponibilidadVol] = useState<'todos' | 'alta' | 'media' | 'baja'>('todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Vista activa
  const [vistaActiva, setVistaActiva] = useState<'ninos' | 'voluntarios'>('ninos');

  // Modal sugerencias de matching
  const [modalSugerencias, setModalSugerencias] = useState<{ ninoId: string; ninoAlias: string } | null>(null);
  const [sugerenciasModal, setSugerenciasModal] = useState<SugerenciaMatching[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [errorSugerencias, setErrorSugerencias] = useState<string | null>(null);

  // Verificar permisos
  const rolesPermitidos = ['director', 'coordinador', 'psicopedagogia', 'equipo_profesional'];
  const tieneAcceso = perfil?.rol && rolesPermitidos.includes(perfil.rol);

  // ─── Zonas ────────────────────────────────────────────────────────────────
  const { data: zonas = [] } = useQuery<Zona[]>({
    queryKey: ['zonas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zonas')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !authLoading && !!tieneAcceso,
    staleTime: 1000 * 60 * 10,
  });

  // ─── Niños con asignaciones ───────────────────────────────────────────────
  const { data: ninos = [], isLoading: loadingNinos, refetch: refetchNinos } = useQuery<NinoConAsignacion[]>({
    queryKey: ['asignaciones-ninos'],
    queryFn: async () => {
      const { data: ninosData, error: ninosError } = await supabase
        .from('ninos')
        .select(`
          id,
          alias,
          rango_etario,
          zona_id,
          zona:zonas(nombre)
        `)
        .order('alias', { ascending: true });
      if (ninosError) throw ninosError;

      const { data: asignacionesData, error: asigError } = await supabase
        .from('asignaciones')
        .select(`
          id,
          nino_id,
          voluntario_id,
          fecha_asignacion,
          score_matching,
          voluntario:perfiles!asignaciones_voluntario_id_fkey(id, nombre, apellido)
        `)
        .eq('activa', true);
      if (asigError) throw asigError;

      const asignaciones = (asignacionesData || []).map((a: any) => ({
        ...a,
        voluntario_nombre: a.voluntario
          ? [a.voluntario.nombre, a.voluntario.apellido].filter(Boolean).join(' ')
          : 'Voluntario',
      }));

      let ninosConEvaluacion = new Set<string>();
      try {
        const { data: evalData } = await supabase
          .from('entrevistas')
          .select('nino_id')
          .eq('tipo', 'inicial');
        ninosConEvaluacion = new Set((evalData || []).map((d: any) => d.nino_id));
      } catch { /* ignorar */ }

      return (ninosData || []).map((nino: any) => {
        const asignacion = asignaciones?.find((a: any) => a.nino_id === nino.id);
        return {
          id: nino.id,
          alias: nino.alias,
          rango_etario: nino.rango_etario,
          zona_id: nino.zona_id,
          zona_nombre: nino.zona?.nombre || null,
          tiene_deficits: ninosConEvaluacion.has(nino.id),
          asignacion: asignacion ? {
            id: asignacion.id,
            voluntario_id: asignacion.voluntario_id,
            voluntario_nombre: asignacion.voluntario_nombre,
            fecha_asignacion: asignacion.fecha_asignacion,
            score_matching: asignacion.score_matching,
          } : null,
        };
      });
    },
    enabled: !!user && !authLoading && !!tieneAcceso,
    staleTime: 1000 * 60 * 2,
  });

  // ─── Voluntarios con carga ────────────────────────────────────────────────
  const { data: voluntarios = [], isLoading: loadingVol, refetch: refetchVol } = useQuery<VoluntarioConCarga[]>({
    queryKey: ['asignaciones-voluntarios'],
    queryFn: async () => {
      const { data: voluntariosData, error: volError } = await supabase
        .from('perfiles')
        .select(`
          id,
          nombre,
          apellido,
          zona_id,
          zona:zonas(nombre)
        `)
        .eq('rol', 'voluntario');
      if (volError) throw volError;

      const { data: asignacionesData } = await supabase
        .from('asignaciones')
        .select(`
          id,
          nino_id,
          voluntario_id,
          score_matching,
          nino:ninos(id, alias)
        `)
        .eq('activa', true);

      const asignaciones = asignacionesData || [];

      const { data: autoevaluaciones } = await supabase
        .from('voluntarios_capacitaciones')
        .select('voluntario_id')
        .in('estado', ['aprobada', 'reprobada', 'completada']);

      const voluntariosConAutoeval = new Set(
        autoevaluaciones?.map((a: { voluntario_id: string }) => a.voluntario_id) || []
      );

      return (voluntariosData || []).map((vol: any) => {
        const asignacionesVol = asignaciones.filter((a: any) => a.voluntario_id === vol.id);
        const numAsignaciones = asignacionesVol.length;
        let disponibilidad: 'alta' | 'media' | 'baja' = 'alta';
        if (numAsignaciones >= 3) disponibilidad = 'baja';
        else if (numAsignaciones >= 2) disponibilidad = 'media';
        return {
          id: vol.id,
          nombre: [vol.nombre, vol.apellido].filter(Boolean).join(' ') || 'Sin nombre',
          zona_id: vol.zona_id,
          zona_nombre: vol.zona?.nombre || null,
          asignaciones_activas: numAsignaciones,
          disponibilidad,
          tiene_autoevaluacion: voluntariosConAutoeval.has(vol.id),
          ninos_asignados: asignacionesVol.map((a: any) => ({
            id: a.nino?.id,
            alias: a.nino?.alias || 'Sin alias',
            score: a.score_matching || 0,
          })),
        };
      });
    },
    enabled: !!user && !authLoading && !!tieneAcceso,
    staleTime: 1000 * 60 * 2,
  });

  const loading = loadingNinos || loadingVol;

  // ─── Estadísticas derivadas (useMemo) ─────────────────────────────────────
  const estadisticas = useMemo<EstadisticasGlobales | null>(() => {
    if (!ninos.length && !voluntarios.length) return null;
    const ninosAsignados = ninos.filter(n => n.asignacion !== null).length;
    return {
      total_ninos: ninos.length,
      ninos_asignados: ninosAsignados,
      ninos_sin_asignar: ninos.length - ninosAsignados,
      total_voluntarios: voluntarios.length,
      voluntarios_disponibles: voluntarios.filter(v => v.disponibilidad === 'alta').length,
      voluntarios_sobrecargados: voluntarios.filter(v => v.disponibilidad === 'baja').length,
    };
  }, [ninos, voluntarios]);

  const refetchData = () => {
    refetchNinos();
    refetchVol();
    queryClient.invalidateQueries({ queryKey: ['zonas'] });
  };

  // Redirigir si no tiene acceso
  if (!authLoading && user && !tieneAcceso) {
    router.push('/dashboard');
    return null;
  }

  // Filtrar niños
  const ninosFiltrados = ninos.filter(nino => {
    // Filtro por zona
    if (filtroZona !== 'todas' && nino.zona_id !== filtroZona) return false;
    
    // Filtro por estado de asignación
    if (filtroEstadoNino === 'asignado' && !nino.asignacion) return false;
    if (filtroEstadoNino === 'sin_asignar' && nino.asignacion) return false;
    
    // Filtro por búsqueda
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return nino.alias.toLowerCase().includes(search);
    }
    
    return true;
  });

  // Filtrar voluntarios
  const voluntariosFiltrados = voluntarios.filter(vol => {
    // Filtro por zona
    if (filtroZona !== 'todas' && vol.zona_id !== filtroZona) return false;
    
    // Filtro por disponibilidad
    if (filtroDisponibilidadVol !== 'todos' && vol.disponibilidad !== filtroDisponibilidadVol) return false;
    
    // Filtro por búsqueda
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return vol.nombre.toLowerCase().includes(search);
    }
    
    return true;
  });

  const getDisponibilidadColor = (disp: string) => {
    switch (disp) {
      case 'alta': return 'bg-green-100 text-green-700';
      case 'media': return 'bg-yellow-100 text-yellow-700';
      case 'baja': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const obtenerSugerencias = async (ninoId: string, ninoAlias: string) => {
    setModalSugerencias({ ninoId, ninoAlias });
    setSugerenciasModal([]);
    setErrorSugerencias(null);
    setCargandoSugerencias(true);
    try {
      const res = await fetch(`/api/matching/sugerencias?ninoId=${ninoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener sugerencias');
      setSugerenciasModal(data.sugerencias || []);
    } catch (err: any) {
      setErrorSugerencias(err.message);
    } finally {
      setCargandoSugerencias(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Asignaciones de Voluntarios
                </h1>
                <p className="text-sm text-gray-500">
                  Gestión global de asignaciones voluntario-niño
                </p>
              </div>
            </div>
            <button
              onClick={refetchData}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Estadísticas Globales */}
        {estadisticas && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-crecimiento-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-crecimiento-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{estadisticas.total_ninos}</p>
                  <p className="text-xs text-gray-500">Total Niños</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{estadisticas.ninos_asignados}</p>
                  <p className="text-xs text-gray-500">Asignados</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{estadisticas.ninos_sin_asignar}</p>
                  <p className="text-xs text-gray-500">Sin Asignar</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{estadisticas.total_voluntarios}</p>
                  <p className="text-xs text-gray-500">Voluntarios</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{estadisticas.voluntarios_disponibles}</p>
                  <p className="text-xs text-gray-500">Disponibles</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{estadisticas.voluntarios_sobrecargados}</p>
                  <p className="text-xs text-gray-500">Sobrecargados</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y Controles */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tabs Vista */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVistaActiva('ninos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  vistaActiva === 'ninos'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                Niños
              </button>
              <button
                onClick={() => setVistaActiva('voluntarios')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  vistaActiva === 'voluntarios'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-4 h-4 inline-block mr-2" />
                Voluntarios
              </button>
            </div>

            {/* Buscador */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${vistaActiva === 'ninos' ? 'niño' : 'voluntario'}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Filtro Zona */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <select
                value={filtroZona}
                onChange={(e) => setFiltroZona(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="todas">Todas las zonas</option>
                {zonas.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtros específicos según vista */}
            {vistaActiva === 'ninos' ? (
              <select
                value={filtroEstadoNino}
                onChange={(e) => setFiltroEstadoNino(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="asignado">Con voluntario</option>
                <option value="sin_asignar">Sin voluntario</option>
              </select>
            ) : (
              <select
                value={filtroDisponibilidadVol}
                onChange={(e) => setFiltroDisponibilidadVol(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="todos">Toda disponibilidad</option>
                <option value="alta">Alta disponibilidad</option>
                <option value="media">Media disponibilidad</option>
                <option value="baja">Baja disponibilidad</option>
              </select>
            )}
          </div>
        </div>

        {/* Vista de Niños */}
        {vistaActiva === 'ninos' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Niños ({ninosFiltrados.length})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {ninosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron niños con los filtros seleccionados</p>
                </div>
              ) : (
                ninosFiltrados.map((nino) => (
                  <div
                    key={nino.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar / Estado */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          nino.asignacion
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {nino.asignacion ? (
                            <UserCheck className="w-6 h-6" />
                          ) : (
                            <UserX className="w-6 h-6" />
                          )}
                        </div>
                        
                        {/* Info del niño */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/dashboard/ninos/${nino.id}`}
                              className="font-medium text-gray-900 hover:text-orange-600"
                            >
                              {nino.alias}
                            </Link>
                            {nino.tiene_deficits ? (
                              <Link
                                href={`/dashboard/psicopedagogia/evaluaciones?ninoId=${nino.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 text-xs bg-crecimiento-100 text-crecimiento-700 dark:bg-crecimiento-900/20 dark:text-crecimiento-400 rounded-full hover:underline"
                                title="Ver evaluación psicopedagógica"
                              >
                                ✅ Con evaluación
                              </Link>
                            ) : (
                              <Link
                                href={`/dashboard/psicopedagogia/evaluaciones/nueva?ninoId=${nino.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full hover:underline"
                                title="Crear evaluación psicopedagógica inicial"
                              >
                                ⚠️ Sin evaluación
                              </Link>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{nino.rango_etario}</span>
                            {nino.zona_nombre && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {nino.zona_nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Asignación o acción */}
                      <div className="flex items-center gap-4">
                        {nino.asignacion ? (
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">
                                {nino.asignacion.voluntario_nombre}
                              </span>
                              <span className={`font-semibold ${getScoreColor(nino.asignacion.score_matching)}`}>
                                {nino.asignacion.score_matching?.toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Desde {new Date(nino.asignacion.fecha_asignacion).toLocaleDateString('es-AR')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin voluntario asignado</span>
                        )}
                        
                        <button
                          onClick={() => obtenerSugerencias(nino.id, nino.alias)}
                          className="p-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                          title="Sugerencias de matching con IA"
                        >
                          <Lightbulb className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/dashboard/ninos/${nino.id}/asignar-voluntario`}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            nino.asignacion
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {nino.asignacion ? 'Cambiar' : 'Asignar'}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vista de Voluntarios */}
        {vistaActiva === 'voluntarios' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Voluntarios ({voluntariosFiltrados.length})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {voluntariosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron voluntarios con los filtros seleccionados</p>
                </div>
              ) : (
                voluntariosFiltrados.map((vol) => (
                  <div
                    key={vol.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-600 font-semibold text-lg">
                            {vol.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Info del voluntario */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{vol.nombre}</span>
                            {vol.tiene_autoevaluacion ? (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Evaluado
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1 cursor-help"
                                title="Este voluntario no ha completado su autoevaluación. No puede ser asignado a niños hasta completarla."
                              >
                                <AlertCircle className="w-3 h-3" />
                                Sin autoevaluación
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {vol.zona_nombre && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {vol.zona_nombre}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDisponibilidadColor(vol.disponibilidad)}`}>
                              {vol.disponibilidad === 'alta' ? 'Alta disponibilidad' :
                               vol.disponibilidad === 'media' ? 'Media disponibilidad' : 'Baja disponibilidad'}
                            </span>
                          </div>
                          {!vol.tiene_autoevaluacion && (
                            <p className="text-xs text-yellow-600 mt-1">
                              ⚠️ Requiere completar autoevaluación antes de ser asignado
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Niños asignados */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {vol.asignaciones_activas} niño{vol.asignaciones_activas !== 1 ? 's' : ''}
                        </p>
                        {vol.ninos_asignados.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end mt-1">
                            {vol.ninos_asignados.slice(0, 3).map((nino) => (
                              <Link
                                key={nino.id}
                                href={`/dashboard/ninos/${nino.id}`}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                              >
                                {nino.alias}
                              </Link>
                            ))}
                            {vol.ninos_asignados.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{vol.ninos_asignados.length - 3} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      {/* ── Modal Sugerencias de Matching ───────────────────────────────── */}
      {modalSugerencias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-base">Sugerencias de voluntario</h2>
                  <p className="text-xs text-gray-500">{modalSugerencias.ninoAlias}</p>
                </div>
              </div>
              <button
                onClick={() => setModalSugerencias(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cargandoSugerencias && (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                  <span className="ml-3 text-sm text-gray-500">Analizando compatibilidad...</span>
                </div>
              )}

              {errorSugerencias && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorSugerencias}</span>
                </div>
              )}

              {!cargandoSugerencias && !errorSugerencias && sugerenciasModal.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No se encontraron sugerencias.</p>
                  <p className="text-xs mt-1">Puede que no haya voluntarios con autoevaluaciones completadas.</p>
                </div>
              )}

              {!cargandoSugerencias && sugerenciasModal.map((sug, idx) => (
                <div key={sug.voluntario_id} className="border border-gray-100 rounded-xl p-4 hover:border-amber-200 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">{sug.voluntario_nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${getScoreColor(sug.score)}`}>
                        {Math.round(sug.score)}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getDisponibilidadColor(sug.disponibilidad)}`}>
                        {sug.disponibilidad === 'alta' ? 'Disponible' : sug.disponibilidad === 'media' ? 'Parcial' : 'Saturado'}
                      </span>
                    </div>
                  </div>

                  {/* Habilidades */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {Object.entries({
                      'Lenguaje': sug.habilidades.lenguaje,
                      'Grafismo': sug.habilidades.grafismo,
                      'Lectura/Escritura': sug.habilidades.lectura_escritura,
                      'Matemáticas': sug.habilidades.matematicas,
                    }).map(([label, val]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-crecimiento-400"
                            style={{ width: `${Math.min(100, (val / 5) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-20 truncate">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {sug.asignaciones_actuales} niño{sug.asignaciones_actuales !== 1 ? 's' : ''} asignado{sug.asignaciones_actuales !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`/dashboard/ninos/${modalSugerencias.ninoId}/asignar-voluntario?sugerido=${sug.voluntario_id}`}
                      onClick={() => setModalSugerencias(null)}
                      className="flex items-center gap-1 text-xs font-medium text-crecimiento-600 hover:text-crecimiento-700"
                    >
                      Asignar <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <p className="text-[11px] text-gray-400 text-center">
                Sugerencias basadas en autoevaluaciones, disponibilidad y zona. No reemplazan el criterio del equipo.
              </p>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

export default function AsignacionesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    }>
      <AsignacionesPageContent />
    </Suspense>
  );
}
