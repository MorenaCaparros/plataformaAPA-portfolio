import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Listar planes de intervención
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ninoId = searchParams.get('nino_id');
    const estado = searchParams.get('estado');

    let query = supabase
      .from('planes_intervencion')
      .select(`
        *,
        nino:ninos!planes_intervencion_nino_id_fkey(id, alias, rango_etario, fecha_nacimiento),
        creador:perfiles!planes_intervencion_creado_por_fkey(id, nombre, apellido, rol),
        comentarios:comentarios_intervencion(count)
      `)
      .order('created_at', { ascending: false });

    if (ninoId) query = query.eq('nino_id', ninoId);
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener planes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error en GET /api/psicopedagogia/planes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Crear plan de intervención
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !['psicopedagogia', 'director', 'admin', 'equipo_profesional'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { nino_id, titulo, descripcion, area, prioridad, fecha_fin_estimada, objetivos, actividades_sugeridas } = body;

    if (!nino_id || !titulo || !area) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nino_id, titulo, area)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('planes_intervencion')
      .insert({
        nino_id,
        creado_por: user.id,
        titulo,
        descripcion: descripcion || null,
        area,
        prioridad: prioridad || 'media',
        fecha_fin_estimada: fecha_fin_estimada || null,
        objetivos: objetivos || [],
        actividades_sugeridas: actividades_sugeridas || null,
      })
      .select(`
        *,
        nino:ninos!planes_intervencion_nino_id_fkey(id, alias),
        creador:perfiles!planes_intervencion_creado_por_fkey(id, nombre, apellido)
      `)
      .single();

    if (error) {
      console.error('Error al crear plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/psicopedagogia/planes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar plan (estado, campos)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta id del plan' }, { status: 400 });
    }

    // Si se está cerrando/completando, agregar fecha_cierre
    if (updates.estado === 'completado' || updates.estado === 'cancelado') {
      updates.fecha_cierre = new Date().toISOString().split('T')[0];
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('planes_intervencion')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en PATCH /api/psicopedagogia/planes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
