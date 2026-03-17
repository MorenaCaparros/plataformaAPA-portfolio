// API Route — Historial de consultas IA centralizado
// GET: trae historial del usuario autenticado (con paginación)
// POST: guarda una nueva entrada de historial

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const modo = searchParams.get('modo'); // filtro opcional
    const ninoId = searchParams.get('nino_id'); // filtro opcional

    // Verificar rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesPermitidos = ['psicopedagogia', 'director', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    let query = supabase
      .from('historial_consultas_ia')
      .select(`
        id,
        modo,
        nino_id,
        pregunta,
        respuesta,
        fuentes,
        tags_usados,
        tokens_aprox,
        created_at,
        ninos (alias, rango_etario)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);

    // Director puede ver todo; otros solo el suyo
    if (perfil.rol !== 'director') {
      query = query.eq('usuario_id', user.id);
    }

    if (modo) query = query.eq('modo', modo);
    if (ninoId) query = query.eq('nino_id', ninoId);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ historial: data || [], total: count || 0 });
  } catch (error: any) {
    console.error('Error GET historial IA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const rolesPermitidos = ['psicopedagogia', 'director', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const body = await request.json();
    const { modo, nino_id, pregunta, respuesta, fuentes, tags_usados } = body;

    if (!modo || !pregunta) {
      return NextResponse.json({ error: 'modo y pregunta son requeridos' }, { status: 400 });
    }

    // Estimación simple de tokens (aprox 4 chars por token)
    const tokens_aprox = Math.ceil(
      ((pregunta?.length || 0) + (respuesta?.length || 0)) / 4
    );

    const { data, error } = await supabase
      .from('historial_consultas_ia')
      .insert({
        usuario_id: user.id,
        modo,
        nino_id: nino_id || null,
        pregunta,
        respuesta: respuesta || null,
        fuentes: fuentes || null,
        tags_usados: tags_usados || null,
        tokens_aprox,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id, ok: true });
  } catch (error: any) {
    console.error('Error POST historial IA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
