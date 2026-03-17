// Tipos para artefactos generados por IA

export type TipoArtefacto =
  | 'informe'
  | 'tarjetas'
  | 'cuestionario'
  | 'tabla'
  | 'resumen'
  | 'mapa_mental'
  | 'infografia'
  | 'presentacion';

// Estructura base de un artefacto
export interface Artefacto {
  id: string;
  nino_id: string;
  tipo: TipoArtefacto;
  titulo: string;
  descripcion?: string;
  contenido: ContenidoArtefacto;
  creado_por: string;
  created_at: string;
  updated_at: string;
}

// Union type de todos los contenidos posibles
export type ContenidoArtefacto =
  | ContenidoInforme
  | ContenidoTarjetas
  | ContenidoCuestionario
  | ContenidoTabla
  | ContenidoResumen;

// Informe estructurado con secciones
export interface ContenidoInforme {
  tipo: 'informe';
  secciones: SeccionInforme[];
}

export interface SeccionInforme {
  titulo: string;
  contenido: string;
  subsecciones?: {
    titulo: string;
    contenido: string;
  }[];
}

// Tarjetas didácticas (flashcards)
export interface ContenidoTarjetas {
  tipo: 'tarjetas';
  tarjetas: Tarjeta[];
}

export interface Tarjeta {
  id: string;
  frente: string; // Pregunta/concepto
  dorso: string;  // Respuesta/explicación
  categoria?: string;
}

// Cuestionario/Quiz
export interface ContenidoCuestionario {
  tipo: 'cuestionario';
  preguntas: Pregunta[];
}

export interface Pregunta {
  id: string;
  pregunta: string;
  tipo: 'multiple_choice' | 'verdadero_falso' | 'abierta';
  opciones?: string[]; // Para multiple choice
  respuesta_correcta?: string | number; // Índice o texto
  explicacion?: string;
}

// Tabla de datos
export interface ContenidoTabla {
  tipo: 'tabla';
  columnas: string[];
  filas: Record<string, string | number>[];
  titulo?: string;
  notas?: string;
}

// Resumen general
export interface ContenidoResumen {
  tipo: 'resumen';
  puntos_clave: string[];
  conclusiones: string;
  recomendaciones?: string[];
}

// Metadata para UI
export interface ArtefactoMetadata {
  tipo: TipoArtefacto;
  icono: string; // SVG path
  nombre: string;
  descripcion: string;
  color: string; // Tailwind color class
}

export const TIPOS_ARTEFACTOS: Record<TipoArtefacto, ArtefactoMetadata> = {
  informe: {
    tipo: 'informe',
    icono: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    nombre: 'Informe Completo',
    descripcion: 'Análisis detallado con secciones estructuradas',
    color: 'blue'
  },
  tarjetas: {
    tipo: 'tarjetas',
    icono: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    nombre: 'Tarjetas Didácticas',
    descripcion: 'Flashcards para reforzar conceptos',
    color: 'purple'
  },
  cuestionario: {
    tipo: 'cuestionario',
    icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    nombre: 'Cuestionario',
    descripcion: 'Preguntas para evaluar comprensión',
    color: 'green'
  },
  tabla: {
    tipo: 'tabla',
    icono: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    nombre: 'Tabla de Datos',
    descripcion: 'Información organizada en formato tabular',
    color: 'orange'
  },
  resumen: {
    tipo: 'resumen',
    icono: 'M4 6h16M4 12h16M4 18h7',
    nombre: 'Resumen',
    descripcion: 'Puntos clave y conclusiones',
    color: 'indigo'
  },
  mapa_mental: {
    tipo: 'mapa_mental',
    icono: 'M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    nombre: 'Mapa Mental',
    descripcion: 'Representación visual de conceptos (próximamente)',
    color: 'pink'
  },
  infografia: {
    tipo: 'infografia',
    icono: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    nombre: 'Infografía',
    descripcion: 'Resumen visual con gráficos (próximamente)',
    color: 'yellow'
  },
  presentacion: {
    tipo: 'presentacion',
    icono: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
    nombre: 'Presentación',
    descripcion: 'Diapositivas estructuradas (próximamente)',
    color: 'red'
  }
};
