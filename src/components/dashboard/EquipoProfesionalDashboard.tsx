'use client';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ClipboardList,
  Target,
  BookOpen,
  Users,
  TrendingUp,
  FileText,
  UserCog,
  Baby,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import DashboardHeader from './ui/DashboardHeader';
import DashboardMetricCard, { DashboardMetricCardSkeleton } from './ui/DashboardMetricCard';
import DashboardNavCard from './ui/DashboardNavCard';

interface Metrics {
  totalNinos: number;
  evaluacionesPendientes: number;
  planesActivos: number;
  sesionesEsteMes: number;
}

export default function EquipoProfesionalDashboard({ title }: { title: string }) {
  const { perfil } = useAuth();

  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['profesional-metricas'],
    queryFn: async () => {
      const { count: ninosCount } = await supabase
        .from('ninos')
        .select('*', { count: 'exact', head: true });

      const { data: ninos } = await supabase
        .from('ninos')
        .select('id, entrevistas(fecha, tipo)');

      let evaluacionesPendientes = 0;
      const hoy = new Date();
      type NinoConEvaluaciones = { id: string; entrevistas?: { fecha: string; tipo: string }[] };
      (ninos as NinoConEvaluaciones[] | null)?.forEach((nino) => {
        const evaluaciones = nino.entrevistas || [];
        if (evaluaciones.length === 0) {
          evaluacionesPendientes++;
        } else {
          const sorted = [...evaluaciones].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
          const diasDesdeUltima = Math.floor(
            (hoy.getTime() - new Date(sorted[0].fecha).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diasDesdeUltima > 180) evaluacionesPendientes++;
        }
      });

      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const { count: sesionesCount } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', inicioMes.toISOString());

      const { count: planesCount } = await supabase
        .from('planes_intervencion')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');

      return {
        totalNinos: ninosCount || 0,
        evaluacionesPendientes,
        planesActivos: planesCount || 0,
        sesionesEsteMes: sesionesCount || 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  const m = metrics ?? { totalNinos: 0, evaluacionesPendientes: 0, planesActivos: 0, sesionesEsteMes: 0 };

  return (
    <div>
      <DashboardHeader
        title={title}
        subtitle="Acceso completo a evaluaciones, planes y biblioteca"
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
            <DashboardMetricCard
              icon={Users}
              value={m.totalNinos}
              label="Total de Niños"
              colorClass="impulso"
            />
            <DashboardMetricCard
              icon={ClipboardList}
              value={m.evaluacionesPendientes}
              label="Evaluaciones Pendientes"
              sublabel=">180 días o sin entrevista"
              colorClass="sol"
            />
            <DashboardMetricCard
              icon={Target}
              value={m.planesActivos}
              label="Planes Activos"
              colorClass="crecimiento"
            />
            <DashboardMetricCard
              icon={TrendingUp}
              value={m.sesionesEsteMes}
              label="Sesiones este Mes"
              colorClass="crecimiento"
            />
          </>
        )}
      </div>

      {/* Grilla de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardNavCard
          href="/dashboard/psicopedagogia/evaluaciones"
          icon={ClipboardList}
          title="Evaluaciones"
          description="Evaluaciones diagnósticas, seguimiento y egresos. Historial completo por niño."
          colorClass="sol"
          badge={m.evaluacionesPendientes > 0 ? String(m.evaluacionesPendientes) : undefined}
        />

        <DashboardNavCard
          href="/dashboard/psicopedagogia/planes"
          icon={Target}
          title="Planes de Intervención"
          description="Crear y gestionar planes con asistencia de IA. Actividades semanales para voluntarios."
          colorClass="crecimiento"
          badge="IA"
          badgeVariant="gradient"
        />

        <DashboardNavCard
          href="/dashboard/biblioteca"
          icon={BookOpen}
          title="Biblioteca"
          description="Documentos, guías y papers. Chat con IA para consultas especializadas."
          colorClass="purple"
          badge="RAG"
        />

        <DashboardNavCard
          href="/dashboard/asignaciones"
          icon={UserCog}
          title="Asignaciones"
          description="Sistema de matching automático voluntario-niño. Ver disponibilidad y zonas."
          colorClass="crecimiento"
          badge="Matching"
        />

        <DashboardNavCard
          href="/dashboard/ninos"
          icon={FileText}
          title="Perfiles de Niños"
          description="Acceso completo a datos, historial, sesiones y progreso de cada niño."
          colorClass="impulso"
        />

        <DashboardNavCard
          href="/dashboard/ia"
          icon={Sparkles}
          title="Módulo IA"
          description="Análisis inteligente, consulta de biblioteca RAG y detección de patrones."
          colorClass="purple"
          badge="IA"
          badgeVariant="gradient"
        />

        <DashboardNavCard
          href="/dashboard/metricas"
          icon={BarChart3}
          title="Métricas"
          description="Estadísticas de tu zona: niños atendidos, voluntarios activos, cobertura."
          colorClass="teal"
        />
      </div>
    </div>
  );
}
