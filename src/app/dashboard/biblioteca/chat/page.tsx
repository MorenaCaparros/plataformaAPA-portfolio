'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fuentes?: Array<{ titulo: string; autor: string }>;
  totalDocumentos?: number;
  filtradoPorTags?: string[] | null;
}

const TAG_COLORS = [
  'bg-sol-100 text-sol-800 border-sol-200',
  'bg-crecimiento-100 text-crecimiento-800 border-crecimiento-200',
  'bg-impulso-100 text-impulso-800 border-impulso-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-orange-100 text-orange-800 border-orange-200',
];
function tagColor(tag: string) {
  return TAG_COLORS[tag.charCodeAt(0) % TAG_COLORS.length];
}

export default function ChatBibliotecaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de la Biblioteca Psicopedagógica. Podés preguntarme sobre los documentos disponibles y te responderé con referencias exactas.\n\n💡 **Tip:** Filtrá por tags para obtener respuestas más precisas y ahorrar tokens de IA. ¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tags disponibles en la biblioteca
  const [todosLosTags, setTodosLosTags] = useState<string[]>([]);
  const [tagsSeleccionados, setTagsSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Cargar todos los tags únicos de la biblioteca
    supabase
      .from('documentos')
      .select('tags')
      .then(({ data }: { data: Array<{ tags: string[] | null }> | null }) => {
        if (data) {
          const todos = [...new Set(data.flatMap((d: any) => d.tags || []))].sort();
          setTodosLosTags(todos as string[]);
        }
      });
  }, []);

  const toggleTag = (tag: string) => {
    setTagsSeleccionados((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input + (tagsSeleccionados.length > 0 ? `\n\n_[Filtrado por tags: ${tagsSeleccionados.join(', ')}]_` : ''),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta: input,
          tipo: 'biblioteca',
          tags: tagsSeleccionados.length > 0 ? tagsSeleccionados : undefined
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
        timestamp: new Date(),
        fuentes: data.fuentes || [],
        totalDocumentos: data.totalDocumentos,
        filtradoPorTags: data.filtradoPorTags
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Hubo un error al procesar tu pregunta. Por favor intentá de nuevo.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/dashboard/biblioteca" className="text-crecimiento-600 font-medium">
              ← Volver a Biblioteca
            </Link>
            <h1 className="text-lg font-bold text-gray-900">💬 Chat con Documentos</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      {/* Tag filter bar */}
      {todosLosTags.length > 0 && (
        <div className="bg-white border-b border-gray-100 py-2 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium shrink-0">
                🏷️ Filtrar por tema:
              </span>
              {todosLosTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    tagsSeleccionados.includes(tag)
                      ? tagColor(tag) + ' ring-2 ring-offset-1 ring-gray-400 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tagsSeleccionados.includes(tag) ? '✓ ' : ''}{tag}
                </button>
              ))}
              {tagsSeleccionados.length > 0 && (
                <button
                  onClick={() => setTagsSeleccionados([])}
                  className="text-xs text-gray-400 hover:text-gray-700 underline ml-1"
                >
                  limpiar
                </button>
              )}
            </div>
            {tagsSeleccionados.length > 0 && (
              <p className="text-xs text-crecimiento-700 mt-1 font-medium">
                ⚡ Modo enfocado activo — la IA solo consultará documentos con tags: <b>{tagsSeleccionados.join(', ')}</b> (ahorra tokens)
              </p>
            )}
          </div>
        </div>
      )}

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
                      <div className="w-8 h-8 rounded-full bg-crecimiento-600 flex items-center justify-center text-white font-bold text-sm">U</div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xl">🧠</div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Fuentes */}
                    {message.role === 'assistant' && message.fuentes && message.fuentes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-1">📚 Fuentes consultadas:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {message.fuentes.map((fuente, idx) => (
                            <li key={idx}>• {fuente.titulo} — {fuente.autor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Info del contexto */}
                    {message.role === 'assistant' && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {message.totalDocumentos !== undefined && (
                          <span className="text-xs text-gray-400">
                            💡 {message.totalDocumentos} doc{message.totalDocumentos !== 1 ? 's' : ''} consultado{message.totalDocumentos !== 1 ? 's' : ''}
                          </span>
                        )}
                        {message.filtradoPorTags && message.filtradoPorTags.length > 0 && (
                          <span className="text-xs text-crecimiento-600 font-medium">
                            ⚡ Filtrado por: {message.filtradoPorTags.join(', ')}
                          </span>
                        )}
                      </div>
                    )}

                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-crecimiento-100' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
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
                  <span className="text-2xl">🧠</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Preguntas sugeridas */}
          {messages.length === 1 && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-2 font-medium">💡 Preguntas sugeridas:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  '¿Qué documentos hay en la biblioteca?',
                  '¿Qué estrategias hay para trabajar la alfabetización?',
                  '¿Cómo identificar dificultades de aprendizaje?',
                  '¿Qué actividades recomiendan para niños de 8-10 años?'
                ].map((pregunta) => (
                  <button
                    key={pregunta}
                    onClick={() => setInput(pregunta)}
                    className="text-left px-3 py-2 text-xs sm:text-sm bg-sol-50 text-sol-700 rounded-lg hover:bg-sol-100 transition border border-sol-200"
                  >
                    {pregunta}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tagsSeleccionados.length > 0
                ? `Preguntá sobre: ${tagsSeleccionados.join(', ')}...`
                : 'Preguntá sobre los documentos...'}
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
            {tagsSeleccionados.length > 0
              ? `⚡ Modo enfocado: solo busca en documentos con tags [${tagsSeleccionados.join(', ')}] — menos tokens, más precisión`
              : '📚 El asistente conoce todos los documentos de la biblioteca y cita las fuentes'}
          </p>
        </div>
      </div>
    </div>
  );
}
