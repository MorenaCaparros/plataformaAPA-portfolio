import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Listar comentarios de un plan
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');

    if (!planId) {
      return NextResponse.json({ error: 'Falta plan_id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comentarios_intervencion')
      .select(`
        *,
        autor:perfiles!comentarios_intervencion_autor_id_fkey(id, nombre, apellido, rol, foto_perfil_url)
      `)
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener comentarios:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error en GET /api/psicopedagogia/comentarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Agregar comentario a un plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { plan_id, contenido, tipo } = body;

    if (!plan_id || !contenido) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (plan_id, contenido)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comentarios_intervencion')
      .insert({
        plan_id,
        autor_id: user.id,
        contenido,
        tipo: tipo || 'seguimiento',
      })
      .select(`
        *,
        autor:perfiles!comentarios_intervencion_autor_id_fkey(id, nombre, apellido, rol, foto_perfil_url)
      `)
      .single();

    if (error) {
      console.error('Error al crear comentario:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/psicopedagogia/comentarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar comentario (solo autor o admin)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta id del comentario' }, { status: 400 });
    }

    const { error } = await supabase
      .from('comentarios_intervencion')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar comentario:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/psicopedagogia/comentarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
