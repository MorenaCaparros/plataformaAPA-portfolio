'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TipoArtefacto, TIPOS_ARTEFACTOS } from '@/types/artifacts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Nino {
  alias: string;
  rango_etario: string;
  nivel_alfabetizacion: string;
}

export default function AnalisisNinoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ninoId = params.ninoId as string;

  const [nino, setNino] = useState<Nino | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hola! Soy tu asistente de análisis psicopedagógico. Puedo generar diferentes tipos de análisis basándome en las sesiones del niño y la bibliografía especializada. Elegí un tipo de análisis o haceme una pregunta específica.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNino, setLoadingNino] = useState(true);
  const [mostrarSelector, setMostrarSelector] = useState(true);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoArtefacto | null>(null);
  const [guardandoArtefacto, setGuardandoArtefacto] = useState(false);
  const [ultimoArtefacto, setUltimoArtefacto] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNino();
  }, [ninoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchNino = async () => {
    try {
      const { data, error } = await supabase
        .from('ninos')
        .select('alias, rango_etario, nivel_alfabetizacion')
        .eq('id', ninoId)
        .single();

      if (error) throw error;
      setNino(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos del niño');
      router.back();
    } finally {
      setLoadingNino(false);
    }
  };

  const generarArtefacto = async (tipo: TipoArtefacto) => {
    setTipoSeleccionado(tipo);
    setMostrarSelector(false);
    
    const tipoInfo = TIPOS_ARTEFACTOS[tipo];
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Genera un ${tipoInfo.nombre}`,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const prompt = getPromptParaTipo(tipo);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pregunta: prompt,
          tipo: 'analisis',
          ninoId: ninoId,
          tipoArtefacto: tipo
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar el análisis');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.respuesta,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUltimoArtefacto({ tipo, contenido: data.respuesta });
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo un error al generar el análisis. Por favor intentá de nuevo.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setMostrarSelector(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pregunta: input,
          tipo: 'analisis',
          ninoId: ninoId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar la pregunta');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.respuesta,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUltimoArtefacto(null); // Pregunta libre no guarda artefacto
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo un error al procesar tu pregunta. Por favor intentá de nuevo.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const guardarArtefacto = async () => {
    if (!ultimoArtefacto || !user) return;

    setGuardandoArtefacto(true);
    try {
      const tipoInfo = TIPOS_ARTEFACTOS[ultimoArtefacto.tipo as TipoArtefacto];
      
      // Obtener session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/artifacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nino_id: ninoId,
          tipo: ultimoArtefacto.tipo,
          titulo: `${tipoInfo.nombre} - ${new Date().toLocaleDateString('es-AR')}`,
          descripcion: `Generado automáticamente por IA`,
          contenido: {
            tipo: ultimoArtefacto.tipo,
            texto: ultimoArtefacto.contenido,
            generado_at: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      alert('✅ Artefacto guardado en la biblioteca del niño');
      setUltimoArtefacto(null);
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error al guardar el artefacto: ${error.message}`);
    } finally {
      setGuardandoArtefacto(false);
    }
  };

  const getPromptParaTipo = (tipo: TipoArtefacto): string => {
    const prompts: Record<TipoArtefacto, string> = {
      informe: 'Genera un informe psicopedagógico completo y estructurado con las siguientes secciones: 1) Datos de identificación, 2) Motivo del análisis, 3) Observaciones generales, 4) Áreas evaluadas (lectura, escritura, matemática, conducta), 5) Fortalezas identificadas, 6) Dificultades observadas, 7) Recomendaciones pedagógicas, 8) Conclusiones. Basate en las sesiones registradas y cita bibliografía cuando sea relevante.',
      
      tarjetas: 'Crea 8-10 tarjetas didácticas (flashcards) para reforzar los conceptos clave que el niño está aprendiendo. Cada tarjeta debe tener: FRENTE: una pregunta o concepto, DORSO: la respuesta o explicación clara. Enfócate en las áreas donde el niño necesita más práctica según las sesiones.',
      
      cuestionario: 'Diseña un cuestionario de 8-10 preguntas para evaluar la comprensión del niño en las áreas trabajadas. Incluye: preguntas de opción múltiple, verdadero/falso, y algunas abiertas. Para cada pregunta indica la respuesta correcta y una breve explicación pedagógica.',
      
      tabla: 'Crea una tabla comparativa que muestre la evolución del niño a lo largo del tiempo en diferentes áreas: lectura, escritura, matemática, atención, conducta. Usa las sesiones registradas para llenar los datos. Incluye columnas para: área, nivel inicial, nivel actual, progreso, y observaciones.',
      
      resumen: 'Genera un resumen ejecutivo con: 1) Puntos clave del progreso (3-5 bullets), 2) Conclusiones principales, 3) Recomendaciones prioritarias (3-4). Sé conciso pero completo.',
      
      mapa_mental: 'Esta funcionalidad estará disponible próximamente.',
      infografia: 'Esta funcionalidad estará disponible próximamente.',
      presentacion: 'Esta funcionalidad estará disponible próximamente.'
    };

    return prompts[tipo];
  };

  const sugerenciasPregunta = [
    "¿Cómo ha evolucionado su nivel de lectura?",
    "¿Qué patrones de frustración se observan?",
    "¿En qué áreas muestra más fortalezas?",
    "¿Qué estrategias recomiendas para mejorar su atención?",
    "Resume el progreso de las últimas sesiones"
  ];

  if (loadingNino) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/dashboard/ninos" className="text-crecimiento-600 font-medium min-h-[44px] flex items-center">
              ← Volver a Niños
            </Link>
            <div className="text-center flex items-center gap-2 justify-center">
              <svg className="w-5 h-5 text-crecimiento-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900">Análisis con IA</h1>
                {nino && (
                  <p className="text-xs text-gray-500">{nino.alias} • {nino.rango_etario}</p>
                )}
              </div>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-3xl rounded-lg px-3 sm:px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-crecimiento-500 text-white'
                    : 'bg-white shadow-sm border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-crecimiento-500 flex items-center justify-center text-white font-bold">
                        U
                      </div>
                    ) : (
                      <svg className="w-8 h-8 text-crecimiento-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-crecimiento-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-crecimiento-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selector de tipos de artefactos */}
          {mostrarSelector && messages.length === 1 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-sol-50 to-crecimiento-50 border border-sol-200 rounded-lg p-4">
                <h3 className="font-semibold text-sol-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Tipos de Análisis Disponibles
                </h3>
                <p className="text-sm text-sol-700 mb-4">
                  Seleccioná el tipo de análisis que querés generar:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.values(TIPOS_ARTEFACTOS).filter(t => 
                    ['informe', 'tarjetas', 'cuestionario', 'tabla', 'resumen'].includes(t.tipo)
                  ).map((tipoInfo) => (
                    <button
                      key={tipoInfo.tipo}
                      onClick={() => generarArtefacto(tipoInfo.tipo)}
                      disabled={loading}
                      className={`p-4 bg-white rounded-lg border-2 border-${tipoInfo.color}-200 hover:border-${tipoInfo.color}-400 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group`}
                    >
                      <div className="flex items-start gap-3">
                        <svg className={`w-6 h-6 text-${tipoInfo.color}-600 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tipoInfo.icono} />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-${tipoInfo.color}-900 text-sm group-hover:text-${tipoInfo.color}-700`}>
                            {tipoInfo.nombre}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {tipoInfo.descripcion}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-sol-50 border border-sol-200 rounded-lg p-4">
                <h3 className="font-semibold text-sol-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  O hacé una pregunta específica:
                </h3>
                <div className="space-y-2">
                  {sugerenciasPregunta.map((pregunta, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(pregunta)}
                      className="block w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-sol-100 transition text-sm text-gray-700"
                    >
                      {pregunta}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botón para guardar artefacto */}
          {ultimoArtefacto && !guardandoArtefacto && (
            <div className="flex justify-center">
              <button
                onClick={guardarArtefacto}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar en Biblioteca del Niño
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntá sobre el progreso del niño..."
              className="flex-1 px-3 sm:px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 sm:px-6 py-3 min-h-[48px] bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-2 hidden sm:block">
            💡 El asistente analizará las sesiones del niño y consultará la biblioteca psicopedagógica
          </p>
        </div>
      </div>
    </div>
  );
}
