// API para gestión de zonas/equipos (usa service role para evitar problemas de RLS)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROLES_GESTORES = ['director', 'psicopedagogia', 'admin', 'coordinador', 'equipo_profesional'];
const ROLES_ADMIN = ['director', 'admin'];

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verificarRol(supabase: any, userId: string, rolesPermitidos: string[]) {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', userId)
    .single();
  return perfil && rolesPermitidos.includes(perfil.rol);
}

// GET /api/equipos → listar zonas
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('zonas')
    .select('id, nombre, descripcion')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zonas: data });
}

// POST /api/equipos → crear zona
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const puedeGestionar = await verificarRol(supabase, user.id, ROLES_GESTORES);
  if (!puedeGestionar) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, descripcion } = body;
  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre de la zona es requerido' }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from('zonas')
    .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
    .select('id, nombre, descripcion')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zona: data });
}

// PATCH /api/equipos → editar zona
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const puedeGestionar = await verificarRol(supabase, user.id, ROLES_GESTORES);
  if (!puedeGestionar) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const body = await request.json();
  const { id, nombre, descripcion } = body;
  if (!id || !nombre?.trim()) {
    return NextResponse.json({ error: 'ID y nombre son requeridos' }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin
    .from('zonas')
    .update({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/equipos?id=... → eliminar zona
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Solo director/admin puede eliminar zonas
  const puedeAdmin = await verificarRol(supabase, user.id, ROLES_ADMIN);
  if (!puedeAdmin) {
    return NextResponse.json({ error: 'Solo el director/admin puede eliminar zonas' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin.from('zonas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
