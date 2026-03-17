// API Route: Analizar transcripción de reunión de ingreso y extraer datos + resumen

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/ia/gemini';

const PROMPT_EXTRAER_DATOS = `Sos un asistente de una ONG educativa en Argentina que trabaja con niños en contextos vulnerables.
Se te va a dar la transcripción de una reunión de ingreso de un niño al programa de alfabetización.

Tu tarea es EXTRAER datos estructurados de la transcripción para pre-llenar un formulario de registro.
Solo extraé lo que se mencione claramente. Si algo no se menciona, dejalo como null.

Respondé EXCLUSIVAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "alias": string | null,
  "apellido": string | null,
  "fecha_nacimiento": "YYYY-MM-DD" | null,
  "genero": "masculino" | "femenino" | "otro" | null,
  "escolarizado": boolean | null,
  "grado_escolar": string | null,
  "turno_escolar": "mañana" | "tarde" | "noche" | null,
  "nombre_escuela": string | null,
  "familiares": [
    {
      "tipo": "madre" | "padre" | "tutor" | "referente_escolar" | "otro",
      "nombre": string,
      "telefono": string | null,
      "relacion": string | null,
      "vive_con_nino": boolean
    }
  ],
  "observaciones": string | null
}

Reglas:
- El "alias" es el nombre de pila del niño (sin apellido)
- El "apellido" es el apellido del niño si se menciona
- Las fechas en formato YYYY-MM-DD
- Si mencionan la edad pero no la fecha exacta, no inventes la fecha, dejala null
- Si dicen "va a tal escuela", extraé el nombre
- Si mencionan a la mamá, papá u otros familiares, agrega cada uno
- "observaciones" puede incluir contexto relevante mencionado (situación familiar, salud, etc.)
- NO incluyas datos que no se hayan mencionado explícitamente
`;

const PROMPT_RESUMEN = `Sos un asistente de una ONG educativa en Argentina que trabaja con niños en contextos vulnerables.
Se te va a dar la transcripción de una reunión de ingreso de un niño al programa de alfabetización.

Generá un RESUMEN CONCISO de la reunión que sea útil para el equipo profesional.
El resumen debe:
1. Tener 3-5 párrafos máximo
2. Incluir los datos principales del niño y su contexto
3. Destacar información relevante para el acompañamiento (situación familiar, salud, escolaridad)
4. Mencionar acuerdos o pasos a seguir si se mencionaron
5. Estar escrito en español, con tono profesional pero empático
6. NO incluir datos sensibles como DNI o dirección exacta

Respondé solo con el texto del resumen, sin formato markdown.
`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify role
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesPermitidos = ['psicopedagogia', 'coordinador', 'trabajador_social', 'director', 'admin', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No tenés permisos para esta acción' }, { status: 403 });
    }

    const { transcripcion, modo } = await request.json();

    if (!transcripcion || typeof transcripcion !== 'string' || transcripcion.trim().length < 20) {
      return NextResponse.json(
        { error: 'La transcripción es demasiado corta para analizar' },
        { status: 400 }
      );
    }

    const model = getModel();

    // Mode: 'extraer' → extract form fields, 'resumen' → generate summary, 'ambos' → both
    const modoFinal = modo || 'ambos';

    let datosExtraidos = null;
    let resumen = null;

    if (modoFinal === 'extraer' || modoFinal === 'ambos') {
      const resultDatos = await model.generateContent(
        `${PROMPT_EXTRAER_DATOS}\n\n--- TRANSCRIPCIÓN ---\n${transcripcion}`
      );
      const textoDatos = resultDatos.response.text().trim();

      try {
        // Try to parse JSON — handle cases where model wraps in backticks
        const cleanJson = textoDatos
          .replace(/^```json?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        datosExtraidos = JSON.parse(cleanJson);
      } catch {
        console.error('Error parsing AI response as JSON:', textoDatos);
        datosExtraidos = null;
      }
    }

    if (modoFinal === 'resumen' || modoFinal === 'ambos') {
      const resultResumen = await model.generateContent(
        `${PROMPT_RESUMEN}\n\n--- TRANSCRIPCIÓN ---\n${transcripcion}`
      );
      resumen = resultResumen.response.text().trim();
    }

    return NextResponse.json({
      ok: true,
      datos_extraidos: datosExtraidos,
      resumen,
    });
  } catch (error: any) {
    console.error('Error en transcripcion-ingreso:', error);
    return NextResponse.json(
      { error: 'Error al procesar la transcripción: ' + (error.message || 'Error interno') },
      { status: 500 }
    );
  }
}
