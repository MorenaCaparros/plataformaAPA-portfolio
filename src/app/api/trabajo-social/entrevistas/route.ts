import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Función helper para crear cliente de Supabase
function createSupabaseClient() {
  const cookieStore = cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  );
}

// GET - Listar entrevistas
export async function GET(request: Request) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const ninoId = searchParams.get('nino_id');

    let query = supabase
      .from('entrevistas')
      .select(`
        *,
        nino:ninos(
          id,
          alias,
          rango_etario
        ),
        entrevistador:perfiles(
          id,
          nombre,
          apellido
        )
      `)
      .order('fecha', { ascending: false });

    if (ninoId) {
      query = query.eq('nino_id', ninoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener entrevistas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entrevistas: data });
  } catch (error) {
    console.error('Error en GET /api/trabajo-social/entrevistas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva entrevista
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseClient();

    // Verificar autenticación y rol
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tiene rol de trabajo social
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (!perfil || !['trabajo_social', 'admin', 'director'].includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No autorizado. Solo trabajo social puede crear entrevistas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nino_id,
      tipo_entrevista,
      lugar_entrevista,
      personas_presentes,
      // Embarazo
      alimentacion_embarazo,
      controles_prenatales,
      complicaciones_embarazo,
      // Alimentación
      alimentacion_actual,
      comidas_diarias,
      calidad_alimentacion,
      notas_alimentacion,
      // Escolaridad
      asiste_escuela,
      nombre_escuela,
      grado_actual,
      asistencia_regular,
      dificultades_escolares,
      // Vivienda
      tipo_vivienda,
      vivienda_propia,
      ambientes,
      agua,
      luz,
      gas,
      cloacas,
      condiciones_vivienda,
      observaciones_vivienda,
      // Económico
      trabajo_padre,
      trabajo_madre,
      ingresos_aproximados,
      recibe_ayuda_social,
      tipo_ayuda,
      observaciones_economicas,
      // Salud
      obra_social,
      cual_obra_social,
      controles_salud_regulares,
      medicacion_actual,
      diagnosticos_previos,
      // Contexto familiar
      composicion_familiar_descripcion,
      adultos_responsables,
      hermanos,
      otros_convivientes,
      relacion_padres,
      relacion_hermanos,
      red_apoyo_familiar,
      participacion_comunitaria,
      // Observaciones
      observaciones_trabajadora_social,
      situacion_riesgo,
      tipo_riesgo,
      derivaciones_sugeridas,
      prioridad_atencion,
      proxima_visita,
      acciones_pendientes,
      // Audio
      audio_url,
      transcripcion,
      duracion_grabacion,
      created_offline,
      // Consentimiento de grabación
      consentimiento_grabacion,
    } = body;

    // Validaciones
    if (!nino_id) {
      return NextResponse.json(
        { error: 'El ID del niño es requerido' },
        { status: 400 }
      );
    }

    // Insertar entrevista en la tabla relacional `entrevistas`
    const { data: entrevista, error: insertError } = await supabase
      .from('entrevistas')
      .insert({
        nino_id,
        entrevistador_id: session.user.id,
        tipo: tipo_entrevista || 'inicial',
        fecha: new Date().toISOString().split('T')[0],
        duracion_minutos: duracion_grabacion > 0 ? Math.ceil(duracion_grabacion / 60) : null,
        participantes: personas_presentes?.map((p: any) => `${p.nombre} (${p.relacion})`) || [],
        observaciones: transcripcion || observaciones_trabajadora_social || null,
        conclusiones: [
          situacion_riesgo ? `Situación de riesgo: ${tipo_riesgo}` : null,
          derivaciones_sugeridas ? `Derivaciones: ${derivaciones_sugeridas}` : null,
          `Prioridad: ${prioridad_atencion || 'media'}`,
        ].filter(Boolean).join('\n'),
        acciones_sugeridas: acciones_pendientes
          ? acciones_pendientes.split('\n').filter((a: string) => a.trim()).join('; ')
          : null,
        grabacion_url: audio_url || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al crear entrevista:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Guardar datos de alimentación en tabla relacional
    if (alimentacion_actual || comidas_diarias || calidad_alimentacion) {
      await supabase.from('alimentacion_ninos').insert({
        nino_id,
        comidas_por_dia: comidas_diarias || 3,
        calidad: calidad_alimentacion || 'regular',
        descripcion: alimentacion_actual || null,
        alimentos_disponibles: notas_alimentacion || null,
        alimentacion_embarazo: alimentacion_embarazo || null,
      });
    }

    // Guardar datos de escolaridad en tabla relacional
    if (asiste_escuela !== undefined) {
      await supabase.from('escolaridad_ninos').insert({
        nino_id,
        asiste: asiste_escuela,
        nombre_escuela: nombre_escuela || null,
        grado: grado_actual || null,
        turno: null,
        asistencia_regular: asistencia_regular || true,
        observaciones: dificultades_escolares || null,
      });
    }

    // Guardar datos de salud en tabla relacional
    if (obra_social !== undefined || medicacion_actual || diagnosticos_previos) {
      await supabase.from('salud_ninos').insert({
        nino_id,
        obra_social: obra_social || false,
        cual_obra_social: cual_obra_social || null,
        controles_regulares: controles_salud_regulares || false,
        medicacion: medicacion_actual || null,
        diagnosticos: diagnosticos_previos || null,
        controles_prenatales: controles_prenatales !== undefined ? controles_prenatales : null,
        complicaciones_embarazo: complicaciones_embarazo || null,
      });
    }

    // Guardar familiares de apoyo
    if (adultos_responsables || composicion_familiar_descripcion) {
      await supabase.from('familiares_apoyo').insert({
        nino_id,
        tipo: 'tutor',
        nombre: composicion_familiar_descripcion || 'Referente familiar',
        vive_con_nino: true,
        es_contacto_principal: true,
        notas: [
          adultos_responsables ? `Adultos responsables: ${adultos_responsables}` : '',
          hermanos ? `Hermanos: ${hermanos}` : '',
          otros_convivientes ? `Otros convivientes: ${otros_convivientes}` : '',
          relacion_padres ? `Relación padres: ${relacion_padres}` : '',
          relacion_hermanos ? `Relación hermanos: ${relacion_hermanos}` : '',
          red_apoyo_familiar ? `Red de apoyo: ${red_apoyo_familiar}` : '',
          participacion_comunitaria ? `Participación comunitaria: ${participacion_comunitaria}` : '',
          tipo_vivienda ? `Vivienda: ${tipo_vivienda}, ${condiciones_vivienda || ''}, ${ambientes || ''} amb.` : '',
          `Servicios: agua=${agua}, luz=${luz}, gas=${gas}, cloacas=${cloacas}`,
          trabajo_padre ? `Trabajo padre: ${trabajo_padre}` : '',
          trabajo_madre ? `Trabajo madre: ${trabajo_madre}` : '',
          ingresos_aproximados ? `Ingresos: ${ingresos_aproximados}` : '',
          recibe_ayuda_social ? `Ayuda social: ${tipo_ayuda}` : '',
        ].filter(Boolean).join('\n'),
      });
    }

    // Note: alertas_sociales table was removed in the new schema.
    // Risk situations are now tracked in the entrevista conclusiones field.

    // Save grabaciones_voz record with consent data if audio was provided
    if (audio_url) {
      const { error: grabError } = await supabase
        .from('grabaciones_voz')
        .insert({
          entrevista_id: entrevista.id,
          nino_id,
          usuario_id: session.user.id,
          storage_path: audio_url,
          duracion_segundos: duracion_grabacion || null,
          formato: 'webm',
          transcripcion: transcripcion || null,
          procesada: !!transcripcion,
          consentimiento_nombre: consentimiento_grabacion?.nombre_firmante || null,
          consentimiento_relacion: consentimiento_grabacion?.relacion_con_nino || null,
          consentimiento_dni: consentimiento_grabacion?.dni_firmante || null,
          consentimiento_firma: consentimiento_grabacion?.firma_imagen_base64 || null,
          consentimiento_fecha: consentimiento_grabacion?.fecha_consentimiento || null,
          consentimiento_texto: consentimiento_grabacion?.texto_consentimiento || null,
          consentimiento_acepta_grabacion: consentimiento_grabacion?.acepta_grabacion ?? false,
          consentimiento_acepta_transcripcion: consentimiento_grabacion?.acepta_transcripcion ?? false,
          consentimiento_acepta_almacenamiento: consentimiento_grabacion?.acepta_almacenamiento ?? false,
        });

      if (grabError) {
        console.error('Error guardando grabacion_voz con consentimiento:', grabError);
        // Don't fail the whole request, the entrevista was already created
      }
    }

    return NextResponse.json({
      success: true,
      entrevista,
      message: 'Entrevista creada exitosamente',
    });
  } catch (error) {
    console.error('Error en POST /api/trabajo-social/entrevistas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
