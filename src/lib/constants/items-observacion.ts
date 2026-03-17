// Items de observación para registro de sesiones educativas
// Escala Likert: 1 (Muy bajo/Nunca) - 5 (Muy alto/Siempre)

export type Categoria = 
  | 'atencion_concentracion'
  | 'conducta_comportamiento'
  | 'respuesta_emocional'
  | 'lectura_escritura'
  | 'matematica_logica'
  | 'interaccion_voluntario'
  | 'contexto_observado';

export interface ItemObservacion {
  id: string;
  categoria: Categoria;
  texto: string;
  descripcion?: string;
}

export const ITEMS_OBSERVACION: ItemObservacion[] = [
  // 1. ATENCIÓN Y CONCENTRACIÓN (5 ítems)
  {
    id: 'atencion_1',
    categoria: 'atencion_concentracion',
    texto: 'Mantiene atención en la actividad propuesta',
    descripcion: '1=Menos de 2 min, 5=Toda la sesión'
  },
  {
    id: 'atencion_2',
    categoria: 'atencion_concentracion',
    texto: 'Se distrae fácilmente con estímulos externos',
    descripcion: '1=Nunca se distrae, 5=Constantemente distraído'
  },
  {
    id: 'atencion_3',
    categoria: 'atencion_concentracion',
    texto: 'Requiere recordatorios para retomar la tarea',
    descripcion: '1=No requiere, 5=Constantemente'
  },
  {
    id: 'atencion_4',
    categoria: 'atencion_concentracion',
    texto: 'Completa las actividades iniciadas',
    descripcion: '1=Nunca termina, 5=Siempre termina'
  },
  {
    id: 'atencion_5',
    categoria: 'atencion_concentracion',
    texto: 'Muestra interés sostenido en el material',
    descripcion: '1=Desinteresado, 5=Muy interesado'
  },

  // 2. CONDUCTA Y COMPORTAMIENTO (5 ítems)
  {
    id: 'conducta_1',
    categoria: 'conducta_comportamiento',
    texto: 'Se mantiene en su lugar de trabajo',
    descripcion: '1=Se levanta constantemente, 5=Permanece sentado'
  },
  {
    id: 'conducta_2',
    categoria: 'conducta_comportamiento',
    texto: 'Sigue instrucciones verbales',
    descripcion: '1=No sigue, 5=Sigue inmediatamente'
  },
  {
    id: 'conducta_3',
    categoria: 'conducta_comportamiento',
    texto: 'Respeta los tiempos de la actividad',
    descripcion: '1=No respeta, 5=Respeta completamente'
  },
  {
    id: 'conducta_4',
    categoria: 'conducta_comportamiento',
    texto: 'Maneja la frustración ante dificultades',
    descripcion: '1=Se enoja/abandona, 5=Persiste con calma'
  },
  {
    id: 'conducta_5',
    categoria: 'conducta_comportamiento',
    texto: 'Muestra disposición para trabajar',
    descripcion: '1=Muy resistente, 5=Muy dispuesto'
  },

  // 3. RESPUESTA EMOCIONAL (6 ítems)
  {
    id: 'emocional_1',
    categoria: 'respuesta_emocional',
    texto: 'Nivel de motivación al inicio de la sesión',
    descripcion: '1=Desmotivado, 5=Muy motivado'
  },
  {
    id: 'emocional_2',
    categoria: 'respuesta_emocional',
    texto: 'Expresa alegría durante las actividades',
    descripcion: '1=Nunca, 5=Constantemente'
  },
  {
    id: 'emocional_3',
    categoria: 'respuesta_emocional',
    texto: 'Muestra frustración ante errores',
    descripcion: '1=Nunca, 5=Muy frecuentemente'
  },
  {
    id: 'emocional_4',
    categoria: 'respuesta_emocional',
    texto: 'Se anima con refuerzos positivos',
    descripcion: '1=No responde, 5=Responde muy bien'
  },
  {
    id: 'emocional_5',
    categoria: 'respuesta_emocional',
    texto: 'Expresa confianza en sus capacidades',
    descripcion: '1=Muy inseguro, 5=Muy confiado'
  },
  {
    id: 'emocional_6',
    categoria: 'respuesta_emocional',
    texto: 'Estado de ánimo general durante la sesión',
    descripcion: '1=Muy triste/apático, 5=Muy alegre/activo'
  },

  // 4. LECTURA Y ESCRITURA (7 ítems)
  {
    id: 'lectura_1',
    categoria: 'lectura_escritura',
    texto: 'Reconoce letras del alfabeto',
    descripcion: '1=Ninguna, 5=Todas'
  },
  {
    id: 'lectura_2',
    categoria: 'lectura_escritura',
    texto: 'Identifica sonidos de letras (conciencia fonológica)',
    descripcion: '1=No identifica, 5=Identifica todos'
  },
  {
    id: 'lectura_3',
    categoria: 'lectura_escritura',
    texto: 'Lee palabras simples',
    descripcion: '1=No lee, 5=Lee fluidamente'
  },
  {
    id: 'lectura_4',
    categoria: 'lectura_escritura',
    texto: 'Comprende lo que lee',
    descripcion: '1=No comprende, 5=Comprende todo'
  },
  {
    id: 'lectura_5',
    categoria: 'lectura_escritura',
    texto: 'Escribe su nombre',
    descripcion: '1=No escribe, 5=Escribe correctamente'
  },
  {
    id: 'lectura_6',
    categoria: 'lectura_escritura',
    texto: 'Copia palabras o frases',
    descripcion: '1=No copia, 5=Copia correctamente'
  },
  {
    id: 'lectura_7',
    categoria: 'lectura_escritura',
    texto: 'Escribe de manera espontánea (dictado/expresión)',
    descripcion: '1=No escribe, 5=Escribe oraciones completas'
  },

  // 5. MATEMÁTICA Y LÓGICA (5 ítems)
  {
    id: 'matematica_1',
    categoria: 'matematica_logica',
    texto: 'Reconoce números',
    descripcion: '1=Ninguno, 5=Todos presentados'
  },
  {
    id: 'matematica_2',
    categoria: 'matematica_logica',
    texto: 'Comprende conceptos de cantidad (más/menos)',
    descripcion: '1=No comprende, 5=Comprende totalmente'
  },
  {
    id: 'matematica_3',
    categoria: 'matematica_logica',
    texto: 'Realiza conteo',
    descripcion: '1=No cuenta, 5=Cuenta correctamente'
  },
  {
    id: 'matematica_4',
    categoria: 'matematica_logica',
    texto: 'Resuelve sumas/restas simples',
    descripcion: '1=No resuelve, 5=Resuelve correctamente'
  },
  {
    id: 'matematica_5',
    categoria: 'matematica_logica',
    texto: 'Resuelve problemas lógicos simples',
    descripcion: '1=No resuelve, 5=Resuelve bien'
  },

  // 6. INTERACCIÓN CON EL VOLUNTARIO (5 ítems)
  {
    id: 'interaccion_1',
    categoria: 'interaccion_voluntario',
    texto: 'Establece contacto visual',
    descripcion: '1=Nunca, 5=Constantemente'
  },
  {
    id: 'interaccion_2',
    categoria: 'interaccion_voluntario',
    texto: 'Responde preguntas verbalmente',
    descripcion: '1=No responde, 5=Responde claramente'
  },
  {
    id: 'interaccion_3',
    categoria: 'interaccion_voluntario',
    texto: 'Pide ayuda cuando la necesita',
    descripcion: '1=Nunca pide, 5=Pide apropiadamente'
  },
  {
    id: 'interaccion_4',
    categoria: 'interaccion_voluntario',
    texto: 'Muestra confianza con el voluntario',
    descripcion: '1=Muy desconfiado, 5=Muy confiado'
  },
  {
    id: 'interaccion_5',
    categoria: 'interaccion_voluntario',
    texto: 'Comparte información personal/situaciones',
    descripcion: '1=Muy cerrado, 5=Muy abierto'
  },

  // 7. CONTEXTO OBSERVADO (4 ítems)
  {
    id: 'contexto_1',
    categoria: 'contexto_observado',
    texto: 'Asistió a la escuela esta semana',
    descripcion: '1=No asistió, 5=Asistió todos los días'
  },
  {
    id: 'contexto_2',
    categoria: 'contexto_observado',
    texto: 'Llegó en condiciones adecuadas (descanso, alimentación)',
    descripcion: '1=Muy inadecuado, 5=Muy adecuado'
  },
  {
    id: 'contexto_3',
    categoria: 'contexto_observado',
    texto: 'Menciona situaciones familiares/emocionales relevantes',
    descripcion: '1=No menciona, 5=Menciona situaciones importantes'
  },
  {
    id: 'contexto_4',
    categoria: 'contexto_observado',
    texto: 'Continuidad con sesiones anteriores',
    descripcion: '1=Sin continuidad, 5=Excelente continuidad'
  }
];

