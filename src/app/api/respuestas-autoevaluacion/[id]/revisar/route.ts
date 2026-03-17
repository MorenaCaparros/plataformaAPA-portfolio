import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';

/**
 * GET /api/respuestas-autoevaluacion/[id]/revisar
 * Obtiene el detalle completo de una autoevaluación para revisión
 * Incluye: datos del voluntario, preguntas, respuestas, correcciones
 * Acceso: roles administrativos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAuthenticatedClient(request);

    let userId = (supabase as any)._authUserId;
    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      userId = user.id;
    }

    // Verificar rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id, rol')
      .eq('id', userId)
      .single();

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const rolesPermitidos = ['psicopedagogia', 'coordinador', 'director', 'trabajador_social', 'admin', 'equipo_profesional'];
    if (!rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el registro de voluntarios_capacitaciones con la capacitación y el voluntario
    const { data: volCap, error: volCapError } = await supabase
      .from('voluntarios_capacitaciones')
      .select(`
        *,
        capacitacion:capacitaciones(id, nombre, descripcion, area, tipo),
        voluntario:perfiles!voluntarios_capacitaciones_voluntario_id_fkey(id, nombre, apellido, email)
      `)
      .eq('id', id)
      .single();

    if (volCapError || !volCap) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    // Obtener las respuestas individuales con las preguntas
    const { data: respuestas, error: respError } = await supabase
      .from('respuestas_capacitaciones')
      .select(`
        id,
        pregunta_id,
        respuesta,
        es_correcta,
        puntaje_obtenido,
        pregunta:preguntas_capacitacion(
          id, pregunta, tipo_pregunta, puntaje, respuesta_correcta, area_especifica, orden,
          opciones:opciones_pregunta(id, orden, texto_opcion, es_correcta)
        )
      `)
      .eq('voluntario_capacitacion_id', id)
      .order('created_at', { ascending: true });

    if (respError) {
      console.error('Error al obtener respuestas:', respError);
      return NextResponse.json({ error: 'Error al obtener respuestas' }, { status: 500 });
    }

    // Ordenar por orden de la pregunta
    const respuestasOrdenadas = (respuestas || []).sort((a: any, b: any) => {
      return (a.pregunta?.orden || 0) - (b.pregunta?.orden || 0);
    });

    return NextResponse.json({
      id: volCap.id,
      estado: volCap.estado,
      puntaje_final: volCap.puntaje_final,
      puntaje_maximo: volCap.puntaje_maximo,
      porcentaje: volCap.porcentaje,
      fecha_completado: volCap.fecha_completado,
      capacitacion: volCap.capacitacion,
      voluntario: volCap.voluntario,
      respuestas: respuestasOrdenadas,
    });
  } catch (error) {
    console.error('Error en GET revisar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * PATCH /api/respuestas-autoevaluacion/[id]/revisar
 * Actualiza correcciones de respuestas individuales y recalcula puntaje
 * Body: { correcciones: [{ respuesta_id, es_correcta, puntaje_obtenido }], comentarios?: string }
 * Acceso: roles administrativos
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAuthenticatedClient(request);

    let userId = (supabase as any)._authUserId;
    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      userId = user.id;
    }

    // Verificar rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id, rol')
      .eq('id', userId)
      .single();

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const rolesPermitidos = ['psicopedagogia', 'coordinador', 'director', 'trabajador_social', 'admin', 'equipo_profesional'];
    if (!rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { correcciones } = body;

    if (!Array.isArray(correcciones) || correcciones.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos una corrección' }, { status: 400 });
    }

    // Aplicar cada corrección
    for (const correccion of correcciones) {
      const { respuesta_id, es_correcta, puntaje_obtenido } = correccion;

      if (!respuesta_id) continue;

      const updateData: any = {};
      if (typeof es_correcta === 'boolean') updateData.es_correcta = es_correcta;
      if (typeof puntaje_obtenido === 'number') updateData.puntaje_obtenido = puntaje_obtenido;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('respuestas_capacitaciones')
          .update(updateData)
          .eq('id', respuesta_id)
          .eq('voluntario_capacitacion_id', id); // Seguridad: verificar que pertenece a este registro

        if (error) {
          console.error('Error al actualizar respuesta:', error);
        }
      }
    }

    // Recalcular puntaje total del registro
    const { data: todasRespuestas, error: fetchError } = await supabase
      .from('respuestas_capacitaciones')
      .select('es_correcta, puntaje_obtenido, pregunta:preguntas_capacitacion(puntaje)')
      .eq('voluntario_capacitacion_id', id);

    if (fetchError) {
      return NextResponse.json({ error: 'Error al recalcular puntaje' }, { status: 500 });
    }

    let puntajeTotal = 0;
    let puntajeMaximo = 0;
    let tienePendientes = false;

    for (const resp of (todasRespuestas || [])) {
      const puntajePregunta = (resp.pregunta as any)?.puntaje || 10;
      puntajeMaximo += puntajePregunta;
      puntajeTotal += (resp.puntaje_obtenido || 0);
      if (resp.es_correcta === null) tienePendientes = true;
    }

    const porcentaje = puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 100) : 0;
    const puntajeFinal = puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 10) : 0;

    // Determinar nuevo estado
    let nuevoEstado = 'completada'; // Aún tiene pendientes
    if (!tienePendientes) {
      nuevoEstado = porcentaje >= 70 ? 'aprobada' : 'reprobada';
    }

    const { error: updateError } = await supabase
      .from('voluntarios_capacitaciones')
      .update({
        puntaje_final: puntajeFinal,
        puntaje_maximo: 10,
        porcentaje,
        estado: nuevoEstado,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error al actualizar registro:', updateError);
      return NextResponse.json({ error: 'Error al actualizar puntaje global' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      puntaje_final: puntajeFinal,
      porcentaje,
      estado: nuevoEstado,
    });
  } catch (error) {
    console.error('Error en PATCH revisar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
