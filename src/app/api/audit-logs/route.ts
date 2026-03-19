import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/audit-logs
// Query params: tabla, accion, user_id, desde, hasta, page, per_page
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Solo admin/director
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'director'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tabla    = searchParams.get('tabla');
    const accion   = searchParams.get('accion');
    const userId   = searchParams.get('user_id');
    const desde    = searchParams.get('desde');
    const hasta    = searchParams.get('hasta');
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage  = Math.min(100, Math.max(10, parseInt(searchParams.get('per_page') ?? '50', 10)));
    const offset   = (page - 1) * perPage;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (tabla)   query = query.eq('tabla', tabla);
    if (accion)  query = query.eq('accion', accion);
    if (userId)  query = query.eq('user_id', userId);
    if (desde)   query = query.gte('created_at', desde);
    if (hasta)   query = query.lte('created_at', hasta);

    const { data, count, error } = await query;

    if (error) {
      console.error('[audit-logs GET]', error.message);
      return NextResponse.json({ error: 'Error al obtener logs' }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count ?? 0) / perPage),
    });
  } catch (err) {
    console.error('[audit-logs GET] inesperado:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