export const CATEGORIAS_LABELS: Record<Categoria, string> = {
  atencion_concentracion: '🎯 Atención y Concentración',
  conducta_comportamiento: '🧘 Conducta y Comportamiento',
  respuesta_emocional: '💙 Respuesta Emocional',
  lectura_escritura: '📖 Lectura y Escritura',
  matematica_logica: '🔢 Matemática y Lógica',
  interaccion_voluntario: '🤝 Interacción con el Voluntario',
  contexto_observado: '🏠 Contexto Observado'
};

export const ESCALA_LIKERT = [
  { valor: 1, label: '1', descripcion: 'Muy bajo' },
  { valor: 2, label: '2', descripcion: 'Bajo' },
  { valor: 3, label: '3', descripcion: 'Medio' },
  { valor: 4, label: '4', descripcion: 'Alto' },
  { valor: 5, label: '5', descripcion: 'Muy alto' }
];

// Valor especial para "No completó el campo" — se excluye del cálculo de promedios
export const VALOR_NO_COMPLETADO = 0;
export const LABEL_NO_COMPLETADO = 'N/C';

/**
 * Calcula el promedio excluyendo ítems marcados como "No completó" (valor 0).
 * Si no hay ítems válidos, retorna 0.
 */
export function calcularPromedioItems(items: Array<{ valor: number }>): number {
  if (!items || items.length === 0) return 0;
  const itemsValidos = items.filter(item => item.valor !== VALOR_NO_COMPLETADO && item.valor != null);
  if (itemsValidos.length === 0) return 0;
  const sum = itemsValidos.reduce((acc, item) => acc + item.valor, 0);
  return parseFloat((sum / itemsValidos.length).toFixed(1));
}

/**
 * Cuenta cuántos ítems fueron efectivamente completados (excluye N/C).
 */
export function contarItemsCompletados(items: Array<{ valor: number }>): { completados: number; noCompletados: number; total: number } {
  if (!items || items.length === 0) return { completados: 0, noCompletados: 0, total: 0 };
  const completados = items.filter(item => item.valor !== VALOR_NO_COMPLETADO && item.valor != null).length;
  const noCompletados = items.filter(item => item.valor === VALOR_NO_COMPLETADO).length;
  return { completados, noCompletados, total: items.length };
}
