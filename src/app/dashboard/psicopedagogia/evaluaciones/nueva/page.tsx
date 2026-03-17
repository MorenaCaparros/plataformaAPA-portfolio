'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SelectorNino from '@/components/forms/SelectorNino';
import { supabase } from '@/lib/supabase/client';

function NuevaEvaluacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ninoIdParam = searchParams.get('ninoId');

  const [loading, setLoading] = useState(false);
  const [ninoId, setNinoId] = useState<string | null>(ninoIdParam);

  const [formData, setFormData] = useState({
    // Lenguaje y Vocabulario
    comprension_ordenes: 3,
    identificacion_objetos: 3,
    formacion_oraciones: 3,
    pronunciacion: 3,
    notas_lenguaje: '',

    // Grafismo y Motricidad Fina
    agarre_lapiz: 'en_desarrollo' as 'adecuado' | 'inadecuado' | 'en_desarrollo',
    tipo_trazo: 'irregular' as 'firme' | 'tembloroso' | 'irregular',
    representacion_figuras: 3,
    notas_grafismo: '',

    // Lectura y Escritura
    reconocimiento_vocales: 3,
    reconocimiento_consonantes: 3,
    identificacion_silabas: 3,
    lectura_palabras: 3,
    lectura_textos: 3,
    escritura_nombre: 3,
    escritura_palabras: 3,
    escritura_oraciones: 3,
    comprension_lectora: 3,
    notas_lectoescritura: '',

    // Nociones Matemáticas
    conteo: 3,
    reconocimiento_numeros: 3,
    suma_basica: 3,
    resta_basica: 3,
    razonamiento_logico: 3,
    notas_matematicas: '',

    // Conclusiones
    dificultades_identificadas: '',
    fortalezas: '',
    nivel_alfabetizacion: '',
    observaciones_generales: '',
    recomendaciones: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!ninoId) {
        alert('⚠️ Por favor seleccioná un niño primero');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/psicopedagogia/evaluaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          nino_id: ninoId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar la evaluación');
      }

      alert('✅ Evaluación guardada correctamente');
      router.push('/dashboard/psicopedagogia/evaluaciones');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Error al guardar la evaluación'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nueva Evaluación Inicial
          </h1>
          <p className="text-gray-600">
            Evaluación diagnóstica de ingreso - Escala 1 (Muy Bajo) a 5 (Muy Alto)
          </p>
        </div>
{/* Selector de Niño */}
        <SelectorNino onSelect={setNinoId} initialNinoId={ninoIdParam} />

        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Lenguaje y Vocabulario */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              1. Lenguaje y Vocabulario
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comprensión de órdenes simples
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.comprension_ordenes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      comprension_ordenes: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 - Muy bajo</span>
                  <span className="font-bold">{formData.comprension_ordenes}</span>
                  <span>5 - Muy alto</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Identificación de objetos cotidianos
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.identificacion_objetos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      identificacion_objetos: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="font-bold">{formData.identificacion_objetos}</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formación de oraciones
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.formacion_oraciones}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      formacion_oraciones: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="font-bold">{formData.formacion_oraciones}</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pronunciación y articulación
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.pronunciacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pronunciacion: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="font-bold">{formData.pronunciacion}</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas_lenguaje}
                  onChange={(e) =>
                    setFormData({ ...formData, notas_lenguaje: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Observaciones específicas sobre lenguaje y vocabulario..."
                />
              </div>
            </div>
          </section>

          {/* Grafismo y Motricidad */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2. Grafismo y Motricidad Fina
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agarre del lápiz
                </label>
                <select
                  value={formData.agarre_lapiz}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      agarre_lapiz: e.target.value as 'adecuado' | 'inadecuado' | 'en_desarrollo',
                    })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="adecuado">Adecuado</option>
                  <option value="en_desarrollo">En desarrollo</option>
                  <option value="inadecuado">Inadecuado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de trazo
                </label>
                <select
                  value={formData.tipo_trazo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_trazo: e.target.value as 'firme' | 'tembloroso' | 'irregular',
                    })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="firme">Firme</option>
                  <option value="irregular">Irregular</option>
                  <option value="tembloroso">Tembloroso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Representación de figuras
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.representacion_figuras}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      representacion_figuras: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span className="font-bold">{formData.representacion_figuras}</span>
                  <span>5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas_grafismo}
                  onChange={(e) =>
                    setFormData({ ...formData, notas_grafismo: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Observaciones específicas sobre grafismo y motricidad..."
                />
              </div>
            </div>
          </section>

          {/* Conclusiones */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Conclusiones y Recomendaciones
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dificultades identificadas
                </label>
                <textarea
                  value={formData.dificultades_identificadas}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dificultades_identificadas: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Enumerar dificultades específicas detectadas..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fortalezas observadas
                </label>
                <textarea
                  value={formData.fortalezas}
                  onChange={(e) =>
                    setFormData({ ...formData, fortalezas: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Enumerar fortalezas y aspectos positivos..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de alfabetización estimado
                </label>
                <input
                  type="text"
                  value={formData.nivel_alfabetizacion}
                  onChange={(e) =>
                    setFormData({ ...formData, nivel_alfabetizacion: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Ej: Pre-silábico, Silábico, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones generales
                </label>
                <textarea
                  value={formData.observaciones_generales}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      observaciones_generales: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Contexto, comportamiento durante la evaluación, otros aspectos relevantes..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recomendaciones iniciales
                </label>
                <textarea
                  value={formData.recomendaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, recomendaciones: e.target.value })
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Recomendaciones para el plan de intervención..."
                  required
                />
              </div>
            </div>
          </section>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-crecimiento-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-crecimiento-600 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NuevaEvaluacionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500" />
      </div>
    }>
      <NuevaEvaluacionForm />
    </Suspense>
  );
}
