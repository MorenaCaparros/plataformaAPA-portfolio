import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Ver estrellas y habilidades del voluntario
// (Migrated from voluntarios_habilidades → scores_voluntarios_por_area)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const voluntarioId = searchParams.get('voluntario_id') || user.id;

    // Verificar permisos
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesSuperiores = ['director', 'coordinador', 'psicopedagogia'];
    const puedeVer = voluntarioId === user.id || rolesSuperiores.includes(perfil?.rol || '');

    if (!puedeVer) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver estas habilidades' },
        { status: 403 }
      );
    }

    // Obtener scores por área (replaces voluntarios_habilidades)
    const { data: scores, error } = await supabaseAdmin
      .from('scores_voluntarios_por_area')
      .select('*')
      .eq('voluntario_id', voluntarioId)
      .order('area');

    if (error) throw error;

    // Si no tiene scores, inicializar con 0 en todas las áreas
    if (!scores || scores.length === 0) {
      const areasBase = ['lenguaje_vocabulario', 'grafismo_motricidad', 'lectura_escritura', 'nociones_matematicas'];
      const habilidadesIniciales = areasBase.map(area => ({
        area,
        estrellas: 0,
        capacitaciones_completadas: 0,
        sesiones_realizadas: 0,
        score_autoevaluacion: 0,
        score_capacitaciones: 0,
        score_final: 0,
      }));

      return NextResponse.json({
        habilidades: habilidadesIniciales,
        promedio: 0,
        total_capacitaciones: 0,
        total_sesiones: 0
      });
    }

    // Map scores to habilidades shape for frontend compatibility
    const habilidades = scores.map((s: any) => ({
      area: s.area,
      estrellas: Math.round((s.score_final || 0) / 20), // 0-100 → 0-5 stars
      score_autoevaluacion: s.score_autoevaluacion,
      score_capacitaciones: s.score_capacitaciones,
      score_final: s.score_final,
      necesita_capacitacion: s.necesita_capacitacion,
      capacitaciones_completadas: 0,
      sesiones_realizadas: 0,
    }));

    // Calcular estadísticas
    const promedio = habilidades.reduce((sum: number, h: any) => sum + Number(h.estrellas), 0) / habilidades.length;

    return NextResponse.json({
      habilidades,
      promedio: Math.round(promedio * 10) / 10,
      total_capacitaciones: 0,
      total_sesiones: 0
    });

  } catch (error: any) {
    console.error('Error en GET /api/voluntarios/habilidades:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener habilidades' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar habilidades manualmente (solo coordinador/psico)
// (Migrated from voluntarios_habilidades → scores_voluntarios_por_area)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar rol
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesPermitidos = ['director', 'coordinador', 'psicopedagogia', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar habilidades manualmente' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { voluntario_id, area, estrellas, notas } = body;

    if (!voluntario_id || !area || estrellas === undefined) {
      return NextResponse.json(
        { error: 'voluntario_id, area y estrellas son requeridos' },
        { status: 400 }
      );
    }

    if (estrellas < 0 || estrellas > 5) {
      return NextResponse.json(
        { error: 'Estrellas deben estar entre 0 y 5' },
        { status: 400 }
      );
    }

    // Convert stars (0-5) to score (0-100)
    const scoreValue = Math.round(estrellas * 20);

    // Upsert score
    const { data, error } = await supabaseAdmin
      .from('scores_voluntarios_por_area')
      .upsert({
        voluntario_id,
        area,
        score_autoevaluacion: scoreValue,
        necesita_capacitacion: estrellas < 3,
        fecha_ultima_evaluacion: new Date().toISOString(),
      }, {
        onConflict: 'voluntario_id,area'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      mensaje: 'Habilidad actualizada exitosamente',
      habilidad: {
        ...data,
        estrellas,
      }
    });

  } catch (error: any) {
    console.error('Error en PATCH /api/voluntarios/habilidades:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar habilidad' },
      { status: 500 }
    );
  }
}
