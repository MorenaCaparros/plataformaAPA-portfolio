'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIAS_LABELS, type Categoria, VALOR_NO_COMPLETADO, LABEL_NO_COMPLETADO, calcularPromedioItems } from '@/lib/constants/items-observacion';
import { ArrowLeft, Calendar, Clock, BarChart3, FileText } from 'lucide-react';

interface SesionDetalle {
  id: string;
  fecha: string;
  duracion_minutos: number;
  observaciones_libres: string;
  objetivo_sesion: string | null;
  actividad_realizada: string | null;
  tipo_sesion: string | null;
  items: Array<{
    id: string;
    categoria: Categoria;
    texto: string;
    valor: number;
  }>;
  ninos: {
    alias: string;
    rango_etario: string;
    nivel_alfabetizacion: string;
  };
}

export default function SesionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const sesionId = params.sesionId as string;
  
  const [sesion, setSesion] = useState<SesionDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSesion();
  }, [sesionId]);

  const fetchSesion = async () => {
    try {
      const { data, error } = await supabase
        .from('sesiones')
        .select(`
          id,
          fecha,
          duracion_minutos,
          observaciones_libres,
          objetivo_sesion,
          actividad_realizada,
          tipo_sesion,
          items,
          ninos (
            alias,
            rango_etario,
            nivel_alfabetizacion
          )
        `)
        .eq('id', sesionId)
        .single();

      if (error) throw error;
      setSesion(data);
    } catch (error) {
      console.error('Error:', error);
      alert('No se pudo cargar la sesión');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const itemsPorCategoria = (sesion?.items || []).reduce((acc: Record<string, Array<{id: string; categoria: Categoria; texto: string; valor: number}>>, item: any) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, Array<{id: string; categoria: Categoria; texto: string; valor: number}>>);

  const calcularPromedio = (items: any[]) => {
    return calcularPromedioItems(items);
  };

  const getColorByValue = (valor: number) => {
    if (valor === VALOR_NO_COMPLETADO) return 'text-gray-500 bg-gray-100';
    if (valor <= 2) return 'text-red-600 bg-red-50';
    if (valor === 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sol-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!sesion) return null;

  return (
    <div className="min-h-screen pb-8">
      {/* Navbar flotante */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al historial
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Info de la sesión */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.1)] p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutro-carbon font-quicksand mb-4">{sesion.ninos.alias}</h1>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-neutro-piedra font-outfit mb-6">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-2xl border border-white/60">
              <Calendar className="w-4 h-4" />
              {formatFecha(sesion.fecha)}
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-2xl border border-white/60">
              <Clock className="w-4 h-4" />
              {sesion.duracion_minutos} min
            </span>
            <span className="px-3 py-1.5 bg-impulso-50 text-impulso-700 rounded-2xl border border-impulso-200/30 font-semibold">
              {sesion.ninos.rango_etario} años
            </span>
            <span className="px-3 py-1.5 bg-sol-50 text-sol-700 rounded-2xl border border-sol-200/30 font-semibold">
              {sesion.ninos.nivel_alfabetizacion}
            </span>
          </div>

          <div className="bg-gradient-to-br from-crecimiento-50/60 to-sol-50/40 backdrop-blur-sm rounded-2xl border border-crecimiento-200/30 p-5">
            <div className="text-sm text-neutro-carbon font-outfit font-medium mb-3">Promedio general de la sesión</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/60 rounded-full h-4 border border-white/60 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sol-400 to-crecimiento-400 h-4 rounded-full shadow-[0_0_8px_rgba(242,201,76,0.4)] transition-all duration-500"
                  style={{ width: `${(calcularPromedio(sesion.items) / 5) * 100}%` }}
                />
              </div>
              <span className="text-2xl font-bold text-neutro-carbon font-quicksand">
                {calcularPromedio(sesion.items)}/5
              </span>
            </div>
          </div>
        </div>

        {/* Actividad del día */}
        {(sesion.objetivo_sesion || sesion.actividad_realizada) && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(164,198,57,0.1)] p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold text-neutro-carbon font-quicksand mb-4 flex items-center gap-2">
              <span>📋</span> Actividad del día
            </h2>
            <div className="space-y-4">
              {sesion.objetivo_sesion && (
                <div className="bg-crecimiento-50/60 rounded-2xl border border-crecimiento-200/30 p-4">
                  <p className="text-xs font-bold text-crecimiento-700 font-outfit uppercase tracking-wide mb-1">🎯 Objetivo</p>
                  <p className="text-neutro-carbon font-outfit text-sm leading-relaxed whitespace-pre-wrap">{sesion.objetivo_sesion}</p>
                </div>
              )}
              {sesion.actividad_realizada && (
                <div className="bg-sol-50/60 rounded-2xl border border-sol-200/30 p-4">
                  <p className="text-xs font-bold text-sol-700 font-outfit uppercase tracking-wide mb-1">📝 Actividad realizada</p>
                  <p className="text-neutro-carbon font-outfit text-sm leading-relaxed whitespace-pre-wrap">{sesion.actividad_realizada}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resultados por categoría */}
        <div className="space-y-5">
          {(Object.keys(itemsPorCategoria) as Categoria[]).map(categoria => {
            const items = itemsPorCategoria[categoria];
            const promedio = calcularPromedio(items);

            return (
              <div key={categoria} className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.1)] p-6 sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg sm:text-xl font-bold text-neutro-carbon font-quicksand">
                    {CATEGORIAS_LABELS[categoria]}
                  </h2>
                  <span className="text-2xl font-bold text-crecimiento-600 font-quicksand">{promedio}/5</span>
                </div>

                <div className="space-y-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 pb-4 border-b border-white/60 last:border-0 last:pb-0">
                      <div className={`px-4 py-2 rounded-2xl font-bold font-quicksand text-lg ${getColorByValue(item.valor)}`}>
                        {item.valor === VALOR_NO_COMPLETADO ? LABEL_NO_COMPLETADO : item.valor}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium font-outfit ${item.valor === VALOR_NO_COMPLETADO ? 'text-gray-400' : 'text-neutro-carbon'}`}>{item.texto}</p>
                        {item.valor === VALOR_NO_COMPLETADO && (
                          <p className="text-xs text-gray-400 mt-0.5">No completó el campo — no afecta el promedio</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Observaciones */}
        {sesion.observaciones_libres && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.1)] p-6 sm:p-8 mt-5">
            <h2 className="text-lg sm:text-xl font-bold text-neutro-carbon font-quicksand mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observaciones adicionales
            </h2>
            <p className="text-neutro-piedra font-outfit leading-relaxed whitespace-pre-wrap">{sesion.observaciones_libres}</p>
          </div>
        )}
      </div>
    </div>
  );
}
