import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lazy initialization para evitar errores durante el build
let genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no está configurada');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!['psicopedagogia', 'director', 'coordinador'].includes(perfil?.rol || '')) {
      return NextResponse.json({ 
        error: 'No autorizado - requiere rol psicopedagogia, coordinador o director' 
      }, { status: 403 });
    }

    const { tipo_analisis, zona_id, nino_id } = await request.json();

    // Recopilar datos según el tipo de análisis
    let datosContexto: any = {};

    if (tipo_analisis === 'general' || tipo_analisis === 'patrones') {
      // Datos generales del programa
      const [
        { data: ninos },
        { data: sesiones },
        { data: entrevistas },
        { data: deficits },
        { data: zonas }
      ] = await Promise.all([
        supabaseAdmin.from('ninos').select('id, alias, rango_etario, zona_id, fecha_nacimiento'),
        supabaseAdmin.from('sesiones').select('id, nino_id, fecha, duracion_minutos, items, observaciones_libres').order('fecha', { ascending: false }).limit(200),
        supabaseAdmin.from('entrevistas').select('*').order('fecha', { ascending: false }).limit(100),
        supabaseAdmin.from('historico_deficits').select('*').eq('activo', true),
        supabaseAdmin.from('zonas').select('id, nombre')
      ]);

      datosContexto = {
        total_ninos: ninos?.length || 0,
        ninos: ninos?.map((n: any) => ({
          id: n.id,
          alias: n.alias,
          edad: calcularEdad(n.fecha_nacimiento),
          rango_etario: n.rango_etario,
          zona_id: n.zona_id
        })),
        sesiones_recientes: sesiones?.slice(0, 50).map((s: any) => ({
          nino_id: s.nino_id,
          fecha: s.fecha,
          duracion: s.duracion_minutos,
          items: s.items,
          observaciones: s.observaciones_libres?.substring(0, 200)
        })),
        entrevistas: entrevistas?.map((e: any) => ({
          nino_id: e.nino_id,
          fecha: e.fecha,
          tipo: e.tipo,
          observaciones: e.observaciones,
          conclusiones: e.conclusiones
        })),
        deficits_activos: deficits?.map((d: any) => ({
          nino_id: d.nino_id,
          deficit: d.deficit,
          severidad: d.severidad,
          origen: d.origen
        })),
        zonas: zonas
      };
    }

    if (tipo_analisis === 'zona' && zona_id) {
      // Datos específicos de una zona
      const { data: ninosZona } = await supabaseAdmin
        .from('ninos')
        .select('id, alias, rango_etario, fecha_nacimiento')
        .eq('zona_id', zona_id);

      const ninoIds = ninosZona?.map((n: any) => n.id) || [];

      const [
        { data: sesionesZona },
        { data: entrevistasZona },
        { data: zona }
      ] = await Promise.all([
        supabaseAdmin.from('sesiones').select('*').in('nino_id', ninoIds).order('fecha', { ascending: false }).limit(100),
        supabaseAdmin.from('entrevistas').select('*').in('nino_id', ninoIds),
        supabaseAdmin.from('zonas').select('nombre').eq('id', zona_id).single()
      ]);

      datosContexto = {
        zona: zona?.nombre,
        total_ninos: ninosZona?.length || 0,
        ninos: ninosZona?.map((n: any) => ({
          alias: n.alias,
          edad: calcularEdad(n.fecha_nacimiento),
          rango_etario: n.rango_etario
        })),
        sesiones: sesionesZona?.length || 0,
        entrevistas: entrevistasZona?.map((e: any) => ({
          tipo: e.tipo,
          observaciones: e.observaciones,
          conclusiones: e.conclusiones
        }))
      };
    }

    if (tipo_analisis === 'nino' && nino_id) {
      // Datos específicos de un niño
      const [
        { data: nino },
        { data: sesionesNino },
        { data: entrevistasNino },
        { data: deficitsNino }
      ] = await Promise.all([
        supabaseAdmin.from('ninos').select('*').eq('id', nino_id).single(),
        supabaseAdmin.from('sesiones').select('*').eq('nino_id', nino_id).order('fecha', { ascending: false }),
        supabaseAdmin.from('entrevistas').select('*').eq('nino_id', nino_id).order('fecha', { ascending: false }),
        supabaseAdmin.from('historico_deficits').select('*').eq('nino_id', nino_id).eq('activo', true)
      ]);

      datosContexto = {
        nino: {
          alias: nino?.alias,
          edad: calcularEdad(nino?.fecha_nacimiento),
          rango_etario: nino?.rango_etario
        },
        total_sesiones: sesionesNino?.length || 0,
        sesiones_recientes: sesionesNino?.slice(0, 20).map((s: any) => ({
          fecha: s.fecha,
          duracion: s.duracion_minutos,
          items: s.items,
          observaciones: s.observaciones_libres?.substring(0, 300)
        })),
        entrevistas: entrevistasNino?.map((e: any) => ({
          fecha: e.fecha,
          tipo: e.tipo,
          observaciones: e.observaciones,
          conclusiones: e.conclusiones
        })),
        deficits: deficitsNino?.map((d: any) => ({
          deficit: d.deficit,
          severidad: d.severidad,
          origen: d.origen,
          fecha_deteccion: d.fecha_deteccion
        }))
      };
    }

    // Generar análisis con Gemini
    const prompt = generarPromptAnalisis(tipo_analisis, datosContexto);
    
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Limpiar respuesta (remover markdown si existe)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parsear JSON
    const analisis = JSON.parse(text);

    return NextResponse.json(analisis);

  } catch (error: any) {
    console.error('Error al generar análisis:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al generar análisis con IA' 
    }, { status: 500 });
  }
}

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

