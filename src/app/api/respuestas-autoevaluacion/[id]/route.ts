import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';

/**
 * PATCH /api/respuestas-autoevaluacion/[id]
 * Evalúa una respuesta de autoevaluación (asignar puntaje manual)
 * (Migrated from respuestas_autoevaluacion → voluntarios_capacitaciones)
 * Acceso: psicopedagogia, coordinador, director
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .select('id, rol')
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
        { error: 'No autorizado. Solo director, equipo profesional, coordinador, trabajo social o admin pueden evaluar' },
        { status: 403 }
      );
    }

    const respuestaId = params.id;

    const body = await request.json();
    const { puntaje_manual, comentarios_evaluador } = body;

    if (puntaje_manual === undefined || puntaje_manual === null) {
      return NextResponse.json(
        { error: 'Debe proporcionar puntaje_manual' },
        { status: 400 }
      );
    }

    if (puntaje_manual < 0 || puntaje_manual > 10) {
      return NextResponse.json(
        { error: 'Puntaje manual debe estar entre 0 y 10' },
        { status: 400 }
      );
    }

    // Get current voluntarios_capacitaciones record
    const { data: volCap, error: volCapError } = await supabase
      .from('voluntarios_capacitaciones')
      .select('*')
      .eq('id', respuestaId)
      .single();

    if (volCapError || !volCap) {
      return NextResponse.json(
        { error: 'Respuesta de autoevaluación no encontrada' },
        { status: 404 }
      );
    }

    if (volCap.estado === 'aprobada' || volCap.estado === 'reprobada') {
      return NextResponse.json(
        { error: 'Esta respuesta ya fue evaluada' },
        { status: 400 }
      );
    }

    // Convert puntaje_manual (0-10) to percentage
    const puntajeManualPct = Math.round(puntaje_manual * 10);
    const aprobada = puntajeManualPct >= 70;

    // Update voluntarios_capacitaciones
    const { data: updated, error: updateError } = await supabase
      .from('voluntarios_capacitaciones')
      .update({
        puntaje_final: puntajeManualPct,
        porcentaje: puntajeManualPct,
        estado: aprobada ? 'aprobada' : 'reprobada',
      })
      .eq('id', respuestaId)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar respuesta:', updateError);
      return NextResponse.json(
        { error: 'Error al evaluar respuesta de autoevaluación' },
        { status: 500 }
      );
    }

    // Map to old response shape
    const respuestaFormateada = {
      id: updated.id,
      plantilla_id: updated.capacitacion_id,
      voluntario_id: updated.voluntario_id,
      puntaje_manual,
      puntaje_total: puntaje_manual,
      puntaje_automatico: volCap.puntaje_final ? volCap.puntaje_final / 10 : 0,
      estado: 'evaluada',
      comentarios_evaluador: comentarios_evaluador || null,
    };

    return NextResponse.json(respuestaFormateada, { status: 200 });
  } catch (error) {
    console.error('Error en PATCH /api/respuestas-autoevaluacion/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/respuestas-autoevaluacion/[id]
 * Obtiene una respuesta específica con todos sus detalles
 * (Migrated from respuestas_autoevaluacion → voluntarios_capacitaciones)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedClient(request);

    let userId = (supabase as any)._authUserId;
    
    if (!userId) {
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !cookieUser) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
      userId = cookieUser.id;
    }

    const respuestaId = params.id;

    // Get voluntarios_capacitaciones with related data
    const { data: volCap, error } = await supabase
      .from('voluntarios_capacitaciones')
      .select(`
        *,
        capacitacion:capacitaciones(
          id, nombre, descripcion, area, tipo,
          preguntas:preguntas_capacitacion(
            id, orden, pregunta, tipo_pregunta, puntaje,
            opciones:opciones_pregunta(id, orden, texto_opcion, es_correcta)
          )
        ),
        voluntario:perfiles!voluntarios_capacitaciones_voluntario_id_fkey(id, nombre, apellido)
      `)
      .eq('id', respuestaId)
      .single();

    if (error || !volCap) {
      return NextResponse.json(
        { error: 'Respuesta no encontrada' },
        { status: 404 }
      );
    }

    // Verify permissions
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();

    if (perfil?.rol === 'voluntario' && volCap.voluntario_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Get individual responses
    const { data: respuestasInd } = await supabase
      .from('respuestas_capacitaciones')
      .select('*')
      .eq('voluntario_capacitacion_id', respuestaId);

    // Map to old shape for frontend compatibility
    const respuestaFormateada = {
      id: volCap.id,
      plantilla_id: volCap.capacitacion_id,
      voluntario_id: volCap.voluntario_id,
      puntaje_automatico: volCap.puntaje_final ? volCap.puntaje_final / 10 : 0,
      puntaje_total: volCap.porcentaje ? volCap.porcentaje / 10 : 0,
      estado: mapEstadoToOld(volCap.estado),
      fecha_completada: volCap.fecha_completado || volCap.created_at,
      plantilla: volCap.capacitacion ? {
        id: volCap.capacitacion.id,
        titulo: volCap.capacitacion.nombre,
        area: volCap.capacitacion.area,
        descripcion: volCap.capacitacion.descripcion,
        preguntas: volCap.capacitacion.preguntas || [],
      } : null,
      voluntario: volCap.voluntario,
      respuestas: (respuestasInd || []).map((r: any) => ({
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        es_correcta: r.es_correcta,
        puntaje_obtenido: r.puntaje_obtenido,
      })),
    };

    return NextResponse.json(respuestaFormateada, { status: 200 });
  } catch (error) {
    console.error('Error en GET /api/respuestas-autoevaluacion/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function mapEstadoToOld(estado: string): string {
  const mapping: Record<string, string> = {
    'pendiente': 'completada',
    'en_progreso': 'completada',
    'completada': 'en_revision',
    'aprobada': 'evaluada',
    'reprobada': 'evaluada',
  };
  return mapping[estado] || estado;
}
