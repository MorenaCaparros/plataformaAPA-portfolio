'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Mic, MicOff, FileText, Camera, Save, Loader2 } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface FormData {
  // Datos básicos
  alias: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  rango_etario: string;
  
  // Entrevista inicial
  contexto_familiar: {
    estructura: string; // monoparental, biparental, extendida, etc.
    adultos_cargo: string;
    hermanos: number;
    vivienda: string;
    observaciones: string;
  };
  
  alimentacion: {
    embarazo: string;
    actual: string;
    dificultades: string;
  };
  
  escolaridad: {
    asiste: boolean;
    nombre_escuela: string;
    grado: string;
    turno: string;
    dificultades: string;
    ausentismo: string;
  };
  
  salud: {
    antecedentes: string;
    medicacion: string;
    controles: string;
    vacunacion: string;
  };
  
  nivel_alfabetizacion: string;
  pronostico_inicial: string;
  observaciones_generales: string;
  
  // Transcripciones y documentos
  transcripciones: string[];
  documentos_ocr: { nombre: string; texto: string }[];
}

export default function IngresoCompletoPage() {
  const router = useRouter();
  const { user, perfil } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Voluntarios no pueden registrar niños — redirigir
  useEffect(() => {
    if (perfil?.rol === 'voluntario') {
      router.replace('/dashboard/ninos');
    }
  }, [perfil, router]);
  
  // Grabación de voz
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  // OCR
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    alias: '',
    nombre_completo: '',
    fecha_nacimiento: '',
    rango_etario: '8-10',
    contexto_familiar: {
      estructura: 'biparental',
      adultos_cargo: '',
      hermanos: 0,
      vivienda: '',
      observaciones: ''
    },
    alimentacion: {
      embarazo: '',
      actual: '',
      dificultades: ''
    },
    escolaridad: {
      asiste: true,
      nombre_escuela: '',
      grado: '',
      turno: 'mañana',
      dificultades: '',
      ausentismo: ''
    },
    salud: {
      antecedentes: '',
      medicacion: '',
      controles: '',
      vacunacion: 'completo'
    },
    nivel_alfabetizacion: 'Pre-silábico',
    pronostico_inicial: '',
    observaciones_generales: '',
    transcripciones: [],
    documentos_ocr: []
  });

  // ============================================
  // VERIFICAR PERMISOS
  // ============================================
  
  useEffect(() => {
    if (perfil && !['psicopedagogia', 'coordinador', 'trabajador_social', 'admin'].includes(perfil.rol)) {
      alert('⚠️ No tenés permisos para ingresar niños con entrevista completa');
      router.push('/dashboard');
    }
  }, [perfil, router]);

  // ============================================
  // GRABACIÓN DE VOZ (Web Speech API)
  // ============================================
  
  useEffect(() => {
    // Verificar soporte de Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setRecognitionSupported(true);
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-AR'; // Español de Argentina
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setCurrentTranscription(prev => prev + finalTranscript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento:', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);
  
  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      if (currentTranscription.trim()) {
        setFormData(prev => ({
          ...prev,
          transcripciones: [...prev.transcripciones, currentTranscription.trim()]
        }));
        setCurrentTranscription('');
      }
    } else {
      setCurrentTranscription('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // ============================================
  // OCR DE DOCUMENTOS (Tesseract.js simplificado)
  // ============================================
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingOCR(true);
    
    try {
      // Leer el archivo como base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        
        // Por ahora, guardamos la imagen como documento
        // TODO: Integrar Tesseract.js para OCR real
        setFormData(prev => ({
          ...prev,
          documentos_ocr: [
            ...prev.documentos_ocr,
            {
              nombre: file.name,
              texto: '(Pendiente: integración OCR con Tesseract.js)\n' +
                     'Este documento será procesado para extraer texto.'
            }
          ]
        }));
        
        alert('📄 Documento cargado. La extracción de texto estará disponible próximamente.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error procesando documento:', error);
      alert('Error al procesar el documento');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // ============================================
  // CALCULAR RANGO ETARIO AUTOMÁTICO
  // ============================================
  
  const calcularRangoEtario = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return '8-10';
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    if (edad >= 5 && edad <= 7) return '5-7';
    if (edad >= 8 && edad <= 10) return '8-10';
    if (edad >= 11 && edad <= 13) return '11-13';
    if (edad >= 14 && edad <= 16) return '14-16';
    return '17+';
  };
  
  const handleFechaNacimientoChange = (fecha: string) => {
    setFormData(prev => ({
      ...prev,
      fecha_nacimiento: fecha,
      rango_etario: calcularRangoEtario(fecha)
    }));
  };

  // ============================================
  // GUARDAR NIÑO
  // ============================================
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (!formData.alias || !formData.nombre_completo || !formData.fecha_nacimiento) {
        alert('Por favor completá los campos obligatorios');
        setLoading(false);
        return;
      }
      
      // 1. Crear el niño en la tabla principal (datos NO sensibles)
      const { data: nino, error: ninoError } = await supabase
        .from('ninos')
        .insert({
          alias: formData.alias,
          fecha_nacimiento: formData.fecha_nacimiento,
          rango_etario: formData.rango_etario,
          nivel_alfabetizacion: formData.nivel_alfabetizacion,
          escolarizado: formData.escolaridad.asiste,
          grado_escolar: formData.escolaridad.grado || null,
          turno_escolar: formData.escolaridad.turno === 'doble' ? null : (formData.escolaridad.turno || null),
          fecha_ingreso: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (ninoError) throw ninoError;

      const ninoId = nino.id;

      // 2. Guardar datos sensibles en ninos_sensibles
      // TODO: Implementar encriptación real con pgcrypto
      const nombrePartes = formData.nombre_completo.trim().split(' ');
      const apellido = nombrePartes.length > 1 ? nombrePartes.slice(-1).join(' ') : '';
      const nombreSinApellido = nombrePartes.length > 1 ? nombrePartes.slice(0, -1).join(' ') : formData.nombre_completo;

      const { error: sensiblesError } = await supabase
        .from('ninos_sensibles')
        .insert({
          nino_id: ninoId,
          nombre_completo_encrypted: nombreSinApellido, // TODO: Encriptar
          apellido_encrypted: apellido, // TODO: Encriptar
          fecha_nacimiento_encrypted: formData.fecha_nacimiento, // TODO: Encriptar
        });

      if (sensiblesError) console.error('Error guardando datos sensibles:', sensiblesError);

      // 3. Guardar info de alimentación en tabla relacional
      if (formData.alimentacion.actual || formData.alimentacion.dificultades) {
        const { error: alimentacionError } = await supabase
          .from('alimentacion_ninos')
          .insert({
            nino_id: ninoId,
            observaciones: [
              formData.alimentacion.embarazo ? `Embarazo: ${formData.alimentacion.embarazo}` : '',
              formData.alimentacion.actual ? `Actual: ${formData.alimentacion.actual}` : '',
              formData.alimentacion.dificultades ? `Dificultades: ${formData.alimentacion.dificultades}` : '',
            ].filter(Boolean).join('\n'),
          });

        if (alimentacionError) console.error('Error guardando alimentación:', alimentacionError);
      }

      // 4. Guardar escolaridad en tabla relacional
      if (formData.escolaridad.asiste) {
        const { error: escolaridadError } = await supabase
          .from('escolaridad_ninos')
          .insert({
            nino_id: ninoId,
            ciclo_lectivo: new Date().getFullYear(),
            grado: formData.escolaridad.grado || null,
            turno: formData.escolaridad.turno === 'doble' ? null : (formData.escolaridad.turno || null),
            asistencia_regular: !formData.escolaridad.ausentismo,
            motivo_inasistencias: formData.escolaridad.ausentismo || null,
            observaciones: formData.escolaridad.dificultades || null,
          });

        if (escolaridadError) console.error('Error guardando escolaridad:', escolaridadError);
      }

      // 5. Guardar salud en tabla relacional
      if (formData.salud.antecedentes || formData.salud.medicacion) {
        const { error: saludError } = await supabase
          .from('salud_ninos')
          .insert({
            nino_id: ninoId,
            medicacion_habitual: formData.salud.medicacion || null,
            condiciones_preexistentes: formData.salud.antecedentes || null,
            observaciones: [
              formData.salud.controles ? `Controles: ${formData.salud.controles}` : '',
              formData.salud.vacunacion ? `Vacunación: ${formData.salud.vacunacion}` : '',
            ].filter(Boolean).join('\n') || null,
          });

        if (saludError) console.error('Error guardando salud:', saludError);
      }

      // 6. Guardar familiares como filas en familiares_apoyo
      if (formData.contexto_familiar.adultos_cargo) {
        const { error: familiarError } = await supabase
          .from('familiares_apoyo')
          .insert({
            nino_id: ninoId,
            tipo: 'tutor',
            nombre: formData.contexto_familiar.adultos_cargo,
            vive_con_nino: true,
            es_contacto_principal: true,
            notas: [
              `Estructura: ${formData.contexto_familiar.estructura}`,
              `Hermanos: ${formData.contexto_familiar.hermanos}`,
              formData.contexto_familiar.vivienda ? `Vivienda: ${formData.contexto_familiar.vivienda}` : '',
              formData.contexto_familiar.observaciones || '',
            ].filter(Boolean).join('\n'),
          });

        if (familiarError) console.error('Error guardando familiar:', familiarError);
      }

      // 7. Crear entrevista inicial en tabla relacional
      const { error: entrevistaError } = await supabase
        .from('entrevistas')
        .insert({
          nino_id: ninoId,
          entrevistador_id: user?.id,
          tipo: 'inicial',
          fecha: new Date().toISOString().split('T')[0],
          observaciones: formData.observaciones_generales || null,
          conclusiones: formData.pronostico_inicial || null,
          participantes: formData.transcripciones.length > 0
            ? ['Transcripción de voz disponible']
            : null,
        });

      if (entrevistaError) console.error('Error guardando entrevista:', entrevistaError);

      alert(`✅ Niño ingresado exitosamente\nLegajo: ${nino.legajo || '(pendiente)'}`);
      router.push('/dashboard/ninos');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al ingresar niño: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/dashboard/ninos" className="text-crecimiento-600 font-medium text-sm sm:text-base min-h-[44px] flex items-center">
              ← Volver
            </Link>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Ingreso Completo del Niño</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Datos Básicos' },
              { num: 2, label: 'Contexto Familiar' },
              { num: 3, label: 'Salud y Escolaridad' },
              { num: 4, label: 'Evaluación Inicial' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className={`flex items-center ${idx > 0 ? 'w-full' : ''}`}>
                  {idx > 0 && (
                    <div className={`flex-1 h-1 ${step > s.num - 1 ? 'bg-crecimiento-500' : 'bg-gray-200'}`} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num ? 'bg-crecimiento-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.num}
                  </div>
                </div>
                <span className="ml-2 text-xs sm:text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Datos Básicos */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Datos Básicos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alias / Nombre operativo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                    placeholder="Ej: Juan, María..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Nombre que verán los voluntarios
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo * 🔒
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                    placeholder="Nombre y apellido completo"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Solo visible para equipo profesional
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento * 🔒
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_nacimiento}
                    onChange={(e) => handleFechaNacimientoChange(e.target.value)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rango de Edad (automático)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.rango_etario}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de Alfabetización *
                  </label>
                  <select
                    value={formData.nivel_alfabetizacion}
                    onChange={(e) => setFormData({ ...formData, nivel_alfabetizacion: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400"
                  >
                    <option value="Pre-silábico">Pre-silábico (no reconoce letras)</option>
                    <option value="Silábico">Silábico (reconoce algunas letras)</option>
                    <option value="Silábico-alfabético">Silábico-alfabético (empieza a leer)</option>
                    <option value="Alfabético">Alfabético (lee palabras simples)</option>
                    <option value="Alfabetizado">Alfabetizado (lee fluidamente)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Contexto Familiar */}
          {step === 2 && (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">👨‍👩‍👧‍👦 Contexto Familiar</h2>
                
                {/* Botón de Grabación */}
                {recognitionSupported && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                      isRecording 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isRecording ? 'Detener' : 'Grabar Entrevista'}
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-red-900">Grabando...</span>
                  </div>
                  <p className="text-sm text-gray-700">{currentTranscription || 'Hablá claramente...'}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estructura Familiar
                  </label>
                  <select
                    value={formData.contexto_familiar.estructura}
                    onChange={(e) => setFormData({
                      ...formData,
                      contexto_familiar: { ...formData.contexto_familiar, estructura: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                  >
                    <option value="monoparental">Monoparental</option>
                    <option value="biparental">Biparental</option>
                    <option value="extendida">Extendida (abuelos, tíos, etc.)</option>
                    <option value="hogar_transito">Hogar de tránsito</option>
                    <option value="otra">Otra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adultos a Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.contexto_familiar.adultos_cargo}
                    onChange={(e) => setFormData({
                      ...formData,
                      contexto_familiar: { ...formData.contexto_familiar, adultos_cargo: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Madre, padre, abuelos..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de Hermanos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.contexto_familiar.hermanos}
                    onChange={(e) => setFormData({
                      ...formData,
                      contexto_familiar: { ...formData.contexto_familiar, hermanos: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Vivienda
                  </label>
                  <input
                    type="text"
                    value={formData.contexto_familiar.vivienda}
                    onChange={(e) => setFormData({
                      ...formData,
                      contexto_familiar: { ...formData.contexto_familiar, vivienda: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Casa, departamento, precaria..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones del Contexto Familiar
                  </label>
                  <textarea
                    rows={4}
                    value={formData.contexto_familiar.observaciones}
                    onChange={(e) => setFormData({
                      ...formData,
                      contexto_familiar: { ...formData.contexto_familiar, observaciones: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Dinámica familiar, situaciones especiales, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🍼 Alimentación Durante el Embarazo
                  </label>
                  <textarea
                    rows={2}
                    value={formData.alimentacion.embarazo}
                    onChange={(e) => setFormData({
                      ...formData,
                      alimentacion: { ...formData.alimentacion, embarazo: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Condiciones nutricionales de la madre durante el embarazo..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🥗 Alimentación Actual del Niño
                  </label>
                  <textarea
                    rows={2}
                    value={formData.alimentacion.actual}
                    onChange={(e) => setFormData({
                      ...formData,
                      alimentacion: { ...formData.alimentacion, actual: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Comidas diarias, calidad, regularidad..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dificultades Alimentarias
                  </label>
                  <textarea
                    rows={2}
                    value={formData.alimentacion.dificultades}
                    onChange={(e) => setFormData({
                      ...formData,
                      alimentacion: { ...formData.alimentacion, dificultades: e.target.value }
                    })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    placeholder="Falta de acceso, problemas económicos, etc."
                  />
                </div>
              </div>

              {formData.transcripciones.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">📝 Transcripciones Guardadas</h3>
                  <div className="space-y-2">
                    {formData.transcripciones.map((trans, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                        {trans.substring(0, 150)}{trans.length > 150 ? '...' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Salud y Escolaridad */}
          {step === 3 && (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏥 Salud y 📚 Escolaridad</h2>
              
              {/* Salud */}
              <div className="border-b pb-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Salud</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Antecedentes de Salud
                    </label>
                    <textarea
                      rows={3}
                      value={formData.salud.antecedentes}
                      onChange={(e) => setFormData({
                        ...formData,
                        salud: { ...formData.salud, antecedentes: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                      placeholder="Enfermedades previas, cirugías, alergias..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medicación Actual
                    </label>
                    <input
                      type="text"
                      value={formData.salud.medicacion}
                      onChange={(e) => setFormData({
                        ...formData,
                        salud: { ...formData.salud, medicacion: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                      placeholder="Medicamentos que toma regularmente..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Controles de Salud
                    </label>
                    <input
                      type="text"
                      value={formData.salud.controles}
                      onChange={(e) => setFormData({
                        ...formData,
                        salud: { ...formData.salud, controles: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                      placeholder="Último control médico, frecuencia..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado de Vacunación
                    </label>
                    <select
                      value={formData.salud.vacunacion}
                      onChange={(e) => setFormData({
                        ...formData,
                        salud: { ...formData.salud, vacunacion: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                    >
                      <option value="completo">Completo y al día</option>
                      <option value="incompleto">Incompleto</option>
                      <option value="desconocido">Desconocido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Escolaridad */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Escolaridad</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ¿Asiste a la escuela?
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.escolaridad.asiste === true}
                          onChange={() => setFormData({
                            ...formData,
                            escolaridad: { ...formData.escolaridad, asiste: true }
                          })}
                          className="w-4 h-4 text-crecimiento-600"
                        />
                        <span className="text-gray-700">Sí</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.escolaridad.asiste === false}
                          onChange={() => setFormData({
                            ...formData,
                            escolaridad: { ...formData.escolaridad, asiste: false }
                          })}
                          className="w-4 h-4 text-crecimiento-600"
                        />
                        <span className="text-gray-700">No</span>
                      </label>
                    </div>
                  </div>

                  {formData.escolaridad.asiste && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre de la Escuela
                        </label>
                        <input
                          type="text"
                          value={formData.escolaridad.nombre_escuela}
                          onChange={(e) => setFormData({
                            ...formData,
                            escolaridad: { ...formData.escolaridad, nombre_escuela: e.target.value }
                          })}
                          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                          placeholder="Nombre completo de la institución..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grado
                          </label>
                          <input
                            type="text"
                            value={formData.escolaridad.grado}
                            onChange={(e) => setFormData({
                              ...formData,
                              escolaridad: { ...formData.escolaridad, grado: e.target.value }
                            })}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                            placeholder="1°, 2°, 3°..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Turno
                          </label>
                          <select
                            value={formData.escolaridad.turno}
                            onChange={(e) => setFormData({
                              ...formData,
                              escolaridad: { ...formData.escolaridad, turno: e.target.value }
                            })}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                          >
                            <option value="mañana">Mañana</option>
                            <option value="tarde">Tarde</option>
                            <option value="doble">Doble jornada</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dificultades Escolares
                    </label>
                    <textarea
                      rows={3}
                      value={formData.escolaridad.dificultades}
                      onChange={(e) => setFormData({
                        ...formData,
                        escolaridad: { ...formData.escolaridad, dificultades: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                      placeholder="Materias con problemas, relación con docentes, conducta..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ausentismo / Inasistencias
                    </label>
                    <textarea
                      rows={2}
                      value={formData.escolaridad.ausentismo}
                      onChange={(e) => setFormData({
                        ...formData,
                        escolaridad: { ...formData.escolaridad, ausentismo: e.target.value }
                      })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                      placeholder="Frecuencia, motivos, patrones..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-3 bg-crecimiento-500 text-white rounded-lg hover:bg-crecimiento-600 font-medium"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Evaluación Inicial */}
          {step === 4 && (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Evaluación y Pronóstico Inicial</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pronóstico Inicial
                </label>
                <textarea
                  rows={4}
                  value={formData.pronostico_inicial}
                  onChange={(e) => setFormData({ ...formData, pronostico_inicial: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                  placeholder="Expectativas, objetivos a corto y mediano plazo, consideraciones especiales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  rows={4}
                  value={formData.observaciones_generales}
                  onChange={(e) => setFormData({ ...formData, observaciones_generales: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg"
                  placeholder="Cualquier información adicional relevante..."
                />
              </div>

              {/* Upload de Documentos para OCR */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">📄 Documentos (OCR)</h3>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingOCR}
                    className="flex items-center gap-2 px-4 py-2 bg-impulso-400 text-white rounded-lg hover:bg-impulso-500 font-medium disabled:opacity-50"
                  >
                    {isProcessingOCR ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Escanear Documento
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {formData.documentos_ocr.length > 0 && (
                  <div className="space-y-2">
                    {formData.documentos_ocr.map((doc, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium">{doc.nombre}</span>
                        </div>
                        <p className="text-xs text-gray-600">{doc.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Resumen del Ingreso</h3>
                <div className="bg-sol-50 p-4 rounded-lg space-y-2 text-sm">
                  <p><strong>Alias:</strong> {formData.alias || '(sin completar)'}</p>
                  <p><strong>Nombre Completo:</strong> {formData.nombre_completo || '(sin completar)'}</p>
                  <p><strong>Fecha de Nacimiento:</strong> {formData.fecha_nacimiento || '(sin completar)'}</p>
                  <p><strong>Nivel de Alfabetización:</strong> {formData.nivel_alfabetizacion}</p>
                  <p><strong>Transcripciones guardadas:</strong> {formData.transcripciones.length}</p>
                  <p><strong>Documentos escaneados:</strong> {formData.documentos_ocr.length}</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  ← Anterior
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Ingreso Completo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Info */}
        <div className="mt-6 bg-sol-50 border border-sol-200 rounded-lg p-4">
          <h3 className="font-medium text-sol-900 mb-2">ℹ️ Información</h3>
          <ul className="text-sm text-sol-800 space-y-1">
            <li>• El legajo se asignará automáticamente al guardar (formato: APA-0001)</li>
            <li>• Los datos sensibles estarán protegidos y solo visibles para el equipo profesional</li>
            <li>• Las transcripciones de voz se guardan automáticamente cuando detenés la grabación</li>
            <li>• Los documentos escaneados quedarán asociados al perfil del niño</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
