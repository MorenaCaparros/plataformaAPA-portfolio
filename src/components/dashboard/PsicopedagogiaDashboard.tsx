'use client';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FileText,
  Target,
  BookOpen,
  Users,
  TrendingUp,
  ClipboardList,
  Brain,
  Sparkles,
  BarChart3,
  Baby,
} from 'lucide-react';
import DashboardHeader from './ui/DashboardHeader';
import DashboardMetricCard, { DashboardMetricCardSkeleton } from './ui/DashboardMetricCard';
import DashboardNavCard from './ui/DashboardNavCard';

export default function PsicopedagogiaDashboard() {
  const { user } = useAuth();

  const { data: metricas, isLoading } = useQuery({
    queryKey: ['psico-metricas'],
    queryFn: async () => {
      const { count: totalNinos } = await supabase
        .from('ninos')
        .select('*', { count: 'exact', head: true });

      const { data: ninosConEval } = await supabase
        .from('ninos')
        .select('id, entrevistas(fecha)');

      let evaluacionesPendientes = 0;
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

      (ninosConEval || []).forEach((nino: any) => {
        const evals = nino.entrevistas || [];
        if (evals.length === 0) {
          evaluacionesPendientes++;
        } else {
          const fechas = evals.map((e: any) => new Date(e.fecha).getTime());
          const ultimaFecha = new Date(Math.max(...fechas));
          if (ultimaFecha < seisMesesAtras) evaluacionesPendientes++;
        }
      });

      const { count: planesActivos } = await supabase
        .from('planes_intervencion')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: sesionesEsteMes } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', inicioMes.toISOString());

      return {
        totalNinos: totalNinos || 0,
        evaluacionesPendientes: evaluacionesPendientes || 0,
        planesActivos: planesActivos || 0,
        sesionesEsteMes: sesionesEsteMes || 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const m = metricas ?? { totalNinos: 0, evaluacionesPendientes: 0, planesActivos: 0, sesionesEsteMes: 0 };

  return (
    <div>
      <DashboardHeader
        title="Panel de Profesionales"
        subtitle="Gestión integral de evaluaciones, planes de intervención y seguimiento educativo"
        action={
          <Link
            href="/dashboard/ninos/nuevo"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Baby className="w-5 h-5" strokeWidth={2.5} />
            Registrar Niño
          </Link>
        }
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <DashboardMetricCardSkeleton key={i} />)
        ) : (
          <>
            <DashboardMetricCard icon={Users} value={m.totalNinos} label="Total Niños" colorClass="impulso" />
            <DashboardMetricCard
              icon={ClipboardList}
              value={m.evaluacionesPendientes}
              label="Evaluaciones Pendientes"
              sublabel="Últimos 6 meses"
              colorClass="sol"
            />
            <DashboardMetricCard icon={Target} value={m.planesActivos} label="Planes Activos" colorClass="crecimiento" />
            <DashboardMetricCard icon={TrendingUp} value={m.sesionesEsteMes} label="Sesiones Este Mes" colorClass="crecimiento" />
          </>
        )}
      </div>

      {/* Grilla de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardNavCard
          href="/dashboard/psicopedagogia/evaluaciones"
          icon={ClipboardList}
          title="Evaluaciones"
          description="Crear y gestionar evaluaciones diagnósticas cada 6 meses"
          colorClass="sol"
          badge={m.evaluacionesPendientes > 0 ? String(m.evaluacionesPendientes) : undefined}
        />
        <DashboardNavCard
          href="/dashboard/psicopedagogia/planes"
          icon={Target}
          title="Planes de Intervención"
          description="Diseñar actividades semanales para voluntarios con cada niño"
          colorClass="crecimiento"
          badge="IA"
          badgeVariant="gradient"
        />
        <DashboardNavCard
          href="/dashboard/biblioteca"
          icon={BookOpen}
          title="Biblioteca con IA"
          description="Subir documentos y consultar con sistema RAG inteligente"
          colorClass="purple"
          badge="RAG"
        />
        <DashboardNavCard
          href="/dashboard/asignaciones"
          icon={Users}
          title="Asignaciones"
          description="Asignar voluntarios a niños según necesidades y disponibilidad"
          colorClass="crecimiento"
        />
        <DashboardNavCard
          href="/dashboard/ia"
          icon={Brain}
          title="Análisis con IA"
          description="Patrones, tendencias y recomendaciones inteligentes"
          colorClass="purple"
          badge="IA"
          badgeVariant="gradient"
        />
        <DashboardNavCard
          href="/dashboard/ninos"
          icon={FileText}
          title="Perfiles de Niños"
          description="Ver y editar información completa de cada niño"
          colorClass="impulso"
        />
        <DashboardNavCard
          href="/dashboard/metricas"
          icon={BarChart3}
          title="Métricas"
          description="Estadísticas de la zona: niños, voluntarios y sesiones"
          colorClass="teal"
        />
      </div>
    </div>
  );
}
