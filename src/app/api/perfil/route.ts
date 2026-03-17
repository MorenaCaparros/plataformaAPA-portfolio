import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/perfil — Obtener perfil del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil, error } = await supabaseAdmin
      .from('perfiles')
      .select(`
        id, nombre, apellido, rol, zona_id, fecha_nacimiento,
        telefono, email, direccion, foto_perfil_url, fecha_ingreso,
        max_ninos_asignados, horas_disponibles, activo, notas, ultima_conexion,
        created_at, updated_at,
        zonas ( id, nombre )
      `)
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ perfil });
  } catch (error: any) {
    console.error('Error en GET /api/perfil:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/perfil — Actualizar perfil propio
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Campos que un usuario puede actualizar de su propio perfil
    const camposPermitidos = [
      'nombre', 'apellido', 'telefono', 'direccion',
      'fecha_nacimiento', 'foto_perfil_url',
      'max_ninos_asignados', 'horas_disponibles'
    ];

    const updateData: Record<string, any> = {};
    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        updateData[campo] = body[campo];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('perfiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ perfil: data });
  } catch (error: any) {
    console.error('Error en PATCH /api/perfil:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
