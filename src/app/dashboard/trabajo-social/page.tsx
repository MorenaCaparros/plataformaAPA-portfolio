'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TrabajoSocialPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (perfil && perfil.rol !== 'trabajador_social') {
      router.push('/dashboard');
    }
  }, [perfil, router]);

  if (!perfil || perfil.rol !== 'trabajador_social') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo trabajadores sociales pueden acceder.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trabajo Social
          </h1>
          <p className="text-gray-600">
            📱 Optimizado para celular • Entrevistas familiares, seguimiento sociofamiliar y alertas
          </p>
        </div>

        {/* Cards de acciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Nueva Entrevista */}
          <Link
            href="/dashboard/trabajo-social/entrevista/nueva"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-crecimiento-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-crecimiento-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nueva Entrevista Familiar
            </h3>
            <p className="text-gray-600 text-sm">
              Registrar entrevista inicial con grabación de voz
            </p>
          </Link>

          {/* Entrevistas Realizadas */}
          <Link
            href="/dashboard/trabajo-social/entrevistas"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Entrevistas Realizadas
            </h3>
            <p className="text-gray-600 text-sm">
              Ver historial de entrevistas familiares
            </p>
          </Link>

          {/* Seguimiento Familiar */}
          <Link
            href="/dashboard/trabajo-social/seguimiento"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Seguimiento Familiar
            </h3>
            <p className="text-gray-600 text-sm">
              Intervenciones y seguimiento de contextos familiares
            </p>
          </Link>

          {/* Alertas Sociales */}
          <Link
            href="/dashboard/trabajo-social/alertas"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-red-200"
          >
            <div className="flex items-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Alertas Sociales
            </h3>
            <p className="text-gray-600 text-sm">
              Gestionar alertas de ausentismo y contexto familiar
            </p>
            <span className="inline-block mt-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              4 alertas activas
            </span>
          </Link>

          {/* Familias */}
          <Link
            href="/dashboard/trabajo-social/familias"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-amber-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Base de Familias
            </h3>
            <p className="text-gray-600 text-sm">
              Información completa de contacto y contexto
            </p>
          </Link>

          {/* Niños */}
          <Link
            href="/dashboard/ninos"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-pink-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Niños Registrados
            </h3>
            <p className="text-gray-600 text-sm">
              Acceso completo a datos sociofamiliares
            </p>
          </Link>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Entrevistas del Mes</p>
            <p className="text-3xl font-bold text-crecimiento-600">8</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Familias Activas</p>
            <p className="text-3xl font-bold text-green-600">45</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Seguimientos</p>
            <p className="text-3xl font-bold text-purple-600">12</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Alertas Activas</p>
            <p className="text-3xl font-bold text-red-600">4</p>
          </div>
        </div>

        {/* Banner de funcionalidad offline */}
        <div className="mt-6 bg-sol-50 border border-sol-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-crecimiento-600 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-sol-900">
                Funcionalidad Offline Activa
              </p>
              <p className="text-sm text-sol-700 mt-1">
                Podés registrar entrevistas sin conexión. Los datos se
                sincronizarán automáticamente cuando tengas internet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
