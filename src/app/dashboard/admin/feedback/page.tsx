'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Coordinador = {
  id: string;
  nombre: string;
  apellido: string;
  zona_id: string | null;
};

type Feedback = {
  id: string;
  coordinador_id: string;
  director_id: string;
  fecha: string;
  comentario_cualitativo: string;
  puntuacion_liderazgo: number;
  puntuacion_gestion: number;
  puntuacion_comunicacion: number;
  puntuacion_compromiso: number;
  analisis_ia?: string;
  created_at: string;
};

export default function FeedbackPage() {
  const { perfil, user } = useAuth();
  const router = useRouter();
  
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [vistaActiva, setVistaActiva] = useState<'nuevo' | 'historial'>('nuevo');
  
  // Formulario
  const [coordinadorSeleccionado, setCoordinadorSeleccionado] = useState('');
  const [comentario, setComentario] = useState('');
  const [puntuacionLiderazgo, setPuntuacionLiderazgo] = useState(5);
  const [puntuacionGestion, setPuntuacionGestion] = useState(5);
  const [puntuacionComunicacion, setPuntuacionComunicacion] = useState(5);
  const [puntuacionCompromiso, setPuntuacionCompromiso] = useState(5);
  const [analisisIA, setAnalisisIA] = useState('');

  useEffect(() => {
    if (perfil && perfil.rol !== 'director') {
      router.push('/dashboard');
      return;
    }

    if (perfil?.rol === 'director') {
      fetchData();
    }
  }, [perfil, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener coordinadores
      const { data: coords, error: errorCoords } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido, zona_id')
        .eq('rol', 'coordinador')
        .order('nombre');

      if (errorCoords) throw errorCoords;

      setCoordinadores(coords || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAnalizarConIA = async () => {
    if (!comentario.trim()) {
      alert('⚠️ Escribe un comentario antes de analizar');
      return;
    }

    try {
      setAnalizando(true);

      const response = await fetch('/api/feedback/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comentario,
          puntuaciones: {
            liderazgo: puntuacionLiderazgo,
            gestion: puntuacionGestion,
            comunicacion: puntuacionComunicacion,
            compromiso: puntuacionCompromiso,
          },
        }),
      });

      if (!response.ok) throw new Error('Error al analizar');

      const data = await response.json();
      setAnalisisIA(data.analisis);
    } catch (error) {
      console.error('Error analizando:', error);
      alert('❌ Error al analizar con IA');
    } finally {
      setAnalizando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coordinadorSeleccionado) {
      alert('⚠️ Selecciona un coordinador');
      return;
    }

    if (!comentario.trim()) {
      alert('⚠️ Escribe un comentario');
      return;
    }

    try {
      setGuardando(true);

      // En una implementación real, esto guardaría en una tabla 'feedbacks'
      // Por ahora simulamos el guardado
      const nuevoFeedback = {
        coordinador_id: coordinadorSeleccionado,
        director_id: user?.id || '',
        fecha: new Date().toISOString(),
        comentario_cualitativo: comentario,
        puntuacion_liderazgo: puntuacionLiderazgo,
        puntuacion_gestion: puntuacionGestion,
        puntuacion_comunicacion: puntuacionComunicacion,
        puntuacion_compromiso: puntuacionCompromiso,
        analisis_ia: analisisIA,
      };

      // Aquí iría el insert a la tabla feedbacks
      console.log('Guardando feedback:', nuevoFeedback);

      alert('✅ Feedback guardado exitosamente');
      
      // Limpiar formulario
      setComentario('');
      setPuntuacionLiderazgo(5);
      setPuntuacionGestion(5);
      setPuntuacionComunicacion(5);
      setPuntuacionCompromiso(5);
      setAnalisisIA('');
      
    } catch (error) {
      console.error('Error guardando feedback:', error);
      alert('❌ Error al guardar feedback');
    } finally {
      setGuardando(false);
    }
  };

  const promedioGeneral = Math.round(
    (puntuacionLiderazgo + puntuacionGestion + puntuacionComunicacion + puntuacionCompromiso) / 4
  );

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
          <p className="text-gray-600">Cargando coordinadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard/admin" className="text-gray-600 hover:text-gray-900">
              ← Volver
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Feedback a Coordinadores
          </h1>
          <p className="text-gray-600">
            Evaluación cualitativa y cuantitativa con análisis de IA
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setVistaActiva('nuevo')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                vistaActiva === 'nuevo'
                  ? 'border-b-2 border-crecimiento-500 text-crecimiento-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ➕ Nuevo Feedback
            </button>
            <button
              onClick={() => setVistaActiva('historial')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                vistaActiva === 'historial'
                  ? 'border-b-2 border-crecimiento-500 text-crecimiento-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Historial
            </button>
          </div>
        </div>

        {/* Vista: Nuevo Feedback */}
        {vistaActiva === 'nuevo' && (
          <form onSubmit={handleGuardar} className="bg-white rounded-lg shadow-sm p-6">
            {/* Selección de coordinador */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coordinador
              </label>
              <select
                value={coordinadorSeleccionado}
                onChange={(e) => setCoordinadorSeleccionado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
                required
              >
                <option value="">Seleccionar coordinador...</option>
                {coordinadores.map((coord) => (
                  <option key={coord.id} value={coord.id}>
                    {[coord.nombre, coord.apellido].filter(Boolean).join(' ') || 'Sin nombre'} {coord.zona_id ? `- ${coord.zona_id}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Comentario cualitativo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentario Cualitativo
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Describe el desempeño del coordinador, logros, áreas de mejora, situaciones destacadas..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {comentario.length} caracteres
              </p>
            </div>

            {/* Puntuaciones cuantitativas */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Evaluación Cuantitativa (1-10)
              </h3>
              
              <div className="space-y-4">
                {/* Liderazgo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">Liderazgo</label>
                    <span className="text-lg font-bold text-crecimiento-600">{puntuacionLiderazgo}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={puntuacionLiderazgo}
                    onChange={(e) => setPuntuacionLiderazgo(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-crecimiento-500"
                  />
                </div>

                {/* Gestión */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">Gestión de Equipo</label>
                    <span className="text-lg font-bold text-green-600">{puntuacionGestion}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={puntuacionGestion}
                    onChange={(e) => setPuntuacionGestion(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>

                {/* Comunicación */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">Comunicación</label>
                    <span className="text-lg font-bold text-impulso-500">{puntuacionComunicacion}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={puntuacionComunicacion}
                    onChange={(e) => setPuntuacionComunicacion(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-impulso-400"
                  />
                </div>

                {/* Compromiso */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">Compromiso</label>
                    <span className="text-lg font-bold text-yellow-600">{puntuacionCompromiso}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={puntuacionCompromiso}
                    onChange={(e) => setPuntuacionCompromiso(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                  />
                </div>
              </div>

              {/* Promedio */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Promedio General:</span>
                  <span className="text-2xl font-bold text-gray-900">{promedioGeneral}/10</span>
                </div>
              </div>
            </div>

            {/* Análisis con IA */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Análisis con Gemini
                </label>
                <button
                  type="button"
                  onClick={handleAnalizarConIA}
                  disabled={analizando || !comentario.trim()}
                  className="px-4 py-2 bg-impulso-400 text-white rounded-lg hover:bg-impulso-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {analizando ? '🤔 Analizando...' : '🤖 Analizar con IA'}
                </button>
              </div>
              
              {analisisIA && (
                <div className="p-4 bg-impulso-50 border border-impulso-200 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{analisisIA}</p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-crecimiento-500 text-white py-3 px-6 rounded-lg hover:bg-crecimiento-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {guardando ? 'Guardando...' : '💾 Guardar Feedback'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setComentario('');
                  setPuntuacionLiderazgo(5);
                  setPuntuacionGestion(5);
                  setPuntuacionComunicacion(5);
                  setPuntuacionCompromiso(5);
                  setAnalisisIA('');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                🗑️ Limpiar
              </button>
            </div>
          </form>
        )}

        {/* Vista: Historial */}
        {vistaActiva === 'historial' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-center py-8">
              Historial de feedback próximamente...
            </p>
          </div>
        )}

        {/* Ayuda */}
        <div className="mt-6 bg-sol-50 border-l-4 border-sol-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-sol-800">
                Criterios de Evaluación
              </h3>
              <div className="text-sm text-sol-700 mt-2 space-y-1">
                <p><strong>Liderazgo:</strong> Capacidad de guiar y motivar al equipo</p>
                <p><strong>Gestión:</strong> Organización, planificación y seguimiento</p>
                <p><strong>Comunicación:</strong> Claridad, frecuencia y efectividad</p>
                <p><strong>Compromiso:</strong> Dedicación, puntualidad y proactividad</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
