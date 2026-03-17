'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
// 1. IMPORTANTE: Importar createPortal de react-dom
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, PenTool, RotateCcw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

export interface ConsentimientoData {
  nombre_firmante: string;
  relacion_con_nino: string;
  dni_firmante: string;
  firma_imagen_base64: string;
  fecha_consentimiento: string;
  texto_consentimiento: string;
  acepta_grabacion: boolean;
  acepta_transcripcion: boolean;
  acepta_almacenamiento: boolean;
}

interface ConsentimientoGrabacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConsentimientoData) => void;
}

// ─── Signature pad constants ─────────────────────────────

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 180;

const TEXTO_CONSENTIMIENTO = `Autorizo a la Asociación Civil Adelante y su programa de alfabetización a grabar esta conversación con fines exclusivamente educativos y de seguimiento psicopedagógico.

Entiendo y acepto que:
• La conversación será grabada en formato de audio.
• El audio será transcripto a texto para facilitar el análisis.
• Tanto el audio como la transcripción serán almacenados de forma segura y confidencial.
• Los datos serán utilizados únicamente por el equipo profesional del programa.
• Puedo solicitar la eliminación de la grabación en cualquier momento.

Esta autorización es voluntaria y su negativa no afecta la participación del niño/a en el programa.`;

// ─── Component ───────────────────────────────────────────