function promedioArea(evaluacion: any, campos: string[]): number | null {
  const valores = campos
    .map(c => evaluacion[c])
    .filter(v => typeof v === 'number');
  
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

function generarPromptAnalisis(tipo: string, datos: any): string {
  const basePrompt = `Eres un psicopedagogo experto analizando datos de un programa de alfabetización para niños en situación de vulnerabilidad.

IMPORTANTE: Tu análisis debe ser PRÁCTICO, ACCIONABLE y basado en los datos proporcionados.
Responde SOLO con un JSON válido sin ningún texto adicional.`;

  if (tipo === 'general' || tipo === 'patrones') {
    return `${basePrompt}

DATOS DEL PROGRAMA:
${JSON.stringify(datos, null, 2)}

Analiza estos datos y genera un JSON con la siguiente estructura:
{
  "resumen_ejecutivo": "Resumen de 2-3 oraciones del estado general del programa",
  "metricas_clave": {
    "niños_atendidos": number,
    "tasa_progreso_general": "porcentaje estimado basado en evaluaciones",
    "areas_mas_trabajadas": ["área1", "área2"],
    "areas_que_necesitan_atencion": ["área1", "área2"]
  },
  "patrones_identificados": [
    {
      "titulo": "Nombre del patrón",
      "descripcion": "Descripción breve",
      "impacto": "alto" | "medio" | "bajo",
      "ninos_afectados": number
    }
  ],
  "alertas_tempranas": [
    {
      "tipo": "riesgo_abandono" | "estancamiento" | "dificultad_especifica" | "recurso_insuficiente",
      "descripcion": "Descripción de la alerta",
      "urgencia": "alta" | "media" | "baja",
      "accion_sugerida": "Qué hacer al respecto"
    }
  ],
  "tendencias": [
    {
      "area": "lectura" | "escritura" | "matematicas" | "lenguaje" | "asistencia",
      "direccion": "mejorando" | "estable" | "declinando",
      "detalle": "Explicación breve"
    }
  ],
  "recomendaciones": [
    {
      "prioridad": 1,
      "titulo": "Título de la recomendación",
      "descripcion": "Descripción detallada",
      "beneficio_esperado": "Qué se espera lograr"
    }
  ],
  "insights_ia": [
    "Insight 1 basado en correlaciones o patrones no obvios",
    "Insight 2",
    "Insight 3"
  ]
}`;
  }

  if (tipo === 'zona') {
    return `${basePrompt}

DATOS DE LA ZONA "${datos.zona || 'Sin nombre'}":
${JSON.stringify(datos, null, 2)}

Analiza estos datos específicos de la zona y genera un JSON con:
{
  "resumen_zona": "Estado general de la zona en 2-3 oraciones",
  "fortalezas": ["fortaleza1", "fortaleza2"],
  "areas_mejora": ["área1", "área2"],
  "comparacion_promedio": "Cómo se compara esta zona vs el promedio esperado",
  "ninos_destacados": ["alias de niños con buen progreso"],
  "ninos_atencion_prioritaria": ["alias de niños que necesitan más apoyo"],
  "recomendaciones_especificas": [
    {
      "accion": "Qué hacer",
      "razon": "Por qué",
      "plazo": "Inmediato/Corto/Mediano plazo"
    }
  ]
}`;
  }

  if (tipo === 'nino') {
    return `${basePrompt}

DATOS DEL NIÑO "${datos.nino?.alias || 'Sin alias'}":
${JSON.stringify(datos, null, 2)}

Analiza el progreso individual y genera un JSON con:
{
  "perfil_aprendizaje": {
    "estilo_predominante": "visual" | "auditivo" | "kinestésico" | "mixto",
    "fortalezas_cognitivas": ["fortaleza1", "fortaleza2"],
    "areas_desafio": ["área1", "área2"],
    "ritmo_aprendizaje": "rápido" | "promedio" | "requiere más tiempo"
  },
  "progreso_por_area": {
    "lectura": { "nivel_actual": 1-5, "tendencia": "mejorando|estable|declinando", "siguiente_meta": "descripción" },
    "escritura": { "nivel_actual": 1-5, "tendencia": "mejorando|estable|declinando", "siguiente_meta": "descripción" },
    "matematicas": { "nivel_actual": 1-5, "tendencia": "mejorando|estable|declinando", "siguiente_meta": "descripción" },
    "lenguaje": { "nivel_actual": 1-5, "tendencia": "mejorando|estable|declinando", "siguiente_meta": "descripción" }
  },
  "patron_asistencia": "regular" | "irregular" | "frecuente" | "esporádico",
  "alertas": [
    {
      "tipo": "académica" | "conductual" | "asistencia" | "socioemocional",
      "descripcion": "Detalle",
      "urgencia": "alta" | "media" | "baja"
    }
  ],
  "estrategias_sugeridas": [
    {
      "estrategia": "Nombre de la estrategia",
      "descripcion": "Cómo aplicarla",
      "area_objetivo": "Qué área trabaja",
      "frecuencia_sugerida": "Cada cuánto aplicar"
    }
  ],
  "proximos_pasos": [
    "Paso 1 concreto",
    "Paso 2 concreto",
    "Paso 3 concreto"
  ],
  "mensaje_para_voluntario": "Mensaje motivacional y práctico para el voluntario que trabaja con este niño"
}`;
  }

  return basePrompt;
}
