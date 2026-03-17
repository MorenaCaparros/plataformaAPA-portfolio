'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, CheckCircle2 } from 'lucide-react';

interface ConfigItem {
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string;
}

export default function ConfiguracionPage() {
  const { user, perfil, loading: authLoading } = useAuth();
  const router = useRouter();

  // Config state
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [configGuardada, setConfigGuardada] = useState(false);

  // Editable config values
  const [preguntasPorArea, setPreguntasPorArea] = useState(5);
  const [notifIntervaloHoras, setNotifIntervaloHoras] = useState(48);
  const [notifActiva, setNotifActiva] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (perfil?.rol !== 'director') {
        router.push('/dashboard');
      }
    }
  }, [authLoading, user, perfil, router]);

  useEffect(() => {
    if (perfil?.rol === 'director') {
      fetchConfig();
    }
  }, [perfil]);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*');

      if (error) {
        console.error('Error al cargar config (tabla puede no existir aún):', error);
        setLoadingConfig(false);
        return;
      }

      const map: Record<string, ConfigItem> = {};
      (data || []).forEach((item: any) => {
        map[item.clave] = {
          clave: item.clave,
          valor: item.valor,
          tipo: item.tipo,
          descripcion: item.descripcion,
        };
      });

      if (map['autoevaluacion_preguntas_por_area']) {
        setPreguntasPorArea(parseInt(map['autoevaluacion_preguntas_por_area'].valor) || 5);
      }
      if (map['notificacion_capacitacion_intervalo_horas']) {
        setNotifIntervaloHoras(parseInt(map['notificacion_capacitacion_intervalo_horas'].valor) || 48);
      }
      if (map['notificacion_capacitacion_activa']) {
        setNotifActiva(map['notificacion_capacitacion_activa'].valor === 'true');
      }
    } catch (e) {
      console.error('Error cargando configuración:', e);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const guardarConfig = async () => {
    setGuardandoConfig(true);
    setConfigGuardada(false);
    try {
      const updates = [
        { clave: 'autoevaluacion_preguntas_por_area', valor: String(preguntasPorArea), tipo: 'number', descripcion: 'Cantidad default de preguntas aleatorias por área en autoevaluaciones' },
        { clave: 'notificacion_capacitacion_intervalo_horas', valor: String(notifIntervaloHoras), tipo: 'number', descripcion: 'Intervalo en horas entre recordatorios de capacitaciones pendientes' },
        { clave: 'notificacion_capacitacion_activa', valor: String(notifActiva), tipo: 'boolean', descripcion: 'Activar/desactivar notificaciones de capacitaciones pendientes' },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('configuracion_sistema')
          .upsert(
            {
              clave: item.clave,
              valor: item.valor,
              tipo: item.tipo,
              descripcion: item.descripcion,
              modificado_por: perfil?.id || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'clave' }
          );

        if (error) {
          console.error(`Error al guardar ${item.clave}:`, error);
          throw error;
        }
      }

      setConfigGuardada(true);
      setTimeout(() => setConfigGuardada(false), 3000);
    } catch (e) {
      console.error('Error al guardar configuración:', e);
      alert('Error al guardar la configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando...</p>
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
                Configuración
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sistema */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">⚙️</span>
              Sistema
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-white/40">
                <span className="text-neutro-piedra font-outfit">Versión:</span>
                <span className="font-semibold text-neutro-carbon font-outfit">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/40">
                <span className="text-neutro-piedra font-outfit">Entorno:</span>
                <span className="font-semibold text-neutro-carbon font-outfit">
                  {process.env.NODE_ENV}
                </span>
              </div>
              <button className="w-full mt-4 px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Ver logs del sistema
              </button>
            </div>
          </div>

          {/* Base de datos */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">💾</span>
              Base de Datos
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-sol-400 to-sol-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(242,201,76,0.25)] transition-all font-medium font-outfit min-h-[56px] shadow-[0_4px_16px_rgba(242,201,76,0.15)] active:scale-95">
                Exportar datos
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit min-h-[56px] shadow-[0_4px_16px_rgba(164,198,57,0.15)] active:scale-95">
                Crear backup manual
              </button>
              <button className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Restaurar backup
              </button>
            </div>
          </div>

          {/* ★ Autoevaluaciones — Configurable */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-crecimiento-200/40 p-6 shadow-[0_4px_16px_rgba(164,198,57,0.1)] hover:shadow-[0_8px_32px_rgba(164,198,57,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">📋</span>
              Autoevaluaciones
            </h3>
            {loadingConfig ? (
              <div className="py-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-2"></div>
                <p className="text-xs text-neutro-piedra font-outfit">Cargando config...</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-1">
                    Preguntas por área (default)
                  </label>
                  <p className="text-xs text-neutro-piedra font-outfit mb-3">
                    Cantidad de preguntas aleatorias por área al crear una autoevaluación desde el banco.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreguntasPorArea(Math.max(1, preguntasPorArea - 1))}
                      className="w-10 h-10 rounded-xl bg-neutro-nube hover:bg-neutro-piedra/20 text-neutro-carbon font-bold transition-all flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={preguntasPorArea}
                      onChange={(e) => setPreguntasPorArea(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center px-2 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-neutro-carbon font-outfit font-bold focus:ring-2 focus:ring-crecimiento-400"
                    />
                    <button
                      type="button"
                      onClick={() => setPreguntasPorArea(Math.min(50, preguntasPorArea + 1))}
                      className="w-10 h-10 rounded-xl bg-neutro-nube hover:bg-neutro-piedra/20 text-neutro-carbon font-bold transition-all flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-sm text-neutro-piedra font-outfit">preguntas</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/40">
                  <Link
                    href="/dashboard/autoevaluaciones/gestionar/banco-preguntas"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[48px] active:scale-95"
                  >
                    📝 Gestionar Banco de Preguntas
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ★ Notificaciones — Configurable */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-sol-200/40 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">🔔</span>
              Notificaciones de Capacitaciones
            </h3>
            {loadingConfig ? (
              <div className="py-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-sol-200 border-t-sol-400 mx-auto mb-2"></div>
                <p className="text-xs text-neutro-piedra font-outfit">Cargando config...</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between py-3 border-b border-white/40">
                  <div>
                    <span className="text-neutro-carbon font-outfit font-medium block">Recordatorios activos</span>
                    <span className="text-xs text-neutro-piedra font-outfit">
                      Enviar notificaciones in-app a voluntarios con capacitaciones pendientes
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifActiva}
                      onChange={(e) => setNotifActiva(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-neutro-lienzo peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crecimiento-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutro-piedra/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crecimiento-400"></div>
                  </label>
                </div>
                <div className={notifActiva ? '' : 'opacity-50 pointer-events-none'}>
                  <label className="block text-sm font-medium text-neutro-carbon font-outfit mb-1">
                    Intervalo de recordatorios
                  </label>
                  <p className="text-xs text-neutro-piedra font-outfit mb-3">
                    Cada cuántas horas se envía un recordatorio al voluntario si tiene capacitaciones pendientes.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNotifIntervaloHoras(Math.max(1, notifIntervaloHoras - 12))}
                      className="w-10 h-10 rounded-xl bg-neutro-nube hover:bg-neutro-piedra/20 text-neutro-carbon font-bold transition-all flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={notifIntervaloHoras}
                      onChange={(e) => setNotifIntervaloHoras(Math.min(720, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center px-2 py-2 bg-white border border-neutro-piedra/20 rounded-xl text-neutro-carbon font-outfit font-bold focus:ring-2 focus:ring-sol-400"
                    />
                    <button
                      type="button"
                      onClick={() => setNotifIntervaloHoras(Math.min(720, notifIntervaloHoras + 12))}
                      className="w-10 h-10 rounded-xl bg-neutro-nube hover:bg-neutro-piedra/20 text-neutro-carbon font-bold transition-all flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-sm text-neutro-piedra font-outfit">horas</span>
                  </div>
                  <p className="text-xs text-neutro-piedra font-outfit mt-2">
                    = cada {notifIntervaloHoras >= 24
                      ? `${Math.floor(notifIntervaloHoras / 24)} día${Math.floor(notifIntervaloHoras / 24) !== 1 ? 's' : ''}${notifIntervaloHoras % 24 > 0 ? ` y ${notifIntervaloHoras % 24}h` : ''}`
                      : `${notifIntervaloHoras} horas`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botón GUARDAR config — full width */}
          <div className="md:col-span-2">
            <button
              onClick={guardarConfig}
              disabled={guardandoConfig || loadingConfig}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 min-h-[56px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-outfit font-semibold disabled:opacity-50 active:scale-95 text-lg"
            >
              {guardandoConfig ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white"></div>
                  Guardando...
                </>
              ) : configGuardada ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  ¡Configuración guardada!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>

          {/* Evaluaciones */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">📊</span>
              Sistema de Evaluación
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Gestionar áreas de evaluación
              </button>
              <button className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Gestionar habilidades
              </button>
              <button className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Configurar escalas
              </button>
            </div>
          </div>

          {/* Seguridad */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all">
            <h3 className="text-xl font-bold text-neutro-carbon mb-5 flex items-center gap-3 font-quicksand">
              <span className="text-3xl">🔒</span>
              Seguridad y Privacidad
            </h3>
            <div className="space-y-3">
              <button className="px-4 py-3 w-full bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Ver log de accesos
              </button>
              <button className="px-4 py-3 w-full bg-white/80 backdrop-blur-sm border border-white/60 text-neutro-carbon rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.15)] transition-all font-medium font-outfit min-h-[56px] active:scale-95">
                Auditoría de permisos
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