export default function ConsentimientoGrabacionModal({
  isOpen,
  onClose,
  onConfirm,
}: ConsentimientoGrabacionModalProps) {
  // Form state
  const [nombreFirmante, setNombreFirmante] = useState('');
  const [relacionConNino, setRelacionConNino] = useState('');
  const [dniFirmante, setDniFirmante] = useState('');
  const [aceptaGrabacion, setAceptaGrabacion] = useState(false);
  const [aceptaTranscripcion, setAceptaTranscripcion] = useState(false);
  const [aceptaAlmacenamiento, setAceptaAlmacenamiento] = useState(false);

  // Signature canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // 2. Estado para saber si el componente ya se montó en el cliente
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ─── Canvas setup ──────────────────────────────────────

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_WIDTH * dpr;
        canvas.height = CANVAS_HEIGHT * dpr;
        canvas.style.width = `${CANVAS_WIDTH}px`;
        canvas.style.height = `${CANVAS_HEIGHT}px`;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, CANVAS_HEIGHT - 30);
        ctx.lineTo(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Firmá aquí con el dedo o el mouse', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
      }
    }
  }, [isOpen]);

  // Reset all when modal opens
  useEffect(() => {
    if (isOpen) {
      setNombreFirmante('');
      setRelacionConNino('');
      setDniFirmante('');
      setAceptaGrabacion(false);
      setAceptaTranscripcion(false);
      setAceptaAlmacenamiento(false);
      setHasFirma(false);
    }
  }, [isOpen]);

  // ─── Drawing functions ─────────────────────────────────

  const getCanvasPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
  }, [getCanvasPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current || !lastPosRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);

    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
    setHasFirma(true);
  }, [isDrawing, getCanvasPos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, CANVAS_HEIGHT - 30);
    ctx.lineTo(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Firmá aquí con el dedo o el mouse', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);

    setHasFirma(false);
  }, []);

  // ─── Submit handler ────────────────────────────────────

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    const firmaBase64 = canvasRef.current.toDataURL('image/png');

    const data: ConsentimientoData = {
      nombre_firmante: nombreFirmante.trim(),
      relacion_con_nino: relacionConNino.trim(),
      dni_firmante: dniFirmante.trim(),
      firma_imagen_base64: firmaBase64,
      fecha_consentimiento: new Date().toISOString(),
      texto_consentimiento: TEXTO_CONSENTIMIENTO,
      acepta_grabacion: aceptaGrabacion,
      acepta_transcripcion: aceptaTranscripcion,
      acepta_almacenamiento: aceptaAlmacenamiento,
    };

    onConfirm(data);
  };

  const isValid =
    nombreFirmante.trim().length >= 2 &&
    relacionConNino.trim().length >= 2 &&
    dniFirmante.trim().length >= 6 &&
    aceptaGrabacion &&
    aceptaTranscripcion &&
    aceptaAlmacenamiento &&
    hasFirma;

  // ─── Render ────────────────────────────────────────────

  // Si no está abierto o no estamos en el navegador, no renderizamos nada
  if (!isOpen || !mounted) return null;

  // 3. ENVOLVEMOS EL JSX EN createPortal(..., document.body)
  // Esto hace que el modal se renderice fuera de cualquier div con overflow o filtros
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        
        {/* HEADER */}
        <div className="flex-none bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sol-100 rounded-xl">
              <AlertTriangle size={20} className="text-sol-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutro-carbon font-quicksand">
                Consentimiento de Grabación
              </h3>
              <p className="text-xs text-neutro-piedra font-outfit">
                Autorización requerida antes de grabar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutro-piedra hover:text-neutro-carbon transition-colors rounded-xl hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-10 space-y-5">
          
          <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 font-outfit leading-relaxed whitespace-pre-line border border-gray-100">
            {TEXTO_CONSENTIMIENTO}
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={aceptaGrabacion} onChange={(e) => setAceptaGrabacion(e.target.checked)} className="w-5 h-5 mt-0.5 rounded-lg border-gray-300 text-crecimiento-500 focus:ring-crecimiento-300 cursor-pointer shrink-0" />
              <span className="text-sm text-gray-700 font-outfit group-hover:text-gray-900 transition-colors">Autorizo la <strong>grabación de audio</strong></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={aceptaTranscripcion} onChange={(e) => setAceptaTranscripcion(e.target.checked)} className="w-5 h-5 mt-0.5 rounded-lg border-gray-300 text-crecimiento-500 focus:ring-crecimiento-300 cursor-pointer shrink-0" />
              <span className="text-sm text-gray-700 font-outfit group-hover:text-gray-900 transition-colors">Autorizo la <strong>transcripción a texto</strong></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={aceptaAlmacenamiento} onChange={(e) => setAceptaAlmacenamiento(e.target.checked)} className="w-5 h-5 mt-0.5 rounded-lg border-gray-300 text-crecimiento-500 focus:ring-crecimiento-300 cursor-pointer shrink-0" />
              <span className="text-sm text-gray-700 font-outfit group-hover:text-gray-900 transition-colors">Autorizo el <strong>almacenamiento seguro</strong></span>
            </label>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-neutro-carbon font-outfit flex items-center gap-2">
              <PenTool size={14} className="text-impulso-400" />
              Datos de quien autoriza
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 font-outfit">Nombre completo *</label>
                <input type="text" value={nombreFirmante} onChange={(e) => setNombreFirmante(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-outfit" placeholder="Nombre y apellido" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 font-outfit">Relación con el niño/a *</label>
                <select value={relacionConNino} onChange={(e) => setRelacionConNino(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-outfit">
                  <option value="">Seleccioná...</option>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Tutor/a legal">Tutor/a legal</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Tío/a">Tío/a</option>
                  <option value="Otro familiar">Otro familiar</option>
                </select>
              </div>
            </div>
            <div className="sm:w-1/2">
              <label className="block text-xs font-medium text-gray-600 mb-1 font-outfit">DNI *</label>
              <input type="text" inputMode="numeric" value={dniFirmante} onChange={(e) => setDniFirmante(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-outfit" placeholder="Ej: 30123456" maxLength={10} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutro-carbon font-outfit flex items-center gap-2">
                <PenTool size={14} className="text-impulso-400" />
                Firma *
              </h4>
              {hasFirma && (
                <button type="button" onClick={clearSignature} className="flex items-center gap-1.5 text-xs text-neutro-piedra hover:text-impulso-600 font-outfit transition-colors">
                  <RotateCcw size={12} /> Borrar firma
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-[#FAFAFA] touch-none">
              <canvas
                ref={canvasRef}
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%' }}
                className="cursor-crosshair w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-xs text-neutro-piedra font-outfit text-center">
              Dibujá tu firma con el dedo (celular) o el mouse (computadora)
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex-none bg-white rounded-b-3xl border-t border-gray-100 px-6 py-4 flex gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-neutro-carbon font-outfit text-sm font-medium hover:shadow-md transition-all min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-outfit text-sm font-semibold hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[48px]"
          >
            <Check size={18} />
            Autorizar y Grabar
          </button>
        </div>
      </div>
    </div>,
    document.body // Aquí es donde ocurre la magia
  );
}