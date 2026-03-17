// Tipos para Panel de Profesionales (Psicopedagogía / Trabajo Social)

export interface EvaluacionInicial {
  id: string;
  nino_id: string;
  psicopedagoga_id: string;
  fecha_evaluacion: Date;
  
  // Lenguaje y Vocabulario
  comprension_ordenes: 1 | 2 | 3 | 4 | 5;
  identificacion_objetos: 1 | 2 | 3 | 4 | 5;
  formacion_oraciones: 1 | 2 | 3 | 4 | 5;
  pronunciacion: 1 | 2 | 3 | 4 | 5;
  notas_lenguaje?: string;
  
  // Grafismo y Motricidad Fina
  agarre_lapiz: 'adecuado' | 'inadecuado' | 'en_desarrollo';
  tipo_trazo: 'firme' | 'tembloroso' | 'irregular';
  representacion_figuras: 1 | 2 | 3 | 4 | 5;
  notas_grafismo?: string;
  
  // Lectura y Escritura
  reconocimiento_vocales: 1 | 2 | 3 | 4 | 5;
  reconocimiento_consonantes: 1 | 2 | 3 | 4 | 5;
  identificacion_silabas: 1 | 2 | 3 | 4 | 5;
  lectura_palabras: 1 | 2 | 3 | 4 | 5;
  lectura_textos: 1 | 2 | 3 | 4 | 5;
  escritura_nombre: 1 | 2 | 3 | 4 | 5;
  escritura_palabras: 1 | 2 | 3 | 4 | 5;
  escritura_oraciones: 1 | 2 | 3 | 4 | 5;
  comprension_lectora: 1 | 2 | 3 | 4 | 5;
  notas_lectoescritura?: string;
  
  // Nociones Matemáticas
  conteo: 1 | 2 | 3 | 4 | 5;
  reconocimiento_numeros: 1 | 2 | 3 | 4 | 5;
  suma_basica: 1 | 2 | 3 | 4 | 5;
  resta_basica: 1 | 2 | 3 | 4 | 5;
  razonamiento_logico: 1 | 2 | 3 | 4 | 5;
  notas_matematicas?: string;
  
  // Conclusiones
  dificultades_identificadas: string[];
  fortalezas: string[];
  nivel_alfabetizacion: string;
  observaciones_generales: string;
  recomendaciones: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface PlanIntervencion {
  id: string;
  nino_id: string;
  evaluacion_id: string;
  psicopedagoga_id: string;
  
  // Objetivos
  objetivos_anuales: ObjetivoAnual[];
  objetivos_mensuales: ObjetivoMensual[];
  
  // Actividades y materiales
  actividades_sugeridas: ActividadSugerida[];
  materiales_necesarios: string[];
  
  // Asignación
  voluntario_asignado_id?: string;
  fecha_inicio: Date;
  fecha_estimada_fin?: Date;
  
  estado: 'activo' | 'pausado' | 'completado' | 'archivado';
  
  created_at: Date;
  updated_at: Date;
}

export interface ObjetivoAnual {
  id: string;
  descripcion: string;
  area: 'lectura' | 'escritura' | 'matematica' | 'lenguaje' | 'atencion' | 'otro';
  prioridad: 'alta' | 'media' | 'baja';
  fecha_inicio: Date;
  fecha_objetivo: Date;
  estado: 'pendiente' | 'en_progreso' | 'alcanzado' | 'modificado';
}

export interface ObjetivoMensual {
  id: string;
  objetivo_anual_id: string;
  mes: number; // 1-12
  anio: number;
  descripcion: string;
  indicadores_logro: string[];
  estado: 'pendiente' | 'en_progreso' | 'alcanzado' | 'no_alcanzado';
  observaciones?: string;
  fecha_evaluacion?: Date;
}

export interface ActividadSugerida {
  id: string;
  nombre: string;
  descripcion: string;
  objetivo_relacionado_id: string;
  duracion_estimada: number; // minutos
  materiales: string[];
  instrucciones: string;
  frecuencia_sugerida: 'diaria' | 'semanal' | 'quincenal';
  documento_referencia_id?: string; // referencia a biblioteca
}

export interface SeguimientoMensual {
  id: string;
  nino_id: string;
  plan_intervencion_id: string;
  psicopedagoga_id: string;
  mes: number;
  anio: number;
  
  // Evaluación del mes
  objetivos_evaluados: {
    objetivo_id: string;
    alcanzado: boolean;
    porcentaje_logro: number;
    observaciones: string;
  }[];
  
  // Análisis de sesiones del mes
  sesiones_analizadas: number;
  patrones_detectados: string[];
  fortalezas_observadas: string[];
  dificultades_persistentes: string[];
  
