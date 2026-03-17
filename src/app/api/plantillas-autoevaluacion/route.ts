import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';

/**
 * GET /api/plantillas-autoevaluacion
 * Lista todas las capacitaciones activas de tipo 'autoevaluacion'
 * (Migrated from plantillas_autoevaluacion → capacitaciones table)
 * Acceso: Todos los usuarios autenticados
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient(request);

    // Verificar autenticación
    const userId = (supabase as any)._authUserId;
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    let query = supabase
      .from('capacitaciones')
      .select(`
        *,
        preguntas:preguntas_capacitacion(
          id,
          orden,
          pregunta,
          tipo_pregunta,
          puntaje,
          area_especifica,
          opciones:opciones_pregunta(id, orden, texto_opcion, es_correcta)
        )
      `)
      .eq('tipo', 'autoevaluacion')
      .eq('activa', true)
      .order('area', { ascending: true })
      .order('created_at', { ascending: false });

    if (area) {
      query = query.eq('area', area);
    }

    const { data: capacitaciones, error } = await query;

    if (error) {
      console.error('Error al obtener plantillas:', error);
      return NextResponse.json(
        { error: 'Error al obtener plantillas de autoevaluación' },
        { status: 500 }
      );
    }

    // Map to old plantilla shape for frontend compatibility
    const plantillas = (capacitaciones || []).map((c: any) => ({
      id: c.id,
      titulo: c.nombre,
      area: c.area,
      descripcion: c.descripcion,
      activo: c.activa,
      puntaje_maximo: c.puntaje_minimo_aprobacion,
      fecha_creacion: c.created_at,
      preguntas: (c.preguntas || [])
        .sort((a: any, b: any) => a.orden - b.orden)
        .map((p: any) => ({
          id: p.id,
          texto: p.pregunta,
          tipo: mapTipoPregunta(p.tipo_pregunta),
          puntaje: p.puntaje,
          opciones: p.opciones?.sort((a: any, b: any) => a.orden - b.orden).map((o: any) => o.texto_opcion),
          puntaje_por_opcion: p.opciones?.sort((a: any, b: any) => a.orden - b.orden).map((o: any) => o.es_correcta ? p.puntaje : 0),
        })),
    }));

    return NextResponse.json(plantillas, { status: 200 });
  } catch (error) {
    console.error('Error en GET /api/plantillas-autoevaluacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function mapTipoPregunta(tipo: string): string {
  const mapping: Record<string, string> = {
    'multiple_choice': 'multiple_choice',
    'texto_libre': 'texto_abierto',
    'numero': 'escala',
    'verdadero_falso': 'si_no',
    'escala': 'escala',
  };
  return mapping[tipo] || tipo;
}

function mapTipoPreguntaReverse(tipo: string): string {
  const mapping: Record<string, string> = {
    'multiple_choice': 'multiple_choice',
    'texto_abierto': 'texto_libre',
    'escala': 'escala',
    'si_no': 'verdadero_falso',
    'escala_1_5': 'escala',
  };
  return mapping[tipo] || tipo;
}

/**
 * POST /api/plantillas-autoevaluacion
 * Crea una nueva capacitación de tipo 'autoevaluacion' con sus preguntas
 * (Migrated from plantillas_autoevaluacion → capacitaciones + preguntas_capacitacion + opciones_pregunta)
 * Acceso: director, psicopedagogia, coordinador
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient(request);

    let userId = (supabase as any)._authUserId;
    let user = null;
    
    if (!userId) {
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !cookieUser) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
      user = cookieUser;
      userId = user?.id || userId;
    }

    // Verificar rol
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    if (!['director', 'psicopedagogia', 'coordinador', 'trabajador_social', 'admin', 'equipo_profesional'].includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No autorizado. Solo director, psicopedagogía, coordinador, trabajo social o admin pueden crear plantillas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, area, descripcion, preguntas } = body;

    // Validaciones
    if (!titulo || !area || !preguntas) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: titulo, area, preguntas' },
        { status: 400 }
      );
    }

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      return NextResponse.json(
        { error: 'Preguntas debe ser un array no vacío' },
        { status: 400 }
      );
    }

    // 1. Create capacitacion
    const { data: capacitacion, error: capError } = await supabase
      .from('capacitaciones')
      .insert({
        nombre: titulo,
        descripcion: descripcion || null,
        tipo: 'autoevaluacion',
        area,
        es_obligatoria: true,
        puntaje_minimo_aprobacion: 70,
        creado_por: userId,
        activa: true,
      })
      .select()
      .single();

    if (capError) {
      console.error('Error al crear capacitacion:', capError);
      return NextResponse.json(
        { error: 'Error al crear plantilla de autoevaluación' },
        { status: 500 }
      );
    }

    // 2. Create preguntas + opciones
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      const tipoDB = mapTipoPreguntaReverse(pregunta.tipo);

      const { data: preguntaDB, error: pregError } = await supabase
        .from('preguntas_capacitacion')
        .insert({
          capacitacion_id: capacitacion.id,
          orden: i + 1,
          pregunta: pregunta.texto || pregunta.pregunta,
          tipo_pregunta: tipoDB,
          respuesta_correcta: pregunta.respuesta_correcta || '',
          puntaje: pregunta.puntaje || 10,
          area_especifica: pregunta.area_especifica || null,
        })
        .select()
        .single();

      if (pregError) {
        console.error(`Error al crear pregunta ${i}:`, pregError);
        continue;
      }

      // If multiple choice, create opciones
      if (tipoDB === 'multiple_choice' && Array.isArray(pregunta.opciones)) {
        const opciones = pregunta.opciones.map((opcion: string, j: number) => ({
          pregunta_id: preguntaDB.id,
          orden: j + 1,
          texto_opcion: opcion,
          es_correcta: pregunta.puntaje_por_opcion
            ? pregunta.puntaje_por_opcion[j] > 0
            : false,
        }));

        const { error: opError } = await supabase
          .from('opciones_pregunta')
          .insert(opciones);

        if (opError) {
          console.error(`Error al crear opciones para pregunta ${i}:`, opError);
        }
      }
    }

    // Return mapped response
    const plantilla = {
      id: capacitacion.id,
      titulo: capacitacion.nombre,
      area: capacitacion.area,
      descripcion: capacitacion.descripcion,
      activo: capacitacion.activa,
      fecha_creacion: capacitacion.created_at,
      preguntas,
    };

    return NextResponse.json(plantilla, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/plantillas-autoevaluacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
