'use client';

import { useState } from 'react';
import { Mic, ChevronUp, ChevronDown, Volume2, FileText } from 'lucide-react';
import { Spinner } from '@/components/ui/LoadingScreen';

// ─── Tipo ─────────────────────────────────────────────────────────────────────

export interface GrabacionReunion {
  id: string;
  storage_path: string;
  transcripcion: string | null;
  duracion_segundos: number | null;
  fecha_grabacion: string;
  entrevista_conclusiones: string | null;
  autor_nombre: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuracion(seg: number | null): string {
  if (!seg) return '';
  const min = Math.floor(seg / 60);
  const s = seg % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface GrabacionCardProps {
  grabacion: GrabacionReunion;
  /** Función para formatear la fecha en texto (viene de la página padre). */
  formatearFecha: (fecha: string) => string;
}

/**
 * Tarjeta expandible de grabación de reunión familiar.
 * Muestra: metadata, audio player, resumen IA y transcripción.
 */
export default function GrabacionCard({ grabacion, formatearFecha }: GrabacionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const handlePlayAudio = async () => {
    if (audioUrl) return;
    setLoadingAudio(true);
    try {
      const path = grabacion.storage_path;
      // Full URLs (Drive links) se usan directamente.
      // Los paths legacy de Supabase Storage ya no se reproducen.
      if (path?.startsWith('http')) {
        setAudioUrl(path);
      }
    } catch (err) {
      console.error('Error getting audio URL:', err);
    } finally {
      setLoadingAudio(false);
    }
  };

  const resumenIA = grabacion.entrevista_conclusiones?.includes('--- Resumen generado por IA ---')
    ? grabacion.entrevista_conclusiones
        .split('--- Resumen generado por IA ---')[1]
        ?.split('---')[0]
        ?.trim()
    : grabacion.entrevista_conclusiones;

  return (
    <div className="border border-impulso-100 rounded-xl overflow-hidden bg-impulso-50/30">
      {/* Header (botón expandir) */}
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) handlePlayAudio();
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-impulso-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-impulso-100 rounded-lg">
            <Mic className="w-4 h-4 text-impulso-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Reunión de ingreso
              {grabacion.duracion_segundos && (
                <span className="text-gray-500 font-normal ml-2">
                  ({formatDuracion(grabacion.duracion_segundos)})
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {formatearFecha(grabacion.fecha_grabacion.split('T')[0])} · {grabacion.autor_nombre}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-impulso-100">
          {/* Audio */}
          <div className="pt-3">
            {loadingAudio ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" color="impulso" />
                Cargando audio...
              </div>
            ) : audioUrl ? (
              <div className="flex items-center gap-2 bg-white rounded-lg p-2">
                <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
                <audio src={audioUrl} controls className="w-full" style={{ maxHeight: '40px' }} />
              </div>
            ) : (
              <button
                onClick={handlePlayAudio}
                className="flex items-center gap-2 text-sm text-impulso-600 hover:text-impulso-700 font-medium"
              >
                <Volume2 className="w-4 h-4" /> Cargar audio
              </button>
            )}
          </div>

          {/* Resumen IA */}
          {resumenIA && (
            <div className="bg-sol-50 rounded-lg p-3 border border-sol-100">
              <p className="text-xs font-semibold text-sol-700 mb-1 flex items-center gap-1">
                ✨ Resumen de la reunión
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{resumenIA}</p>
            </div>
          )}

          {/* Transcripción */}
          {grabacion.transcripcion && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Transcripción
              </p>
              <div className="bg-white rounded-lg p-3 border border-gray-100 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {grabacion.transcripcion}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
