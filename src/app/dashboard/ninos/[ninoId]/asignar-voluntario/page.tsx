'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  Star, 
  UserCheck, 
  AlertCircle,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface DeficitNino {
  area: string;
  nivel_gravedad: number;
  descripcion: string;
}

interface HabilidadesVoluntario {
  lenguaje: number;
  grafismo: number;
  lectura_escritura: number;
  matematicas: number;
}

interface SugerenciaMatching {
  voluntario_id: string;
  voluntario_nombre: string;
  score: number;
  habilidades: HabilidadesVoluntario;
  asignaciones_actuales: number;
  disponibilidad: 'alta' | 'media' | 'baja';
  detalles_score: {
    score_habilidades: number;
    score_disponibilidad: number;
    score_zona: number;
  };
}

const COLORES_AREA: Record<string, { bg: string; text: string; border: string }> = {
  lenguaje: { bg: 'bg-sol-50', text: 'text-sol-700', border: 'border-sol-200' },
  grafismo: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  lectura_escritura: { bg: 'bg-impulso-50', text: 'text-impulso-600', border: 'border-impulso-200' },
  matematicas: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const NOMBRES_AREAS: Record<string, string> = {
  lenguaje: 'Lenguaje',
  grafismo: 'Grafismo',
  lectura_escritura: 'Lectura/Escritura',
  matematicas: 'Matemáticas',
};

export default function AsignarVoluntarioPage() {
  const params = useParams();
  const router = useRouter();

  const ninoId = params.ninoId as string;

  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [nino, setNino] = useState<any>(null);
  const [sugerencias, setSugerencias] = useState<SugerenciaMatching[]>([]);
  const [sinDeficits, setSinDeficits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSugerencias();
  }, [ninoId]);

  const fetchSugerencias = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/matching/sugerencias?ninoId=${ninoId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener sugerencias');
      }

      const data = await response.json();
      setNino(data.nino);
      setSugerencias(data.sugerencias || []);
      setSinDeficits(data.sinDeficits || false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const asignarVoluntario = async (voluntarioId: string, score: number, areasDeficit: string[]) => {
    if (!confirm('¿Confirmar asignación de este voluntario al niño?')) {
      return;
    }

    try {
      setAsignando(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Usar el endpoint POST que maneja la desactivación automática
      const response = await fetch('/api/asignaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nino_id: ninoId,
          voluntario_id: voluntarioId,
          score_matching: score,
          areas_foco: areasDeficit,
          notas: `Asignación automática por sistema de matching (Score: ${score}/100)`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear asignación');
      }

      const mensaje = data.asignaciones_desactivadas > 0
        ? `✅ Voluntario asignado exitosamente. Se desactivó ${data.asignaciones_desactivadas} asignación anterior.`
        : '✅ Voluntario asignado exitosamente.';
      
      alert(mensaje);
      router.push(`/dashboard/ninos/${ninoId}`);
    } catch (err: any) {
      alert('❌ Error al asignar: ' + err.message);
    } finally {
      setAsignando(false);
    }
  };

  const getDisponibilidadColor = (disponibilidad: string) => {
    if (disponibilidad === 'alta') return 'text-green-600 bg-green-50 border-green-200';
    if (disponibilidad === 'media') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-crecimiento-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analizando compatibilidades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href={`/dashboard/ninos/${ninoId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/dashboard/ninos/${ninoId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al perfil</span>
          </Link>

          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-crecimiento-100 rounded-2xl">
                <Users className="w-8 h-8 text-crecimiento-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Asignar Voluntario
                </h1>
                <p className="text-gray-600">
                  Para: <span className="font-semibold text-gray-900">{nino?.alias}</span>
                </p>
              </div>
            </div>

            {/* Déficits del niño */}
            {nino?.deficits && nino.deficits.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Déficits identificados:</h3>
                <div className="flex flex-wrap gap-2">
                  {nino.deficits.map((deficit: DeficitNino, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm"
                    >
                      <span className="font-medium">{deficit.area}</span>
                      <span className="text-gray-500 ml-2">
                        (Nivel: {deficit.nivel_gravedad}/5)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aviso cuando no hay evaluación psicopedagógica */}
        {sinDeficits && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-700">Sin evaluación psicopedagógica registrada</p>
              <p className="text-sm text-blue-600">
                Se muestran todos los voluntarios disponibles ordenados por disponibilidad y score general.
                Para un matching preciso, realizá la evaluación psicopedagógica del niño primero.
              </p>
            </div>
          </div>
        )}

        {/* Sugerencias */}
        {sugerencias.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">
              No hay voluntarios disponibles
            </h3>
            <p className="text-yellow-600">
              No se encontraron voluntarios con autoevaluaciones completadas.
              Los voluntarios deben completar al menos una autoevaluación para poder ser asignados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-crecimiento-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                {sugerencias.length} voluntario{sugerencias.length !== 1 ? 's' : ''} compatible{sugerencias.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {sugerencias.map((sugerencia) => (
              <div
                key={sugerencia.voluntario_id}
                className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-crecimiento-100 to-sol-100 rounded-2xl">
                      <UserCheck className="w-6 h-6 text-crecimiento-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {sugerencia.voluntario_nombre}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getDisponibilidadColor(sugerencia.disponibilidad)}`}>
                          {sugerencia.disponibilidad === 'alta' ? '🟢' : sugerencia.disponibilidad === 'media' ? '🟡' : '🔴'}
                          {' '}Disponibilidad {sugerencia.disponibilidad}
                        </span>
                        <span className="text-sm text-gray-500">
                          {sugerencia.asignaciones_actuales} asignacion{sugerencia.asignaciones_actuales !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold ${getScoreColor(sugerencia.score)}`}>
                    <Star className="w-5 h-5 fill-current" />
                    <span className="text-2xl">{sugerencia.score}</span>
                    <span className="text-sm font-normal">/100</span>
                  </div>
                </div>

                {/* Habilidades por área */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {Object.entries(sugerencia.habilidades).map(([area, nivel]) => {
                    const areaKey = area as keyof HabilidadesVoluntario;
                    const color = COLORES_AREA[areaKey] || COLORES_AREA.lenguaje;
                    return (
                      <div
                        key={area}
                        className={`p-3 ${color.bg} border ${color.border} rounded-xl`}
                      >
                        <p className={`text-xs font-medium ${color.text} mb-1`}>
                          {NOMBRES_AREAS[areaKey]}
                        </p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.round(nivel)
                                  ? `fill-current ${color.text}`
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detalles del score */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
                  <span className="text-xs text-gray-600">
                    🎯 Habilidades: <strong>{sugerencia.detalles_score.score_habilidades}</strong>
                  </span>
                  <span className="text-xs text-gray-600">
                    ⚡ Disponibilidad: <strong>{sugerencia.detalles_score.score_disponibilidad}</strong>
                  </span>
                  <span className="text-xs text-gray-600">
                    📍 Zona: <strong>{sugerencia.detalles_score.score_zona}</strong>
                  </span>
                </div>

                {/* Botón de asignación */}
                <button
                  onClick={() => asignarVoluntario(
                    sugerencia.voluntario_id, 
                    sugerencia.score,
                    nino?.deficits?.map((d: DeficitNino) => d.area) || []
                  )}
                  disabled={asignando}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-700 text-white font-semibold rounded-xl hover:from-crecimiento-600 hover:to-crecimiento-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {asignando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Asignando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Asignar este voluntario</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
