'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Metrics = {
  totalNinos: number;
  totalVoluntarios: number;
  totalCoordinadores: number;
  totalSesiones: number;
  sesionesEsteMes: number;
  asistenciaPromedio: number;
  ninosActivos: number;
};

export default function AdminPage() {
  const { user, perfil } = useAuth();
  const router = useRouter();
  
  const [metrics, setMetrics] = useState<Metrics>({
    totalNinos: 0,
    totalVoluntarios: 0,
    totalCoordinadores: 0,
    totalSesiones: 0,
    sesionesEsteMes: 0,
    asistenciaPromedio: 0,
    ninosActivos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar que el usuario sea director
    if (perfil && perfil.rol !== 'director') {
      router.push('/dashboard');
      return;
    }

    if (perfil?.rol === 'director') {
      fetchMetrics();
    }
  }, [perfil, router]);

  const fetchMetrics = async () => {
    try {
      // Total de niños
      const { count: totalNinos } = await supabase
        .from('ninos')
        .select('*', { count: 'exact', head: true });

      // Total de voluntarios
      const { count: totalVoluntarios } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'voluntario');

      // Total de coordinadores
      const { count: totalCoordinadores } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'coordinador');

      // Total de sesiones
      const { count: totalSesiones } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true });

      // Sesiones de este mes
      const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: sesionesEsteMes } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', primerDiaMes);

      // Niños activos (con al menos una sesión en los últimos 30 días)
      const hace30dias = new Date();
      hace30dias.setDate(hace30dias.getDate() - 30);
      const { data: ninosActivos } = await supabase
        .from('sesiones')
        .select('nino_id')
        .gte('fecha', hace30dias.toISOString());

      const ninosActivosUnicos = new Set(ninosActivos?.map((s: any) => s.nino_id) || []).size;

      // Calcular asistencia promedio (aproximada)
      const asistenciaPromedio = totalNinos && totalNinos > 0 
        ? Math.round((ninosActivosUnicos / totalNinos) * 100) 
        : 0;

      setMetrics({
        totalNinos: totalNinos || 0,
        totalVoluntarios: totalVoluntarios || 0,
        totalCoordinadores: totalCoordinadores || 0,
        totalSesiones: totalSesiones || 0,
        sesionesEsteMes: sesionesEsteMes || 0,
        asistenciaPromedio,
        ninosActivos: ninosActivosUnicos,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
    }
  };

  if (!perfil || perfil.rol !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo directores pueden acceder a esta página.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel de Dirección
          </h1>
          <p className="text-gray-600">
            Vista ejecutiva y gestión del programa
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Niños */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-crecimiento-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Niños</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalNinos}</p>
              </div>
              <div className="text-4xl">👧🏻</div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.ninosActivos} activos (último mes)
            </p>
          </div>

          {/* Total Voluntarios */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Voluntarios</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalVoluntarios}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.totalCoordinadores} coordinadores
            </p>
          </div>

          {/* Total Sesiones */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-impulso-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Sesiones Totales</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalSesiones}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.sesionesEsteMes} este mes
            </p>
          </div>

          {/* Asistencia Promedio */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-sol-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Asistencia</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.asistenciaPromedio}%</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Últimos 30 días
            </p>
          </div>
        </div>

        {/* Secciones de gestión */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gestión de Usuarios */}
          <Link
            href="/dashboard/admin/usuarios"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-crecimiento-600 transition">
                Gestión de Usuarios
              </h2>
              <span className="text-3xl">👤</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Alta, baja, cambio de roles, gestión de permisos y desbloqueo de accesos.
            </p>
            <div className="flex items-center text-crecimiento-600 font-medium text-sm">
              Ver usuarios
              <span className="ml-2 group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>

          {/* Feedback a Coordinadores */}
          <Link
            href="/dashboard/admin/feedback"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">
                Feedback a Coordinadores
              </h2>
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Registro cualitativo y cuantitativo, análisis con IA.
            </p>
            <div className="flex items-center text-green-600 font-medium text-sm">
              Dar feedback
              <span className="ml-2 group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>

          {/* Reportes Institucionales */}
          <Link
            href="/dashboard/admin/reportes"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-impulso-500 transition">
                Reportes Institucionales
              </h2>
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Exportar datos en PDF/Excel para informes anuales y financiadores.
            </p>
            <div className="flex items-center text-impulso-500 font-medium text-sm">
              Generar reportes
              <span className="ml-2 group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>

          {/* Análisis con IA */}
          <Link
            href="/dashboard/admin/analisis-ia"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-crecimiento-600 transition">
                Análisis con IA
              </h2>
              <span className="text-3xl">🤖</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Consultas sobre el programa, tendencias y sugerencias.
            </p>
            <div className="flex items-center text-crecimiento-600 font-medium text-sm">
              Consultar IA
              <span className="ml-2 group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>

          {/* Configuración del Sistema */}
          <Link
            href="/dashboard/admin/configuracion"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition">
                Configuración
              </h2>
              <span className="text-3xl">⚙️</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Backups, seguridad, logs de auditoría y variables del sistema.
            </p>
            <div className="flex items-center text-gray-700 font-medium text-sm">
              Configurar
              <span className="ml-2 group-hover:translate-x-1 transition">→</span>
            </div>
          </Link>

          {/* Vista de Todos los Datos */}
          <div className="bg-gradient-to-br from-sol-50 to-crecimiento-50 rounded-lg shadow-sm p-6 border-2 border-sol-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Acceso Completo
              </h2>
              <span className="text-3xl">🔓</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Como director, tienes acceso completo a todos los datos, incluyendo legajos completos con apellidos.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/ninos"
                className="text-center bg-white text-crecimiento-600 py-2 px-4 rounded-lg hover:bg-crecimiento-50 transition text-sm font-medium"
              >
                Ver todos los niños
              </Link>
              <Link
                href="/dashboard/sesiones"
                className="text-center bg-white text-impulso-500 py-2 px-4 rounded-lg hover:bg-impulso-50 transition text-sm font-medium"
              >
                Ver todas las sesiones
              </Link>
            </div>
          </div>
        </div>

        {/* Nota de seguridad */}
        <div className="mt-8 bg-sol-50 border-l-4 border-sol-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-sol-800">
                Nota de Seguridad
              </h3>
              <p className="text-sm text-sol-700 mt-1">
                Todas las acciones realizadas desde este panel quedan registradas en los logs de auditoría.
                Utiliza tus privilegios de director de forma responsable y solo cuando sea estrictamente necesario.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
