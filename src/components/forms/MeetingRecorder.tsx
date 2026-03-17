'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Square, Pause, Play, Trash2, Loader2,
  Sparkles, FileText, Volume2, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import ConsentimientoGrabacionModal, {
  type ConsentimientoData,
} from './ConsentimientoGrabacionModal';

// ─── Types ───────────────────────────────────────────────

export interface MeetingRecordingResult {
  audioBlob: Blob | null;
  transcripcion: string;
  duracionSegundos: number;
  consentimiento: ConsentimientoData | null;
}

interface MeetingRecorderProps {
  /** Called whenever the transcription text changes (live updates) */
  onTranscripcionChange?: (text: string) => void;
  /** Called when recording finishes with the complete result */
  onRecordingComplete?: (result: MeetingRecordingResult) => void;
  /** Called when user clicks "Analizar con IA" */
  onAnalizar?: (transcripcion: string) => void;
  /** Whether the AI analysis is currently running */
  analizando?: boolean;
  /** Disable the component (e.g. during form submission) */
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────

export default function MeetingRecorder({
  onTranscripcionChange,
  onRecordingComplete,
  onAnalizar,
  analizando = false,
  disabled = false,
}: MeetingRecorderProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duracion, setDuracion] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Transcription state
  const [transcripcion, setTranscripcion] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Consent state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentimientoData, setConsentimientoData] = useState<ConsentimientoData | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Init Speech Recognition ───────────────────────────

  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-AR';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text + ' ';
          } else {
            interim += text;
          }
        }

        if (final) {
          setTranscripcion((prev) => {
            const updated = prev + final;
            onTranscripcionChange?.(updated);
            return updated;
          });
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' and 'aborted' are common/harmless, don't log them
        if (!['no-speech', 'aborted'].includes(event.error)) {
          console.error('Speech recognition error:', event.error);
        }
        // Auto-restart if it was a transient error and we're still recording
        if (event.error === 'no-speech' || event.error === 'network') {
          setTimeout(() => {
            if (isRecording && !isPaused && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch { /* already running */ }
            }
          }, 500);
        }
      };

      recognition.onend = () => {
        // Auto-restart if we're still recording (browser stops after silence)
        if (isRecording && !isPaused) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch { /* already running */ }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the isRecording/isPaused in sync for the onend handler
  useEffect(() => {
    // We rely on the refs being read inside the closure, but the closure was
    // created in the first useEffect. Instead we use a different approach:
    // we store recording state in a ref so the onend handler reads the latest.
  }, [isRecording, isPaused]);

  const isRecordingRef = useRef(isRecording);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // ─── Recording controls ────────────────────────────────

  /** Show the consent modal. If consent was already given, start recording directly. */
  const requestRecording = useCallback(() => {
    if (consentimientoData) {
      // Already consented in this session – start directly
      startRecordingInternal();
    } else {
      setShowConsentModal(true);
    }
  }, [consentimientoData]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Called when the user signs and confirms consent */
  const handleConsentConfirm = useCallback((data: ConsentimientoData) => {
    setConsentimientoData(data);
    setShowConsentModal(false);
    // Start recording immediately after consent
    startRecordingInternal();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecordingInternal = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      // Start recording in 1-second chunks for better reliability
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setDuracion(0);
      setExpanded(true);

      // Timer
      timerRef.current = setInterval(() => setDuracion((p) => p + 1), 1000);

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch { /* might already be running */ }
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('No se pudo acceder al micrófono. Revisá los permisos del navegador.');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.stop();
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuracion((p) => p + 1), 1000);
      try {
        recognitionRef.current?.start();
      } catch { /* already started */ }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    setInterimText('');

    // Notify parent
    setTimeout(() => {
      // Give onstop time to fire and set blob
      const blob = audioChunksRef.current.length
        ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
        : null;

      onRecordingComplete?.({
        audioBlob: blob,
        transcripcion,
        duracionSegundos: duracion,
        consentimiento: consentimientoData,
      });
    }, 300);
  }, [transcripcion, duracion, onRecordingComplete, consentimientoData]);

  const discardRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setDuracion(0);
    setTranscripcion('');
    setInterimText('');
    setAudioURL(null);
    setAudioBlob(null);
    setConsentimientoData(null);
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    onTranscripcionChange?.('');
  }, [onTranscripcionChange]);

  // ─── Helpers ───────────────────────────────────────────

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const hasTranscripcion = transcripcion.trim().length > 0;

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="rounded-3xl border border-impulso-200/50 bg-gradient-to-br from-impulso-50/60 to-sol-50/40 backdrop-blur-md shadow-[0_8px_32px_rgba(200,50,50,0.06)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isRecording ? 'bg-impulso-500 animate-pulse' : 'bg-impulso-100'}`}>
            <Mic size={20} className={isRecording ? 'text-white' : 'text-impulso-600'} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-neutro-carbon font-quicksand text-base">
              Grabar reunión de ingreso
            </h3>
            <p className="text-xs text-neutro-piedra font-outfit">
              {isRecording
                ? `Grabando • ${formatTime(duracion)}`
                : audioURL
                ? `Grabación lista • ${formatTime(duracion)}`
                : 'Grabá la reunión para completar campos automáticamente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consentimientoData && !isRecording && (
            <span className="flex items-center gap-1 text-[10px] text-crecimiento-600 bg-crecimiento-50 px-2 py-1 rounded-full font-outfit font-medium">
              <ShieldCheck size={12} /> Autorizado
            </span>
          )}
          {isRecording && (
            <span className="w-3 h-3 bg-impulso-500 rounded-full animate-pulse" />
          )}
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Consent badge */}
          {consentimientoData && (
            <div className="flex items-center gap-2 bg-crecimiento-50/60 border border-crecimiento-200/40 rounded-2xl px-4 py-2.5">
              <ShieldCheck size={16} className="text-crecimiento-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-crecimiento-800 font-outfit truncate">
                  Autorizado por: {consentimientoData.nombre_firmante} ({consentimientoData.relacion_con_nino})
                </p>
                <p className="text-[10px] text-crecimiento-600 font-outfit">
                  DNI: {consentimientoData.dni_firmante} • {new Date(consentimientoData.fecha_consentimiento).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          )}

          {/* Recording controls */}
          <div className="flex flex-wrap items-center gap-3">
            {!isRecording && !audioURL && (
              <button
                type="button"
                onClick={requestRecording}
                disabled={disabled}
                className="flex items-center gap-2 px-5 py-3 bg-impulso-500 text-white rounded-2xl hover:bg-impulso-600 font-medium font-outfit shadow-md transition-all active:scale-95 min-h-[48px] disabled:opacity-50"
              >
                <Mic size={18} />
                {consentimientoData ? 'Iniciar grabación' : 'Solicitar autorización y grabar'}
              </button>
            )}

            {isRecording && !isPaused && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-4 py-3 bg-sol-500 text-white rounded-2xl hover:bg-sol-600 font-medium font-outfit transition-all min-h-[48px]"
                >
                  <Pause size={18} />
                  Pausar
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-3 bg-neutro-carbon text-white rounded-2xl hover:bg-neutro-carbon/90 font-medium font-outfit transition-all min-h-[48px]"
                >
                  <Square size={16} />
                  Detener
                </button>
                {/* Live indicator */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full">
                  <span className="w-2.5 h-2.5 bg-impulso-500 rounded-full animate-pulse" />
                  <span className="font-mono text-lg font-bold text-neutro-carbon">
                    {formatTime(duracion)}
                  </span>
                </div>
              </>
            )}

            {isRecording && isPaused && (
              <>
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-4 py-3 bg-crecimiento-500 text-white rounded-2xl hover:bg-crecimiento-600 font-medium font-outfit transition-all min-h-[48px]"
                >
                  <Play size={18} />
                  Reanudar
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-3 bg-neutro-carbon text-white rounded-2xl hover:bg-neutro-carbon/90 font-medium font-outfit transition-all min-h-[48px]"
                >
                  <Square size={16} />
                  Detener
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full">
                  <span className="w-2.5 h-2.5 bg-sol-500 rounded-full" />
                  <span className="font-mono text-lg font-bold text-neutro-carbon">
                    {formatTime(duracion)} <span className="text-xs font-outfit font-normal">pausado</span>
                  </span>
                </div>
              </>
            )}

            {!isRecording && audioURL && (
              <>
                <button
                  type="button"
                  onClick={requestRecording}
                  disabled={disabled}
                  className="flex items-center gap-2 px-4 py-3 bg-impulso-500 text-white rounded-2xl hover:bg-impulso-600 font-medium font-outfit transition-all min-h-[48px] disabled:opacity-50"
                >
                  <Mic size={18} />
                  Grabar de nuevo
                </button>
                <button
                  type="button"
                  onClick={discardRecording}
                  className="flex items-center gap-2 px-4 py-3 bg-white/80 border border-neutro-200 text-neutro-piedra rounded-2xl hover:bg-white font-medium font-outfit transition-all min-h-[48px]"
                >
                  <Trash2 size={16} />
                  Descartar
                </button>
              </>
            )}
          </div>

          {/* Audio player (when recording is done) */}
          {audioURL && !isRecording && (
            <div className="flex items-center gap-3 bg-white/60 rounded-2xl p-3">
              <Volume2 size={18} className="text-neutro-piedra shrink-0" />
              <audio src={audioURL} controls className="w-full" style={{ maxHeight: '40px' }} />
            </div>
          )}

          {/* Live transcription area */}
          {(isRecording || hasTranscripcion) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-neutro-carbon font-outfit">
                  <FileText size={14} className="text-impulso-400" />
                  Transcripción
                  {isRecording && (
                    <span className="text-xs text-neutro-piedra ml-1">(en vivo)</span>
                  )}
                </label>
                {!speechSupported && (
                  <span className="text-xs text-impulso-600 font-outfit">
                    ⚠️ Tu navegador no soporta transcripción en vivo
                  </span>
                )}
              </div>
              <textarea
                value={transcripcion + (interimText ? ` ${interimText}` : '')}
                onChange={(e) => {
                  setTranscripcion(e.target.value);
                  onTranscripcionChange?.(e.target.value);
                }}
                readOnly={isRecording}
                rows={6}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-impulso-300 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(200,50,50,0.05)] text-sm leading-relaxed resize-y min-h-[120px] placeholder:text-neutro-piedra/60 transition-all"
                placeholder="La transcripción aparecerá aquí mientras grabás..."
              />
              {!isRecording && hasTranscripcion && (
                <p className="text-xs text-neutro-piedra font-outfit">
                  Podés editar la transcripción antes de analizar.
                </p>
              )}
            </div>
          )}

          {/* AI action buttons */}
          {!isRecording && hasTranscripcion && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onAnalizar?.(transcripcion)}
                disabled={analizando || disabled}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sol-400 to-sol-500 text-white rounded-2xl hover:shadow-[0_4px_16px_rgba(242,201,76,0.3)] font-semibold font-outfit transition-all active:scale-95 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {analizando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Analizar con IA
                  </>
                )}
              </button>
              <p className="text-xs text-neutro-piedra font-outfit self-center">
                La IA extraerá datos del formulario y generará un resumen de la reunión
              </p>
            </div>
          )}

          {/* Tip */}
          {!isRecording && !audioURL && (
            <div className="text-xs text-neutro-piedra font-outfit flex items-start gap-2 bg-white/40 rounded-xl p-3">
              <span className="shrink-0">💡</span>
              <span>
                Al grabar la reunión se pedirá autorización a la persona presente. La transcripción
                en vivo se usará para completar campos automáticamente con IA. El audio, la
                transcripción y el consentimiento firmado se guardarán en el perfil del niño.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Consent modal */}
      <ConsentimientoGrabacionModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConsentConfirm}
      />
    </div>
  );
}
