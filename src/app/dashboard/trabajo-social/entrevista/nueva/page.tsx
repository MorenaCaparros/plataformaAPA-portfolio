'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SelectorNino from '@/components/forms/SelectorNino';
import MeetingRecorder from '@/components/forms/MeetingRecorder';
import type { MeetingRecordingResult } from '@/components/forms/MeetingRecorder';
import type { ConsentimientoData } from '@/components/forms/ConsentimientoGrabacionModal';

export default function NuevaEntrevistaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [ninoId, setNinoId] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState('');
  const [duracionGrabacion, setDuracionGrabacion] = useState(0);
  const [consentimientoGrabacion, setConsentimientoGrabacion] = useState<ConsentimientoData | null>(null);

  const [formData, setFormData] = useState({
    // Básicos
    tipo_entrevista: 'inicial' as 'inicial' | 'seguimiento' | 'urgencia',
    lugar_entrevista: '',
    personas_presentes: [{ nombre: '', relacion: '', edad: undefined as number | undefined }],

    // Embarazo y primeros años
    alimentacion_embarazo: '',
    controles_prenatales: true,
    complicaciones_embarazo: '',

    // Alimentación actual
    alimentacion_actual: '',
    comidas_diarias: 3,
    calidad_alimentacion: 'regular' as 'buena' | 'regular' | 'deficiente',
    notas_alimentacion: '',

    // Escolaridad
    asiste_escuela: true,
    nombre_escuela: '',
    grado_actual: '',
    asistencia_regular: true,
    dificultades_escolares: '',

    // Vivienda
    tipo_vivienda: 'casa' as 'casa' | 'departamento' | 'precaria' | 'otro',
    vivienda_propia: false,
    ambientes: 2,
    agua: true,
    luz: true,
    gas: false,
    cloacas: false,
    condiciones_vivienda: 'regulares' as 'buenas' | 'regulares' | 'malas',

    // Económico
    trabajo_padre: '',
    trabajo_madre: '',
    ingresos_aproximados: 'bajos' as 'muy_bajos' | 'bajos' | 'medios' | 'adecuados',
    recibe_ayuda_social: false,
    tipo_ayuda: '',

    // Salud
    obra_social: false,
    cual_obra_social: '',
    controles_salud_regulares: false,
    medicacion_actual: '',
    diagnosticos_previos: '',

    // Observaciones
    observaciones: '',
    situacion_riesgo: false,
    tipo_riesgo: '',
    derivaciones_sugeridas: '',
    prioridad_atencion: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    proxima_visita: '',
    acciones_pendientes: '',
  });

  const handleRecordingComplete = (result: MeetingRecordingResult) => {
    setAudioBlob(result.audioBlob);
    setTranscripcion(result.transcripcion);
    setDuracionGrabacion(result.duracionSegundos);
    setConsentimientoGrabacion(result.consentimiento);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!ninoId) {
        alert('⚠️ Por favor seleccioná un niño primero');
        return;
      }

      let audioUrl = null;

      // 1. Subir audio si existe
      if (audioBlob) {
        const audioFormData = new FormData();
        audioFormData.append('audio', audioBlob, 'entrevista.webm');
        audioFormData.append('nino_id', ninoId);

        const audioResponse = await fetch('/api/trabajo-social/audio', {
          method: 'POST',
          body: audioFormData,
        });

        const audioResult = await audioResponse.json();

        if (!audioResponse.ok) {
          throw new Error(audioResult.error || 'Error al subir el audio');
        }

        audioUrl = audioResult.audio_url;
      }

      // 2. Guardar entrevista
      const response = await fetch('/api/trabajo-social/entrevistas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nino_id: ninoId,
          ...formData,
          audio_url: audioUrl,
          transcripcion: transcripcion.trim() || null,
          duracion_grabacion: duracionGrabacion,
          created_offline: !navigator.onLine,
          consentimiento_grabacion: consentimientoGrabacion || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar la entrevista');
      }

      alert('✅ Entrevista guardada correctamente');
      router.push('/dashboard/trabajo-social/entrevistas');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Error al guardar la entrevista'
      );
    } finally {
      setLoading(false);
    }
  };

  const addPersona = () => {
    setFormData({
      ...formData,
      personas_presentes: [
        ...formData.personas_presentes,
        { nombre: '', relacion: '', edad: undefined },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nueva Entrevista Familiar
          </h1>
          <p className="text-gray-600">
            Registro inicial de contexto sociofamiliar del niño
          </p>
        </div>

        {/* Grabación de audio con transcripción */}
        <div className="mb-6">
          <MeetingRecorder
            onRecordingComplete={handleRecordingComplete}
            onTranscripcionChange={setTranscripcion}
            disabled={loading}
          />
        </div>

        {/* Selector de Niño */}
        <SelectorNino onSelect={setNinoId} />

        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información Básica
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de entrevista
                  </label>
                  <select
                    value={formData.tipo_entrevista}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_entrevista: e.target.value as 'inicial' | 'seguimiento' | 'urgencia',
                      })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  >
                    <option value="inicial">Inicial</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="urgencia">Urgencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lugar de entrevista
                  </label>
                  <input
                    type="text"
                    value={formData.lugar_entrevista}
                    onChange={(e) =>
                      setFormData({ ...formData, lugar_entrevista: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="Ej: Hogar, Centro, Escuela"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personas presentes en la entrevista
                </label>
                {formData.personas_presentes.map((persona, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      value={persona.nombre}
                      onChange={(e) => {
                        const nuevas = [...formData.personas_presentes];
                        nuevas[index].nombre = e.target.value;
                        setFormData({ ...formData, personas_presentes: nuevas });
                      }}
                      placeholder="Nombre"
                      className="border border-gray-300 rounded-md p-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={persona.relacion}
                      onChange={(e) => {
                        const nuevas = [...formData.personas_presentes];
                        nuevas[index].relacion = e.target.value;
                        setFormData({ ...formData, personas_presentes: nuevas });
                      }}
                      placeholder="Relación (Madre, Padre, Tutor)"
                      className="border border-gray-300 rounded-md p-2 text-sm"
                      required
                    />
                    <input
                      type="number"
                      value={persona.edad || ''}
                      onChange={(e) => {
                        const nuevas = [...formData.personas_presentes];
                        nuevas[index].edad = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        setFormData({ ...formData, personas_presentes: nuevas });
                      }}
                      placeholder="Edad"
                      className="border border-gray-300 rounded-md p-2 text-sm"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPersona}
                  className="text-sm text-crecimiento-600 hover:text-crecimiento-700 font-medium"
                >
                  + Agregar persona
                </button>
              </div>
            </div>
          </section>

          {/* Embarazo y primeros años */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Embarazo y Primeros Años
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alimentación durante el embarazo
                </label>
                <textarea
                  value={formData.alimentacion_embarazo}
                  onChange={(e) =>
                    setFormData({ ...formData, alimentacion_embarazo: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Describir calidad de alimentación, acceso a nutrientes, etc."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="controles_prenatales"
                  checked={formData.controles_prenatales}
                  onChange={(e) =>
                    setFormData({ ...formData, controles_prenatales: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="controles_prenatales" className="text-sm text-gray-700">
                  Realizó controles prenatales regulares
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complicaciones durante el embarazo (si las hubo)
                </label>
                <textarea
                  value={formData.complicaciones_embarazo}
                  onChange={(e) =>
                    setFormData({ ...formData, complicaciones_embarazo: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>

          {/* Alimentación actual */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Alimentación Actual del Niño
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de comidas diarias
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.comidas_diarias}
                    onChange={(e) =>
                      setFormData({ ...formData, comidas_diarias: Number(e.target.value) })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calidad de alimentación
                  </label>
                  <select
                    value={formData.calidad_alimentacion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        calidad_alimentacion: e.target.value as
                          | 'buena'
                          | 'regular'
                          | 'deficiente',
                      })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  >
                    <option value="buena">Buena</option>
                    <option value="regular">Regular</option>
                    <option value="deficiente">Deficiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de alimentación típica
                </label>
                <textarea
                  value={formData.alimentacion_actual}
                  onChange={(e) =>
                    setFormData({ ...formData, alimentacion_actual: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Qué come habitualmente, si incluye frutas, verduras, proteínas, etc."
                  required
                />
              </div>
            </div>
          </section>

          {/* Botones */}
          <div className="flex gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg">
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
              className="flex-1 bg-crecimiento-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-crecimiento-600 transition-colors disabled:bg-gray-400 text-center"
            >
              {loading ? 'Guardando...' : '💾 Guardar Entrevista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
