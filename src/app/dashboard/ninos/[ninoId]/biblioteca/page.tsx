'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Artefacto, TIPOS_ARTEFACTOS, TipoArtefacto } from '@/types/artifacts';

export default function BibliotecaNinoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ninoId = params.ninoId as string;

  const [nino, setNino] = useState<any>(null);
  const [artefactos, setArtefactos] = useState<Artefacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<TipoArtefacto | 'todos'>('todos');
  const [artefactoSeleccionado, setArtefactoSeleccionado] = useState<Artefacto | null>(null);

  useEffect(() => {
    fetchData();
  }, [ninoId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch niño
      const { data: ninoData, error: ninoError } = await supabase
        .from('ninos')
        .select('alias, rango_etario')
        .eq('id', ninoId)
        .single();

      if (ninoError) throw ninoError;
      setNino(ninoData);

      // Fetch artefactos
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/artifacts?nino_id=${ninoId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar artefactos');
      }

      const data = await response.json();
      setArtefactos(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const eliminarArtefacto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este artefacto?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/artifacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      alert('✅ Artefacto eliminado');
      fetchData();
      setArtefactoSeleccionado(null);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el artefacto');
    }
  };

  const artefactosFiltrados = filtroTipo === 'todos'
    ? artefactos
    : artefactos.filter(a => a.tipo === filtroTipo);

  const tiposDisponibles = Array.from(new Set(artefactos.map(a => a.tipo)));

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href={`/dashboard/ninos/${ninoId}`} className="text-crecimiento-600 font-medium min-h-[44px] flex items-center">
              ← Volver
            </Link>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2 justify-center">
                <svg className="w-5 h-5 text-crecimiento-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Biblioteca Personal
              </h1>
              {nino && (
                <p className="text-xs text-gray-500">{nino.alias} • {nino.rango_etario}</p>
              )}
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por tipo:</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filtroTipo === 'todos'
                  ? 'bg-crecimiento-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({artefactos.length})
            </button>
            {tiposDisponibles.map((tipo) => {
              const tipoInfo = TIPOS_ARTEFACTOS[tipo as TipoArtefacto];
              const count = artefactos.filter(a => a.tipo === tipo).length;
              return (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo as TipoArtefacto)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filtroTipo === tipo
                      ? 'bg-crecimiento-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tipoInfo.nombre} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de artefactos */}
        {artefactosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay artefactos guardados</h3>
            <p className="text-gray-500 mb-4">
              Generá análisis desde la página de análisis con IA y guardalos aquí.
            </p>
            <Link
              href={`/dashboard/ninos/${ninoId}/analisis`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ir a Análisis con IA
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artefactosFiltrados.map((artefacto) => {
              const tipoInfo = TIPOS_ARTEFACTOS[artefacto.tipo];
              return (
                <div
                  key={artefacto.id}
                  onClick={() => setArtefactoSeleccionado(artefacto)}
                  className="bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-crecimiento-400 hover:shadow-md transition-all cursor-pointer p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <svg className={`w-6 h-6 text-${tipoInfo.color}-600 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tipoInfo.icono} />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold text-${tipoInfo.color}-600 uppercase`}>
                        {tipoInfo.nombre}
                      </span>
                      <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">
                        {artefacto.titulo}
                      </h3>
                    </div>
                  </div>
                  
                  {artefacto.descripcion && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {artefacto.descripcion}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-400">
                    {new Date(artefacto.created_at).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de vista detallada */}
      {artefactoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setArtefactoSeleccionado(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-crecimiento-600 text-white p-4 flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1">{artefactoSeleccionado.titulo}</h2>
                <p className="text-sm text-crecimiento-100">
                  {TIPOS_ARTEFACTOS[artefactoSeleccionado.tipo].nombre} • {' '}
                  {new Date(artefactoSeleccionado.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <button
                onClick={() => setArtefactoSeleccionado(null)}
                className="text-white hover:bg-crecimiento-700 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(artefactoSeleccionado.contenido as any).texto || JSON.stringify(artefactoSeleccionado.contenido, null, 2)}
                </ReactMarkdown>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => eliminarArtefacto(artefactoSeleccionado.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
              <button
                onClick={() => setArtefactoSeleccionado(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
