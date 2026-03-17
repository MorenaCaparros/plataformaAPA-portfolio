'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function SubirDocumentoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    tipo: 'guia' as 'paper' | 'guia' | 'manual',
    descripcion: '',
    tags: ''
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // TODO: Extraer metadata automáticamente cuando se resuelva incompatibilidad con pdf-parse
      // Por ahora, el título/autor se extraerán al procesar el documento
      setProgress('✓ Archivo seleccionado. El título/autor se detectarán automáticamente al procesar.');
      setTimeout(() => setProgress(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Seleccioná un archivo');
      return;
    }

    if (!formData.tipo) {
      alert('Seleccioná el tipo de documento');
      return;
    }

    setUploading(true);
    setProgressPercent(0);
    setProgress('📤 Subiendo archivo...');

    try {
      // Crear FormData
      const data = new FormData();
      data.append('file', file);
      data.append('titulo', formData.titulo);
      data.append('autor', formData.autor);
      data.append('tipo', formData.tipo);
      data.append('descripcion', formData.descripcion);
      // Tags manuales opcionales (si el usuario los ingresó, se usan; si no, la IA los genera sola)
      if (formData.tags.trim()) {
        data.append('tags', formData.tags);
      }

      // Simular progreso inicial
      setProgressPercent(10);
      await new Promise(resolve => setTimeout(resolve, 300));

      setProgress('🔍 Extrayendo texto del documento...');
      setProgressPercent(20);
      
      // Simular extracción de texto
      const extractInterval = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 2, 40));
      }, 200);

      // Enviar al servidor para procesamiento
      const response = await fetch('/api/documentos/procesar', {
        method: 'POST',
        body: data
      });

      clearInterval(extractInterval);

      // Simular progreso durante generación de embeddings
      setProgress('🧠 Generando embeddings con IA...');
      setProgressPercent(50);
      
      const embeddingInterval = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 3, 85));
      }, 300);

      if (!response.ok) {
        clearInterval(embeddingInterval);
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar documento');
      }

      clearInterval(embeddingInterval);
      const result = await response.json();
      
      setProgress('💾 Guardando en base de datos...');
      setProgressPercent(90);
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress(`✅ Completo: ${result.documento.chunks_procesados} fragmentos indexados`);
      setProgressPercent(100);
      
      setTimeout(() => {
        router.push('/dashboard/biblioteca');
      }, 1500);
    } catch (error: any) {
      console.error('Error:', error);
      setProgress('❌ Error al procesar');
      setProgressPercent(0);
      alert('Error al procesar documento: ' + error.message);
    } finally {
      setTimeout(() => {
        if (progressPercent !== 100) {
          setUploading(false);
          setProgressPercent(0);
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/dashboard/biblioteca" className="text-crecimiento-600 font-medium">
              ← Volver
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Subir Documento</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del documento (opcional)
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                placeholder="Si no completás, se usa el nombre del archivo"
              />
            </div>

            {/* Autor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Autor(es) (opcional)
              </label>
              <input
                type="text"
                value={formData.autor}
                onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                placeholder="Si no lo completás, quedará como 'Autor no especificado'"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de documento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
              >
                <option value="guia">Guía práctica</option>
                <option value="paper">Paper / Investigación</option>
                <option value="manual">Manual / Libro</option>
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción breve (opcional)
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                placeholder="Breve resumen del contenido..."
              />
            </div>

            {/* Tags manuales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags / palabras clave (opcional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Separalas con coma. Si las dejás vacías, la IA las genera automáticamente al finalizar el procesamiento.
              </p>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                placeholder="ej: lectura, fonemas, dislexia, escritura..."
              />
              {/* Preview de tags */}
              {formData.tags.trim() && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 1).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-crecimiento-100 text-crecimiento-800 border border-crecimiento-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo (PDF, DOCX o TXT) *
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                required
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                💡 El título y autor se detectarán automáticamente al procesar
              </p>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="bg-sol-50 border border-sol-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sol-800 text-sm font-medium flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {progress}
                  </p>
                  <span className="text-sol-700 font-bold text-sm">
                    {progressPercent}%
                  </span>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full bg-sol-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-crecimiento-500 to-crecimiento-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="w-full h-full bg-white/30 animate-pulse"></div>
                  </div>
                </div>

                {progressPercent === 100 && (
                  <p className="text-green-700 text-xs text-center">
                    ✅ Redirigiendo a la biblioteca...
                  </p>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={uploading}
                className="w-full sm:flex-1 px-6 py-3 min-h-[48px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full sm:flex-1 px-6 py-3 min-h-[48px] bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {uploading ? 'Procesando...' : '✓ Subir y Procesar'}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 bg-sol-50 border border-sol-200 rounded-lg p-4">
          <h3 className="font-medium text-sol-900 mb-2">ℹ️ Importante</h3>
          <ul className="text-sm text-sol-800 space-y-1">
            <li>• El procesamiento puede tardar unos minutos según el tamaño del documento</li>
            <li>• El texto será indexado con IA para búsquedas semánticas</li>
            <li>• Archivos soportados: PDF, DOCX, TXT (máximo 10MB)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
