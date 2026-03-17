/**
 * Plantillas pre-armadas de planes de intervención.
 * Organizadas por área, listas para ser aplicadas con un clic en el formulario de nuevo plan.
 */

export interface PlantillaPlan {
  id: string;
  titulo: string;
  descripcion: string;
  area: string;
  prioridad: 'baja' | 'media' | 'alta';
  objetivos: string[];
  actividades_sugeridas: string;
  /** Emoji representativo para la card */
  emoji: string;
  /** Para quién está indicada esta plantilla (orientación rápida) */
  indicado_para: string;
}

export const PLANTILLAS_PLANES: PlantillaPlan[] = [
  // ── LENGUAJE Y VOCABULARIO ──────────────────────────────────────────────
  {
    id: 'lenguaje_vocabulario_ampliacion',
    titulo: 'Ampliación de vocabulario básico',
    descripcion:
      'Plan enfocado en expandir el vocabulario activo y pasivo del niño/a a través de actividades lúdicas y situadas en su contexto cotidiano.',
    area: 'lenguaje_vocabulario',
    prioridad: 'media',
    emoji: '💬',
    indicado_para: 'Niños/as con vocabulario reducido o dificultades para nombrar objetos y acciones',
    objetivos: [
      'Incorporar al menos 20 palabras nuevas en un período de 4 semanas',
      'Utilizar correctamente sustantivos, verbos y adjetivos básicos en oraciones simples',
      'Ampliar el vocabulario referido a su entorno (familia, escuela, barrio, rutinas)',
      'Mejorar la claridad al comunicar necesidades y deseos',
    ],
    actividades_sugeridas:
      'Semana 1-2: Juego del "¿Cómo se llama esto?" con objetos del entorno, lotería de imágenes, cuentos ilustrados con preguntas guiadas.\n' +
      'Semana 3-4: Armado de "mi diccionario personal" con dibujos y palabras clave, rimas y canciones, narración de situaciones cotidianas.\n' +
      'Recurso clave: usar siempre imágenes reales del entorno del niño/a para anclar el vocabulario.',
  },
  {
    id: 'lenguaje_vocabulario_expresion_oral',
    titulo: 'Expresión oral y narración',
    descripcion:
      'Plan orientado a mejorar la capacidad del niño/a de expresarse oralmente, estructurar ideas y narrar experiencias propias o cuentos.',
    area: 'lenguaje_vocabulario',
    prioridad: 'media',
    emoji: '🗣️',
    indicado_para: 'Niños/as con dificultades para organizar el discurso oral, habla muy escueta o tímida',
    objetivos: [
      'Lograr que el niño/a pueda narrar una secuencia de al menos 3 pasos con coherencia',
      'Usar conectores básicos (primero, después, al final) en sus narraciones',
      'Participar activamente en conversaciones de al menos 3 intercambios seguidos',
      'Reducir la dependencia de respuestas monosilábicas en contextos de conversación',
    ],
    actividades_sugeridas:
      'Semana 1: "Cuéntame tu día" — narración libre de actividades cotidianas, con apoyo del voluntario para ampliar.\n' +
      'Semana 2: Secuencias de imágenes desordenadas para ordenar y narrar.\n' +
      'Semana 3: Invención de cuentos cortos a partir de 3 imágenes elegidas por el niño/a.\n' +
      'Semana 4: Entrevistas simples (el niño/a entrevista al voluntario y viceversa).',
  },

  // ── GRAFISMO Y MOTRICIDAD ──────────────────────────────────────────────
  {
    id: 'grafismo_agarre_trazado',
    titulo: 'Fortalecimiento del agarre y trazado',
    descripcion:
      'Plan para trabajar la motricidad fina, el agarre del lápiz y la calidad del trazado en preparación para la escritura formal.',
    area: 'grafismo_motricidad',
    prioridad: 'alta',
    emoji: '✏️',
    indicado_para: 'Niños/as con agarre incorrecto, presión excesiva o débil, trazado irregular',
    objetivos: [
      'Adquirir un agarre funcional del lápiz o lapicera que no genere cansancio',
      'Realizar trazos continuos (líneas, curvas, espirales) con control y fluidez',
      'Completar laberintos de dificultad creciente sin salirse del recorrido',
      'Reducir la fatiga al escribir al menos 5 minutos sin interrupciones',
    ],
    actividades_sugeridas:
      'Calentamiento (5 min): ejercicios de dedos, pellizcar plastilina, abrir y cerrar pinzas.\n' +
      'Actividad principal (15 min): cuadernillos de caligrafia preparatoria — líneas, zigzag, bucles, espirales.\n' +
      'Cierre (5 min): dibujo libre con nombre propio.\n' +
      'Usá lápices de diámetro grueso y colores suaves para reducir la presión.',
  },
  {
    id: 'grafismo_coordinacion_visomotriz',
    titulo: 'Coordinación visomotriz',
    descripcion:
      'Plan para mejorar la integración entre lo que el niño/a ve y la respuesta motriz, base para la escritura y la lectura.',
    area: 'grafismo_motricidad',
    prioridad: 'media',
    emoji: '🎯',
    indicado_para: 'Niños/as que confunden letras de formas similares, tienen dificultades de copista, coordinación ojo-mano débil',
    objetivos: [
      'Copiar figuras geométricas simples con precisión creciente',
      'Reproducir patrones de colores y formas en cuadriculado',
      'Calcar y luego reproducir sin apoyo letras y palabras cortas',
      'Disminuir errores de inversión de letras (b/d, p/q) en el seguimiento visual',
    ],
    actividades_sugeridas:
      'Actividades sugeridas:\n' +
      '- Puntos para unir con regla (de menor a mayor dificultad)\n' +
      '- Completado de figuras simétricas\n' +
      '- Armado de rompecabezas de 15-30 piezas\n' +
      '- Copiado de palabras en cuadriculado con referencia lateral\n' +
      '- Juego "¿Qué cambió?" con tarjetas de letras similares',
  },

  // ── LECTURA Y ESCRITURA ─────────────────────────────────────────────────
  {
    id: 'lectura_escritura_letras_silabas',
    titulo: 'Reconocimiento de letras y sílabas',
    descripcion:
      'Plan inicial de alfabetización orientado al reconocimiento y combinación de letras y sílabas para niños/as en etapa inicial de la lectura.',
    area: 'lectura_escritura',
    prioridad: 'alta',
    emoji: '🔤',
    indicado_para: 'Niños/as que no reconocen el alfabeto completo o no logran combinar sílabas para leer palabras',
    objetivos: [
      'Identificar y nombrar todas las letras del abecedario (mayúsculas y minúsculas)',
      'Leer sílabas directas (consonante + vocal) con fluidez',
      'Armar y leer palabras de 2 sílabas con material concreto (ficheros, letras móviles)',
      'Escribir su nombre y al menos 10 palabras de su entorno de forma autónoma',
    ],
    actividades_sugeridas:
      'Semana 1-2: Repaso del abecedario con canciones, fichero de letras, asociación letra-imagen-palabra.\n' +
      'Semana 3: Armado de sílabas con letras móviles o tarjetas; ruleta de vocales + consonantes.\n' +
      'Semana 4: Lectura de palabras bisilábicas en tarjetas, dictado de palabras conocidas.\n' +
      'Material base: abecedario ilustrado con referentes del entorno del niño/a.',
  },
  {
    id: 'lectura_escritura_comprension',
    titulo: 'Comprensión lectora inicial',
    descripcion:
      'Plan para niños/as que decodifican letras pero presentan dificultades para comprender lo que leen. Trabaja el sentido del texto.',
    area: 'lectura_escritura',
    prioridad: 'media',
    emoji: '📖',
    indicado_para: 'Niños/as que leen de forma mecánica pero no comprenden o responden preguntas sobre el texto',
    objetivos: [
      'Responder preguntas literales sobre textos leídos en sesión (¿quién?, ¿qué pasó?)',
      'Identificar el tema principal de un texto corto con sus propias palabras',
      'Anticipar el contenido de un texto a partir del título e imágenes',
      'Aumentar la fluidez lectora hasta al menos 40 palabras por minuto (según edad)',
    ],
    actividades_sugeridas:
      'Estrategia de lectura compartida: el voluntario lee en voz alta mientras el niño/a sigue con el dedo; luego el niño/a relata lo escuchado.\n' +
      'Actividades: preguntas antes/durante/después de la lectura, dibujar lo que entendió, armar el mapa del cuento (personajes, problema, solución).\n' +
      'Textos recomendados: cuentos cortos, noticias de barrio adaptadas, instrucciones de juegos simples.',
  },

  // ── NOCIONES MATEMÁTICAS ────────────────────────────────────────────────
  {
    id: 'matematica_numeracion',
    titulo: 'Numeración y cardinalidad',
    descripcion:
      'Plan para construir el sentido numérico en niños/as que no han consolidado la correspondencia uno a uno, el conteo o la escritura numérica.',
    area: 'nociones_matematicas',
    prioridad: 'alta',
    emoji: '🔢',
    indicado_para: 'Niños/as que no cuentan con precisión, no reconocen números escritos o no comprenden la cantidad',
    objetivos: [
      'Contar de forma estable hasta 20 con correspondencia uno a uno',
      'Reconocer y escribir los números del 1 al 20',
      'Comparar cantidades usando los términos "más que", "menos que", "igual que"',
      'Componer y descomponer cantidades hasta 10 con material concreto',
    ],
    actividades_sugeridas:
      'Materiales concretos: piedritas, tapitas, palitos, dados, dominó.\n' +
      'Semana 1-2: Conteo de objetos reales, juego "¿cuántos hay?", escalera numérica del 1 al 10.\n' +
      'Semana 3: Introducir el 11-20, línea numérica, lectura y escritura de números.\n' +
      'Semana 4: Comparación de colecciones, juego de la tiendita con monedas de cartón.',
  },
  {
    id: 'matematica_operaciones',
    titulo: 'Operaciones básicas concretas',
    descripcion:
      'Plan para trabajar suma y resta con material concreto como paso previo a la formalización del cálculo escrito.',
    area: 'nociones_matematicas',
    prioridad: 'media',
    emoji: '➕',
    indicado_para: 'Niños/as que no han incorporado la adición y sustracción o tienen dificultades con el algoritmo escrito',
    objetivos: [
      'Resolver sumas y restas hasta 20 con material concreto (palitos, tapitas)',
      'Comprender el concepto de "juntar" y "quitar" en situaciones problemáticas reales',
      'Registrar operaciones simples con escritura numérica convencional',
      'Resolver al menos 3 situaciones-problema orales de suma y resta por sesión',
    ],
    actividades_sugeridas:
      'Presentar siempre la operación en contexto real: "Tenés 5 manzanas y te dan 3 más, ¿cuántas tenés?"\n' +
      'Actividades: dados de suma, dominó, "la tiendita", juegos de cartas con sumas.\n' +
      'Evitar el cálculo abstracto antes de asegurar la comprensión concreta.\n' +
      'Registro: cuadernillo sencillo con dibujos y números para afianzar la representación.',
  },

  // ── SOCIOEMOCIONAL ───────────────────────────────────────────────────────
  {
    id: 'socioemocional_regulacion',
    titulo: 'Regulación emocional y tolerancia a la frustración',
    descripcion:
      'Plan para acompañar al niño/a en el reconocimiento de sus emociones y el desarrollo de estrategias para manejar la frustración durante el aprendizaje.',
    area: 'socioemocional',
    prioridad: 'alta',
    emoji: '🌱',
    indicado_para: 'Niños/as que reaccionan con enojo, llanto o abandono ante errores; baja tolerancia a la frustración',
    objetivos: [
      'Identificar y nombrar al menos 5 emociones básicas en sí mismo/a y en otros',
      'Utilizar al menos 2 estrategias de autorregulación ante situaciones de frustración (ej: respirar, pedir pausa)',
      'Disminuir la frecuencia de reacciones disruptivas ante errores en las actividades de aprendizaje',
      'Fortalecer la percepción de sí mismo/a como alguien capaz de aprender',
    ],
    actividades_sugeridas:
      'Inicio de sesión (5 min): "¿Cómo llegás hoy?" — termómetro emocional o ruleta de emociones.\n' +
      'Actividades: cuentos con personajes que regulan emociones, juego del semáforo emocional, dramatizaciones de situaciones difíciles.\n' +
      'Refuerzo positivo: resaltar siempre el esfuerzo, no solo el resultado.\n' +
      'Acordar una "señal de pausa" con el niño/a para cuando se sienta desbordado/a.',
  },
  {
    id: 'socioemocional_interaccion',
    titulo: 'Habilidades de interacción y vínculo con el voluntario',
    descripcion:
      'Plan para fortalecer el vínculo pedagógico y las habilidades básicas de interacción social del niño/a en el contexto de la sesión educativa.',
    area: 'socioemocional',
    prioridad: 'media',
    emoji: '🤝',
    indicado_para: 'Niños/as muy retraídos, con dificultades para sostener el contacto, o que evitan el vínculo',
    objetivos: [
      'Sostener la atención compartida con el voluntario por al menos 15 minutos seguidos',
      'Iniciar al menos 2 intercambios comunicativos espontáneos por sesión',
      'Aceptar la corrección del voluntario sin reacciones de alejamiento o enojo',
      'Demostrar interés creciente en las actividades propuestas por el voluntario',
    ],
    actividades_sugeridas:
      'El voluntario debe priorizar el juego libre y el seguimiento del interés del niño/a en las primeras sesiones.\n' +
      'Actividades de baja exigencia: juegos de mesa, dibujo libre, armado de figuras.\n' +
      'Incorporar gradualmente actividades de mayor estructuración a medida que el vínculo se consolida.\n' +
      'Registrar en qué actividades el niño/a muestra mayor disposición para ajustar el abordaje.',
  },

  // ── GENERAL ─────────────────────────────────────────────────────────────
  {
    id: 'general_atencion_concentracion',
    titulo: 'Refuerzo de atención y concentración',
    descripcion:
      'Plan transversal para trabajar la atención sostenida y la concentración, base para cualquier proceso de aprendizaje.',
    area: 'general',
    prioridad: 'alta',
    emoji: '🔍',
    indicado_para: 'Niños/as que se distraen fácilmente, no sostienen una actividad más de 5 minutos, presentan alta impulsividad',
    objetivos: [
      'Aumentar el tiempo de atención sostenida a al menos 15 minutos en actividades estructuradas',
      'Completar una actividad propuesta hasta el final sin abandono en al menos el 70% de las sesiones',
      'Reducir la cantidad de interrupciones (cambio de tema, movimiento excesivo) por sesión',
      'Desarrollar la capacidad de seguir instrucciones de al menos 2 pasos secuenciales',
    ],
    actividades_sugeridas:
      'Estructurar cada sesión con una rutina fija y predecible (inicio–desarrollo–cierre).\n' +
      'Actividades: rompecabezas, laberintos, sopas de letras simples, memory, tangram.\n' +
      'Técnica Pomodoro adaptada: 10 min de actividad + 2 min de movimiento libre.\n' +
      'Evitar cambios abruptos; avisar siempre que se va a cambiar de actividad.',
  },
  {
    id: 'general_acompanamiento_integral',
    titulo: 'Acompañamiento integral de base',
    descripcion:
      'Plan general para niños/as en etapa de diagnóstico o que presentan necesidades en múltiples áreas. Permite observar y priorizar antes de elaborar un plan específico.',
    area: 'general',
    prioridad: 'media',
    emoji: '🌟',
    indicado_para: 'Niños/as recién ingresados o con perfil aún no definido; también como plan puente entre etapas',
    objetivos: [
      'Establecer un vínculo de confianza y un ambiente seguro para el aprendizaje',
      'Identificar fortalezas y áreas de mayor dificultad del niño/a a lo largo de las primeras sesiones',
      'Desarrollar hábitos básicos de trabajo: sentarse, escuchar la consigna, pedir ayuda',
      'Registrar observaciones sistemáticas por área para orientar el plan específico siguiente',
    ],
    actividades_sugeridas:
      'Primeras 2 semanas: actividades diagnósticas libres — lectura de imagen, armado de palabras, conteo de objetos, dibujo libre.\n' +
      'El voluntario observa y anota: ¿qué hace con facilidad? ¿qué evita? ¿cómo reacciona ante el error?\n' +
      'Actividades de cierre: siempre terminar con algo que el niño/a pueda hacer bien (refuerzo de autoestima).\n' +
      'Al cabo de 2-3 semanas, compartir las observaciones con el equipo para definir el área prioritaria.',
  },
];

/** Agrupa las plantillas por área */
export function getPlantillasPorArea(): Record<string, PlantillaPlan[]> {
  return PLANTILLAS_PLANES.reduce(
    (acc, p) => {
      if (!acc[p.area]) acc[p.area] = [];
      acc[p.area].push(p);
      return acc;
    },
    {} as Record<string, PlantillaPlan[]>,
  );
}

/** Devuelve una plantilla por ID */
export function getPlantillaById(id: string): PlantillaPlan | undefined {
  return PLANTILLAS_PLANES.find((p) => p.id === id);
}
