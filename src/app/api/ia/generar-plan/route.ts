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

    if (perfil?.rol !== 'psicopedagogia' && perfil?.rol !== 'director') {
      return NextResponse.json({ 
        error: 'No autorizado - requiere rol psicopedagogia' 
      }, { status: 403 });
    }

    const { nino_id, edad, nivel_alfabetizacion, prompt, duracion_semanas } = await request.json();

    if (!nino_id || !prompt) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos' 
      }, { status: 400 });
    }

    // Obtener documentos de la biblioteca (opcional, si existen)
    const { data: documentos } = await supabaseAdmin
      .from('documentos')
      .select('titulo, contenido')
      .limit(3); // Limitar para no saturar el contexto

    // Tipo para documentos de la biblioteca
    type Documento = {
      titulo: string;
      contenido: string | null;
    };

    // Crear prompt para Gemini
    const systemPrompt = `Eres un psicopedagogo experto en alfabetización y educación de niños en contextos vulnerables.

Tu tarea es crear un plan de intervención ESPECÍFICO Y PRÁCTICO con actividades semanales.

INFORMACIÓN DEL NIÑO:
- Edad: ${edad} años
- Nivel de alfabetización: ${nivel_alfabetizacion || 'No especificado'}
- Duración del plan: ${duracion_semanas} semanas

NECESIDADES IDENTIFICADAS:
${prompt}

${documentos && documentos.length > 0 ? `
DOCUMENTOS DE REFERENCIA:
${documentos.map((doc: Documento) => `- ${doc.titulo}: ${doc.contenido?.substring(0, 500)}...`).join('\n')}
` : ''}

GENERA UN PLAN CON:
1. Un título descriptivo del plan
2. Un objetivo general claro y alcanzable
3. ${duracion_semanas} actividades semanales (una por semana)

Para CADA actividad semanal incluye:
- titulo: Título breve de la actividad
- descripcion: Descripción de qué se trabaja
- duracion_minutos: Tiempo estimado (15-45 minutos)
- areas: Array de áreas trabajadas (lectura, escritura, matematica, atencion, etc.)
- objetivos: Array de objetivos específicos de esa semana
- instrucciones: Paso a paso DETALLADO de cómo el voluntario debe realizar la actividad
- materiales: Array de materiales necesarios (sencillos y accesibles)
- indicadores_exito: Array de señales para saber si funcionó

IMPORTANTE:
- Las actividades deben ser PROGRESIVAS (de fácil a difícil)
- Instrucciones CLARAS y ESPECÍFICAS para voluntarios sin formación pedagógica
- Materiales ACCESIBLES y de bajo costo
- Considerar la edad del niño en la complejidad
- Enfoque en lo PRÁCTICO, no teórico

Responde SOLO con un JSON válido con esta estructura:
{
  "titulo": "string",
  "objetivo_general": "string",
  "objetivos_especificos": ["string"],
  "actividades": [
    {
      "titulo": "string",
      "descripcion": "string",
      "duracion_minutos": number,
      "areas": ["string"],
      "objetivos": ["string"],
      "instrucciones": "string detallado",
      "materiales": ["string"],
      "indicadores_exito": ["string"]
    }
  ]
}`;

    // Llamar a Gemini
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    let text = response.text();

    // Limpiar respuesta (remover markdown si existe)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parsear JSON
    const planGenerado = JSON.parse(text);

    return NextResponse.json(planGenerado);

  } catch (error: any) {
    console.error('Error al generar plan:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al generar plan con IA' 
    }, { status: 500 });
  }
}
