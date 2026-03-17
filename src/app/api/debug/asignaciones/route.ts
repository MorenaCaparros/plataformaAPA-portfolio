// ENDPOINT TEMPORAL DE DIAGNÓSTICO — solo disponible en development
// Uso: GET /api/debug/asignaciones?voluntario_id=<uuid>
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  // Bloquear completamente en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const voluntarioId = searchParams.get('voluntario_id');

  if (!voluntarioId) {
    return NextResponse.json({ error: 'Falta ?voluntario_id=<uuid>' }, { status: 400 });
  }

  // ── 1. Perfil del voluntario ──────────────────────────────────────────────
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('id, rol, nombre, email')
    .eq('id', voluntarioId)
    .maybeSingle();

  // ── 2. Asignaciones (service_role bypasea RLS) ────────────────────────────
  const { data: asignaciones, error: asigError } = await supabaseAdmin
    .from('asignaciones')
    .select('id, nino_id, voluntario_id, activa, areas_foco, created_at')
    .eq('voluntario_id', voluntarioId)
    .order('created_at', { ascending: false });

  const asignacionesActivas = (asignaciones || []).filter((a: any) => a.activa === true);
  const ninoIds = asignacionesActivas.map((a: any) => a.nino_id).filter(Boolean);

  // ── 3. Niños correspondientes (service_role) ──────────────────────────────
  let ninos: any[] = [];
  let ninosError: string | null = null;
  if (ninoIds.length > 0) {
    const { data: nd, error: ne } = await supabaseAdmin
      .from('ninos')
      .select('id, alias, rango_etario, nivel_alfabetizacion')
      .in('id', ninoIds);
    ninos = nd ?? [];
    ninosError = ne?.message ?? null;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    voluntarioId,

    perfil,
    perfilError: perfilError?.message ?? null,

    asignacionesTotales: asignaciones?.length ?? 0,
    asignacionesActivasCount: asignacionesActivas.length,
    asignaciones: asignaciones ?? [],
    asigError: asigError?.message ?? null,

    ninoIds,
    ninos,
    ninosError,

    // SQL para verificar RLS en Supabase SQL Editor manualmente:
    sqlRLSCheck: [
      `-- 1. Ver políticas activas:`,
      `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'asignaciones' ORDER BY policyname;`,
      ``,
      `-- 2. Ver si RLS está habilitado:`,
      `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'asignaciones';`,
      ``,
      `-- 3. Simular query del voluntario (reemplazar el UUID):`,
      `SET LOCAL role = authenticated;`,
      `SELECT set_config('request.jwt.claims', '{"sub":"${voluntarioId}","role":"authenticated"}', true);`,
      `SELECT * FROM asignaciones WHERE voluntario_id = '${voluntarioId}' AND activa = true;`,
    ].join('\n'),
  });
}
