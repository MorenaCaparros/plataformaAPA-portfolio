// Tipos TypeScript que reflejan la estructura relacional de 31 tablas
// Generado a partir de: 20260210_REESTRUCTURACION_27_TABLAS_COMPLETA.sql

// =====================================================
// TABLAS BASE
// =====================================================

export interface Zona {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
  coordinador_id: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Escuela {
  id: string;
  nombre: string;
  zona_id: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  director_nombre: string | null;
  turno: 'mañana' | 'tarde' | 'noche' | 'doble' | null;
  nivel: 'inicial' | 'primaria' | 'secundaria' | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// PERFILES
// =====================================================

export type RolUsuario = 'voluntario' | 'coordinador' | 'psicopedagogia' | 'trabajadora_social' | 'trabajador_social' | 'director' | 'admin' | 'equipo_profesional';

export interface Perfil {
  id: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  zona_id: string | null;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string;
  direccion: string | null;
  foto_perfil_url: string | null;
  fecha_ingreso: string;
  max_ninos_asignados: number;
  horas_disponibles: number | null;
  activo: boolean;
  password_temporal: boolean;
  ultima_conexion: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerfilZona {
  id: string;
  perfil_id: string;
  zona_id: string;
  es_principal: boolean;
  fecha_asignacion: string;
  activa: boolean;
  created_at: string;
}

export interface EstudioPerfil {
  id: string;
  perfil_id: string;
  titulo: string;
  institucion: string | null;
  nivel: 'secundario' | 'terciario' | 'universitario' | 'posgrado' | null;
  estado: 'en_curso' | 'completo' | 'incompleto' | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  especialidad: string | null;
  created_at: string;
}

// =====================================================
// NIÑOS (Core del sistema)
// =====================================================

export type RangoEtario = '5-7' | '8-10' | '11-13' | '14-16' | '17+';
export type Genero = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
export type TurnoEscolar = 'mañana' | 'tarde' | 'noche';

export interface Nino {
  id: string;
  alias: string;
  legajo: string | null;
  zona_id: string | null;
  escuela_id: string | null;
  fecha_nacimiento: string | null;
  rango_etario: RangoEtario | null;
  genero: Genero | null;
  foto_perfil_url: string | null;
  nivel_alfabetizacion: string | null;
  escolarizado: boolean;
  grado_escolar: string | null;
  turno_escolar: TurnoEscolar | null;
  activo: boolean;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

// Datos sensibles (PII encriptada) - Solo accesible por psicopedagogia/director/admin
export interface NinoSensible {
  id: string;
  nino_id: string;
  nombre_completo_encrypted: string;
  apellido_encrypted: string;
  fecha_nacimiento_encrypted: string | null;
  dni_encrypted: string | null;
  direccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamiliarApoyo {
  id: string;
  nino_id: string;
  tipo: 'padre' | 'madre' | 'tutor' | 'referente_escolar' | 'otro';
  nombre: string;
  telefono: string | null;
  email: string | null;
  relacion: string | null;
  vive_con_nino: boolean;
  es_contacto_principal: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlimentacionNino {
  id: string;
  nino_id: string;
  recibe_alimentacion_escolar: boolean | null;
  cantidad_comidas_diarias: number | null;
  tipo_alimentacion: 'completa' | 'incompleta' | 'insuficiente' | 'desconocido' | null;
  alergias: string | null;
  observaciones: string | null;
  ultima_actualizacion: string;
  created_at: string;
  updated_at: string;
}

export interface EscolaridadNino {
  id: string;
  nino_id: string;
  ciclo_lectivo: number;
  grado: string | null;
  turno: TurnoEscolar | null;
  repitente: boolean;
  asistencia_regular: boolean;
  motivo_inasistencias: string | null;
  rendimiento_general: string | null;
  materias_dificultad: string[] | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaludNino {
  id: string;
  nino_id: string;
  obra_social: string | null;
  numero_afiliado: string | null;
  alergias: string | null;
  medicacion_habitual: string | null;
  condiciones_preexistentes: string | null;
  usa_lentes: boolean;
  usa_audifono: boolean;
  requiere_acompanamiento_especial: boolean;
  observaciones: string | null;
  ultima_actualizacion: string;
  created_at: string;
  updated_at: string;
}

export interface Entrevista {
  id: string;
  nino_id: string;
  entrevistador_id: string | null;
  tipo: 'inicial' | 'seguimiento' | 'familiar' | 'escolar' | 'cierre' | null;
  fecha: string;
  duracion_minutos: number | null;
  participantes: string[] | null;
  observaciones: string | null;
  conclusiones: string | null;
  acciones_sugeridas: string | null;
  grabacion_url: string | null;
  created_at: string;
}

export interface GrabacionVoz {
  id: string;
  entrevista_id: string | null;
  nino_id: string | null;
  usuario_id: string | null;
  storage_path: string;
  duracion_segundos: number | null;
  formato: string | null;
  tamanio_bytes: number | null;
  transcripcion: string | null;
  fecha_grabacion: string;
  procesada: boolean;
  created_at: string;
}

export interface HistoricoDeficit {
  id: string;
  nino_id: string;
  deficit: string;
  area: string;
  severidad: 'leve' | 'moderado' | 'severo' | null;
  fecha_deteccion: string;
  fecha_resolucion: string | null;
  activo: boolean;
  observaciones: string | null;
  detectado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asistencia {
  id: string;
  nino_id: string;
  fecha: string;
  presente: boolean;
  motivo_ausencia: string | null;
  registrado_por: string | null;
  created_at: string;
}

// =====================================================
// ASIGNACIONES (reemplaza nino_voluntarios)
// =====================================================

export interface Asignacion {
  id: string;
  nino_id: string;
  voluntario_id: string;
  fecha_asignacion: string;
  fecha_fin: string | null;
  activa: boolean;
  motivo_fin: string | null;
  score_matching: number | null;
  criterios_aplicados: Record<string, unknown> | null;
  deficit_principal: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricoAsignacion {
  id: string;
  asignacion_id: string | null;
  nino_id: string;
  voluntario_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_dias: number | null;
  motivo_fin: string | null;
  score_inicial: number | null;
  score_final: number | null;
  sesiones_realizadas: number;
  observaciones: string | null;
  created_at: string;
}

// =====================================================
// CAPACITACIONES Y AUTOEVALUACIONES
// =====================================================

export type TipoCapacitacion = 'autoevaluacion' | 'capacitacion';
export type EstadoVoluntarioCapacitacion = 'pendiente' | 'en_progreso' | 'completada' | 'aprobada' | 'reprobada';

export interface Capacitacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoCapacitacion;
  area: string;
  es_obligatoria: boolean;
  puntaje_minimo_aprobacion: number;
  duracion_estimada_minutos: number | null;
  creado_por: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreguntaCapacitacion {
  id: string;
  capacitacion_id: string | null;
  orden: number;
  pregunta: string;
  tipo_pregunta: 'multiple_choice' | 'texto_libre' | 'numero' | 'verdadero_falso' | 'escala';
  respuesta_correcta: string;
  criterios_evaluacion: string | null;
  puntaje: number;
  area_especifica: string | null;
  created_at: string;
}

export interface OpcionPregunta {
  id: string;
  pregunta_id: string | null;
  orden: number;
  texto_opcion: string;
  es_correcta: boolean;
  created_at: string;
}

export interface VoluntarioCapacitacion {
  id: string;
  voluntario_id: string | null;
  capacitacion_id: string | null;
  estado: EstadoVoluntarioCapacitacion;
  fecha_inicio: string | null;
  fecha_completado: string | null;
  puntaje_final: number;
  puntaje_maximo: number | null;
  porcentaje: number | null;
  intentos: number;
  tiempo_total_minutos: number | null;
  created_at: string;
  updated_at: string;
}

export interface RespuestaCapacitacion {
  id: string;
  voluntario_capacitacion_id: string | null;
  pregunta_id: string | null;
  respuesta: string;
  es_correcta: boolean | null;
  puntaje_obtenido: number;
  tiempo_respuesta_segundos: number | null;
  created_at: string;
}

export interface ScoreVoluntarioPorArea {
  id: string;
  voluntario_id: string | null;
  area: string;
  score_autoevaluacion: number;
  score_capacitaciones: number;
  score_final: number; // Generated column
  necesita_capacitacion: boolean;
  fecha_ultima_evaluacion: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS CON RELACIONES (para queries con joins)
// =====================================================

/** Niño con zona expandida (para listados) */
export interface NinoConZona extends Nino {
  zonas: Zona | null;
}

/** Niño con datos sensibles (solo psicopedagogia/director/admin) */
export interface NinoConSensibles extends Nino {
  ninos_sensibles: NinoSensible | null;
  zonas: Zona | null;
  escuelas: Escuela | null;
}

/** Niño para la card del listado (vista simplificada) */
export interface NinoListado {
  id: string;
  alias: string;
  legajo: string | null;
  rango_etario: RangoEtario | null;
  nivel_alfabetizacion: string | null;
  escolarizado: boolean;
  grado_escolar: string | null;
  activo: boolean;
  zonas: { id: string; nombre: string } | null;
  // Datos sensibles (solo para roles con acceso)
  ninos_sensibles?: {
    nombre_completo_encrypted: string;
    apellido_encrypted: string;
  } | null;
  // Calculados en frontend
  total_sesiones?: number;
  ultima_sesion?: string | null;
}

/** Asignación con voluntario y niño expandidos */
export interface AsignacionConDetalles extends Asignacion {
  perfiles: Pick<Perfil, 'id' | 'nombre' | 'apellido'>;
  ninos: Pick<Nino, 'id' | 'alias' | 'rango_etario'>;
}
