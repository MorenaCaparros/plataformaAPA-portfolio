'use client';

import { useState, useRef, useEffect } from 'react';
import ConsentimientoGrabacionModal, {
  type ConsentimientoData,
} from './ConsentimientoGrabacionModal';

type VoiceRecorderProps = {
  onRecordingComplete: (audioBlob: Blob, consentimiento: ConsentimientoData | null) => void;
  onError?: (error: string) => void;
};

export default function VoiceRecorder({ onRecordingComplete, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentimientoData, setConsentimientoData] = useState<ConsentimientoData | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    // Cleanup al desmontar
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const requestRecording = () => {
    if (consentimientoData) {
      startRecording();
    } else {
      setShowConsentModal(true);
    }
  };

  const handleConsentConfirm = (data: ConsentimientoData) => {
    setConsentimientoData(data);
    setShowConsentModal(false);
    startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onRecordingComplete(audioBlob, consentimientoData);
        
        // Detener todas las pistas de audio
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer para mostrar duración
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'No se pudo acceder al micrófono. Verificá los permisos del navegador.';
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
        setAudioURL(null);
      }
    }
  };

  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setRecordingTime(0);
    setConsentimientoData(null);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-sol-50 to-crecimiento-50 border border-sol-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🎤</span>
        <div>
          <h3 className="font-semibold text-gray-900">Grabación de Voz</h3>
          <p className="text-sm text-gray-600">
            {!isRecording && !audioURL && 'Grabá la entrevista para tener un registro completo'}
            {isRecording && !isPaused && 'Grabando...'}
            {isRecording && isPaused && 'Grabación en pausa'}
            {audioURL && !isRecording && 'Grabación completada'}
          </p>
        </div>
      </div>

      {/* Consent badge */}
      {consentimientoData && (
        <div className="mb-4 flex items-center gap-2 bg-crecimiento-50 border border-crecimiento-200 rounded-lg px-4 py-2.5">
          <span className="text-crecimiento-600 text-base">🛡️</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-crecimiento-800 truncate">
              Autorizado por: {consentimientoData.nombre_firmante} ({consentimientoData.relacion_con_nino})
            </p>
            <p className="text-[10px] text-crecimiento-600">
              DNI: {consentimientoData.dni_firmante} • {new Date(consentimientoData.fecha_consentimiento).toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      )}

      {/* Display de tiempo */}
      {(isRecording || audioURL) && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm">
            {isRecording && !isPaused && (
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            )}
            <span className="text-2xl font-mono font-bold text-gray-900">
              {formatTime(recordingTime)}
            </span>
          </div>
        </div>
      )}

      {/* Controles de grabación */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!isRecording && !audioURL && (
          <button
            onClick={requestRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
            {consentimientoData ? 'Iniciar Grabación' : 'Solicitar Autorización y Grabar'}
          </button>
        )}

        {isRecording && !isPaused && (
          <>
            <button
              onClick={pauseRecording}
              className="flex items-center gap-2 px-6 py-3 bg-sol-600 text-white rounded-lg hover:bg-sol-700 font-medium transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
              Pausar
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="5" width="10" height="10" />
              </svg>
              Detener
            </button>
            <button
              onClick={cancelRecording}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
            >
              Cancelar
            </button>
          </>
        )}

        {isRecording && isPaused && (
          <>
            <button
              onClick={resumeRecording}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
              Reanudar
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="5" width="10" height="10" />
              </svg>
              Detener
            </button>
            <button
              onClick={cancelRecording}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition"
            >
              Cancelar
            </button>
          </>
        )}

        {audioURL && !isRecording && (
          <div className="w-full space-y-3">
            {/* Reproductor de audio */}
            <audio
              src={audioURL}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '54px' }}
            />
            
            <div className="flex gap-3">
              <button
                onClick={deleteRecording}
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition"
              >
                🗑️ Eliminar
              </button>
              <button
                onClick={requestRecording}
                className="flex-1 px-4 py-2 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium transition"
              >
                🔄 Grabar de nuevo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advertencia de permisos */}
      <div className="mt-4 text-xs text-gray-600 text-center">
        💡 Se pedirá autorización firmada antes de grabar. El audio y la transcripción se guardan de forma segura.
      </div>

      {/* Consent modal */}
      <ConsentimientoGrabacionModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConsentConfirm}
      />
    </div>
  );
}