  // Decisiones
  ajustes_plan: string;
  cambio_objetivos: boolean;
  cambio_actividades: boolean;
  derivacion_necesaria: boolean;
  derivacion_a?: string;
  
  // IA
  resumen_ia?: string;
  sugerencias_ia?: string[];
  
  fecha_evaluacion: Date;
  created_at: Date;
}

// Tipos para Trabajo Social

export interface EntrevistaFamiliar {
  id: string;
  nino_id: string;
  trabajadora_social_id: string;
  fecha_entrevista: Date;
  
  // Información básica
  tipo_entrevista: 'inicial' | 'seguimiento' | 'urgencia';
  lugar_entrevista: string;
  personas_presentes: PersonaPresente[];
  
  // Embarazo y primeros años
  alimentacion_embarazo: string;
  controles_prenatales: boolean;
  complicaciones_embarazo?: string;
  
  // Alimentación actual
  alimentacion_actual: string;
  comidas_diarias: number;
  calidad_alimentacion: 'buena' | 'regular' | 'deficiente';
  notas_alimentacion?: string;
  
  // Escolaridad
  asiste_escuela: boolean;
  nombre_escuela?: string;
  grado_actual?: string;
  asistencia_regular: boolean;
  dificultades_escolares?: string;
  
  // Contexto familiar
  composicion_familiar: ComposicionFamiliar;
  vivienda: InformacionVivienda;
  situacion_economica: SituacionEconomica;
  
  // Salud
  obra_social: boolean;
  cual_obra_social?: string;
  controles_salud_regulares: boolean;
  medicacion_actual?: string;
  diagnosticos_previos?: string[];
  
  // Dinámicas familiares
  relacion_padres: string;
  relacion_hermanos?: string;
  red_apoyo_familiar: string;
  participacion_comunitaria: string;
  
  // Observaciones y evaluación
  observaciones_trabajadora_social: string;
  situacion_riesgo: boolean;
  tipo_riesgo?: string[];
  derivaciones_sugeridas?: string[];
  prioridad_atencion: 'baja' | 'media' | 'alta' | 'urgente';
  
  // Grabación de voz (opcional)
  audio_entrevista_url?: string;
  audio_transcription?: string;
  
  // Seguimiento
  proxima_visita?: Date;
  acciones_pendientes?: string[];
  
  created_offline: boolean;
  sincronizado_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PersonaPresente {
  nombre: string;
  relacion: string; // madre, padre, tutor, etc.
  edad?: number;
}

export interface ComposicionFamiliar {
  adultos_responsables: number;
  hermanos: number;
  otros_convivientes: number;
  descripcion: string;
}

export interface InformacionVivienda {
  tipo: 'casa' | 'departamento' | 'precaria' | 'otro';
  propia: boolean;
  ambientes: number;
  servicios_basicos: {
    agua: boolean;
    luz: boolean;
    gas: boolean;
    cloacas: boolean;
  };
  condiciones: 'buenas' | 'regulares' | 'malas';
  observaciones?: string;
}

export interface SituacionEconomica {
  trabajo_padre?: string;
  trabajo_madre?: string;
  ingresos_aproximados: 'muy_bajos' | 'bajos' | 'medios' | 'adecuados';
  recibe_ayuda_social: boolean;
  tipo_ayuda?: string[];
  observaciones?: string;
}

export interface AlertaSocial {
  id: string;
  nino_id: string;
  trabajadora_social_id: string;
  tipo_alerta: 
    | 'ausentismo_escolar' 
    | 'cambio_contexto_familiar' 
    | 'situacion_riesgo'
    | 'salud'
    | 'violencia'
    | 'otro';
  
  gravedad: 'baja' | 'media' | 'alta' | 'critica';
  descripcion: string;
  acciones_tomadas?: string;
  derivado_a?: string;
  
  estado: 'activa' | 'en_seguimiento' | 'resuelta' | 'derivada';
  
  fecha_alerta: Date;
  fecha_resolucion?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SeguimientoFamiliar {
  id: string;
  nino_id: string;
  trabajadora_social_id: string;
  entrevista_relacionada_id?: string;
  
  fecha_seguimiento: Date;
  tipo_contacto: 'visita_domiciliaria' | 'telefono' | 'presencial_centro' | 'otro';
  
  situacion_actual: string;
  cambios_contexto: string;
  cumplimiento_acuerdos: boolean;
  observaciones: string;
  
  proxima_accion: string;
  fecha_proxima_accion?: Date;
  
  created_offline: boolean;
  sincronizado_at?: Date;
  created_at: Date;
}
