'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Target,
  Plus,
  Calendar,
  User,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Plan {
  id: string;
  nino_id: string;
  titulo: string;
  descripcion: string | null;
  area: string;
  estado: 'activo' | 'pausado' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  fecha_inicio: string;
  fecha_fin_estimada: string | null;
  fecha_cierre: string | null;
  objetivos: string[];
  created_at: string;
  nino: { id: string; alias: string; rango_etario: string; fecha_nacimiento: string } | null;
  creador: { id: string; nombre: string; apellido: string; rol: string } | null;
  comentarios: { count: number }[];
}

const AREA_LABELS: Record<string, string> = {
  lenguaje_vocabulario: 'Lenguaje y Vocabulario',
  grafismo_motricidad: 'Grafismo y Motricidad',
  lectura_escritura: 'Lectura y Escritura',
  nociones_matematicas: 'Nociones Matemáticas',
  socioemocional: 'Socioemocional',
  general: 'General',
};

const AREA_COLORS: Record<string, string> = {
  lenguaje_vocabulario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  grafismo_motricidad: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  lectura_escritura: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  nociones_matematicas: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  socioemocional: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const ESTADO_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  activo: { label: 'Activo', icon: CheckCircle2, color: 'text-crecimiento-600 bg-crecimiento-50' },
  pausado: { label: 'Pausado', icon: PauseCircle, color: 'text-sol-600 bg-sol-50' },
  completado: { label: 'Completado', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  media: { label: 'Media', color: 'bg-sol-50 text-sol-700' },
  alta: { label: 'Alta', color: 'bg-red-50 text-red-700' },
};

export default function PlanesPage() {
  const { user, perfil } = useAuth();
  const router = useRouter();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');

  const canCreate = perfil && ['psicopedagogia', 'director', 'admin', 'equipo_profesional'].includes(perfil.rol);

  useEffect(() => {
    fetchPlanes();
  }, []);

  async function fetchPlanes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planes_intervencion')
        .select(`
          *,
          nino:ninos!planes_intervencion_nino_id_fkey(id, alias, rango_etario, fecha_nacimiento),
          creador:perfiles!planes_intervencion_creado_por_fkey(id, nombre, apellido, rol),
          comentarios:comentarios_intervencion(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlanes((data as any) || []);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = planes.filter((p) => {
    const matchSearch =
      search === '' ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.nino?.alias?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const matchArea = filtroArea === 'todas' || p.area === filtroArea;
    return matchSearch && matchEstado && matchArea;
  });

  const stats = {
    activos: planes.filter((p) => p.estado === 'activo').length,
    pausados: planes.filter((p) => p.estado === 'pausado').length,
    completados: planes.filter((p) => p.estado === 'completado').length,
    total: planes.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/psicopedagogia"
              className="p-2 rounded-xl hover:bg-white/60 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="bg-impulso-400 p-3 rounded-xl shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-quicksand text-3xl font-bold text-gray-900 dark:text-white">
                Planes de Intervención
              </h1>
              <p className="font-outfit text-gray-600 dark:text-gray-400 mt-1">
                Gestión de objetivos y seguimiento por niño
              </p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/dashboard/psicopedagogia/planes/nuevo"
              className="inline-flex items-center gap-2 bg-impulso-400 hover:bg-impulso-500 text-white px-5 py-3 rounded-xl font-semibold transition-colors min-h-[44px] shadow-lg shadow-impulso-500/20"
            >
              <Plus className="w-5 h-5" />
              Nuevo Plan
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-4 text-center">
            <p className="font-quicksand text-2xl font-bold text-neutro-carbon">{stats.total}</p>
            <p className="font-outfit text-sm text-neutro-piedra">Total</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-4 text-center">
            <p className="font-quicksand text-2xl font-bold text-crecimiento-600">{stats.activos}</p>
            <p className="font-outfit text-sm text-neutro-piedra">Activos</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-4 text-center">
            <p className="font-quicksand text-2xl font-bold text-sol-600">{stats.pausados}</p>
            <p className="font-outfit text-sm text-neutro-piedra">Pausados</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-4 text-center">
            <p className="font-quicksand text-2xl font-bold text-blue-600">{stats.completados}</p>
            <p className="font-outfit text-sm text-neutro-piedra">Completados</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o niño..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-outfit focus:ring-2 focus:ring-impulso-400 focus:border-transparent min-h-[44px]"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-outfit focus:ring-2 focus:ring-impulso-400 min-h-[44px]"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="pausado">Pausados</option>
            <option value="completado">Completados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <select
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-outfit focus:ring-2 focus:ring-impulso-400 min-h-[44px]"
          >
            <option value="todas">Todas las áreas</option>
            {Object.entries(AREA_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Plans list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-impulso-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-quicksand text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {planes.length === 0 ? 'Sin planes aún' : 'Sin resultados'}
            </h3>
            <p className="font-outfit text-gray-500 mb-6">
              {planes.length === 0
                ? 'Creá el primer plan de intervención para comenzar el seguimiento.'
                : 'Probá ajustando los filtros de búsqueda.'}
            </p>
            {planes.length === 0 && canCreate && (
              <Link
                href="/dashboard/psicopedagogia/planes/nuevo"
                className="inline-flex items-center gap-2 bg-impulso-400 hover:bg-impulso-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Plan
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((plan) => {
              const estadoConf = ESTADO_CONFIG[plan.estado];
              const EstadoIcon = estadoConf.icon;
              const commentCount = plan.comentarios?.[0]?.count || 0;

              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/psicopedagogia/planes/${plan.id}`}
                  className="group bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-quicksand text-lg font-semibold text-neutro-carbon truncate group-hover:text-impulso-500 transition-colors">
                        {plan.titulo}
                      </h3>
                      <p className="font-outfit text-sm text-neutro-piedra flex items-center gap-1 mt-1">
                        <User className="w-3.5 h-3.5" />
                        {plan.nino?.alias || 'Sin niño'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${estadoConf.color}`}>
                      <EstadoIcon className="w-3.5 h-3.5" />
                      {estadoConf.label}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${AREA_COLORS[plan.area]}`}>
                      {AREA_LABELS[plan.area]}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORIDAD_CONFIG[plan.prioridad].color}`}>
                      {PRIORIDAD_CONFIG[plan.prioridad].label}
                    </span>
                  </div>

                  {/* Description preview */}
                  {plan.descripcion && (
                    <p className="font-outfit text-sm text-gray-500 mb-4 line-clamp-2">
                      {plan.descripcion}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-neutro-piedra font-outfit border-t border-gray-100 dark:border-gray-700 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(plan.fecha_inicio).toLocaleDateString('es-AR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
