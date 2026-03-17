'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
// 1. Importamos el modal y su tipo de datos
import ConsentimientoGrabacionModal, { ConsentimientoData } from './ConsentimientoGrabacionModal';

interface VoiceToTextProps {
  /** Called with the full accumulated text each time a final result arrives */
  onTranscript: (text: string) => void;
  /** Current text value (so we can append to it) */
  currentText?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Extra CSS classes for the button wrapper */
  className?: string;
  /** If true, show consent modal before first use. Default false (simple dictation). */
  requireConsent?: boolean;
}

/**
 * A small microphone button that uses the Web Speech API (es-AR)
 * to live-transcribe speech and append it to a text field.
 * Works on Chrome, Edge, Safari 17+ (and Android Chrome).
 */
export default function VoiceToText({
  onTranscript,
  currentText = '',
  disabled = false,
  className = '',
  requireConsent = false,
}: VoiceToTextProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // 2. Nuevos estados para el consentimiento
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentimientoData | null>(null);

  const recognitionRef = useRef<any>(null);
  const currentTextRef = useRef(currentText);

  // Keep ref in sync so the onresult callback always has latest text
  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  // Init speech recognition once
  useEffect(() => {
    const SR =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;

    setSupported(true);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-AR';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (finalText) {
        const separator = currentTextRef.current.trim() ? ' ' : '';
        const newText = currentTextRef.current.trim() + separator + finalText.trim();
        currentTextRef.current = newText;
        onTranscript(newText);
      }

      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        setListening(false);
      }
    };

    recognition.onend = () => {
      // If we're still in "listening" mode, the browser stopped on its own → restart
      // (Chrome stops after ~60s of silence)
      if (recognitionRef.current?._shouldListen) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Extraemos la lógica de INICIAR grabación a una función auxiliar
  const startListeningInternal = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition._shouldListen = true;
    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      console.error('Could not start speech recognition:', err);
    }
  }, []);

  // 4. Modificamos el toggle para interceptar el click
  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      // STOP LOGIC (igual que antes)
      recognition._shouldListen = false;
      recognition.stop();
      setListening(false);
      setInterimText('');
    } else {
      // START LOGIC
      if (!requireConsent || consentData) {
        // No consent needed OR already signed → start directly
        startListeningInternal();
      } else {
        // Consent required and not yet signed → show modal
        setShowConsentModal(true);
      }
    }
  }, [listening, consentData, startListeningInternal, requireConsent]);

  // 5. Manejador para cuando confirman el modal
  const handleConsentConfirm = (data: ConsentimientoData) => {
    setConsentData(data); // Guardamos la firma
    setShowConsentModal(false); // Cerramos modal
    startListeningInternal(); // Iniciamos grabación
  };

  if (!supported) return null;

  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          title={listening ? 'Detener dictado' : 'Dictar con micrófono'}
          className={`
            relative p-2.5 rounded-2xl transition-all min-h-[44px] min-w-[44px]
            flex items-center justify-center
            ${listening
              ? 'bg-red-100 text-red-600 border border-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
              : 'bg-white/80 text-neutro-piedra border border-white/60 hover:text-crecimiento-600 hover:border-crecimiento-200 hover:shadow-md'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {listening && interimText && (
          <span className="text-xs text-neutro-piedra/70 italic font-outfit max-w-[200px] truncate">
            {interimText}…
          </span>
        )}

        {listening && (
          <span className="flex items-center gap-1 text-xs text-red-500 font-outfit font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Escuchando…
          </span>
        )}
      </div>

      {/* 6. Renderizamos el Modal solo si se requiere consentimiento */}
      {requireConsent && (
        <ConsentimientoGrabacionModal 
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          onConfirm={handleConsentConfirm}
        />
      )}
    </>
  );
}