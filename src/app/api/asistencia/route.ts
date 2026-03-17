import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─────────────────────────────────────────────────────────────
// GET /api/asistencia?fecha=YYYY-MM-DD&tipo=ninos|voluntarios
// ─────────────────────────────────────────────────────────────
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

    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    const tipo = searchParams.get('tipo') || 'ninos'; // 'ninos' | 'voluntarios'

    if (tipo === 'ninos') {
      // Voluntarios solo ven sus niños asignados
      const esVoluntario = perfil?.rol === 'voluntario';

      // Obtener las asignaciones activas del voluntario (o todas si es admin/coord)
      let asignacionesQuery = supabaseAdmin
        .from('asignaciones')
        .select(`
          nino_id,
          voluntario_id,
          nino:ninos (id, alias, rango_etario, legajo)
        `)
        .eq('activa', true);

      if (esVoluntario) {
        asignacionesQuery = asignacionesQuery.eq('voluntario_id', user.id);
      }

      const { data: asignaciones, error: asigError } = await asignacionesQuery;
      if (asigError) throw asigError;

      const ninos = (asignaciones || []).map((a: any) => ({
        nino_id: a.nino_id,
        voluntario_id: a.voluntario_id,
        alias: a.nino?.alias || 'Sin alias',
        rango_etario: a.nino?.rango_etario || '',
        legajo: a.nino?.legajo || null,
      }));

      // Obtener registros de asistencia ya guardados para esa fecha
      const ninoIds = ninos.map((n: any) => n.nino_id);
      let registros: any[] = [];
      if (ninoIds.length > 0) {
        const { data: reg } = await supabaseAdmin
          .from('asistencias')
          .select('*')
          .eq('fecha', fecha)
          .in('nino_id', ninoIds);
        registros = reg || [];
      }

      // Combinar: para cada niño asignado, mostrar su registro si existe
      const resultado = ninos.map((n: any) => {
        const registro = registros.find((r: any) => r.nino_id === n.nino_id);
        return {
          nino_id: n.nino_id,
          voluntario_id: n.voluntario_id,
          alias: n.alias,
          rango_etario: n.rango_etario,
          legajo: n.legajo,
          presente: registro?.presente ?? null, // null = aún no registrado
          notas: registro?.notas ?? '',
          registrado: !!registro,
        };
      });

      return NextResponse.json({ fecha, tipo: 'ninos', ninos: resultado });
    }

    // ── tipo === 'voluntarios' ──────────────────────────────────
    const rolesPermitidos = ['coordinador', 'director', 'admin', 'psicopedagogia', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No tenés permisos para ver asistencia de voluntarios' }, { status: 403 });
    }

    const { data: voluntarios, error: volError } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombre, apellido, zona_id, zona:zonas(nombre)')
      .eq('rol', 'voluntario')
      .eq('activo', true);

    if (volError) throw volError;

    const voluntarioIds = (voluntarios || []).map((v: any) => v.id);
    let registrosVol: any[] = [];
    if (voluntarioIds.length > 0) {
      const { data: reg } = await supabaseAdmin
        .from('asistencia_voluntarios')
        .select('*')
        .eq('fecha', fecha)
        .in('voluntario_id', voluntarioIds);
      registrosVol = reg || [];
    }

    const resultado = (voluntarios || []).map((v: any) => {
      const registro = registrosVol.find((r: any) => r.voluntario_id === v.id);
      return {
        voluntario_id: v.id,
        nombre: [v.nombre, v.apellido].filter(Boolean).join(' ') || 'Sin nombre',
        zona_nombre: (v.zona as any)?.nombre || null,
        presente: registro?.presente ?? null,
        notas: registro?.notas ?? '',
        registrado: !!registro,
      };
    });

    return NextResponse.json({ fecha, tipo: 'voluntarios', voluntarios: resultado });

  } catch (error: any) {
    console.error('Error en GET /api/asistencia:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener asistencia' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/asistencia
// Body: { fecha, tipo, registros: [{ id, presente, notas }] }
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
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

    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { fecha, tipo, registros } = body as {
      fecha: string;
      tipo: 'ninos' | 'voluntarios';
      registros: Array<{ id: string; presente: boolean; notas?: string }>;
    };

    if (!fecha || !tipo || !Array.isArray(registros)) {
      return NextResponse.json({ error: 'Faltan campos requeridos: fecha, tipo, registros' }, { status: 400 });
    }

    if (tipo === 'ninos') {
      const esVoluntario = perfil?.rol === 'voluntario';

      // Si es voluntario, validar que los niños estén asignados a él
      if (esVoluntario) {
        const ninoIds = registros.map((r) => r.id);
        const { data: asignaciones } = await supabaseAdmin
          .from('asignaciones')
          .select('nino_id')
          .eq('voluntario_id', user.id)
          .eq('activa', true)
          .in('nino_id', ninoIds);

        const ninosPermitidos = new Set((asignaciones || []).map((a: any) => a.nino_id));
        const ninosNoPermitidos = ninoIds.filter((id) => !ninosPermitidos.has(id));
        if (ninosNoPermitidos.length > 0) {
          return NextResponse.json(
            { error: 'Intentás registrar asistencia de niños que no tenés asignados' },
            { status: 403 }
          );
        }
      }

      // Upsert registros de asistencia de niños
      const rows = registros.map((r) => ({
        fecha,
        nino_id: r.id,
        voluntario_id: esVoluntario ? user.id : undefined,
        presente: r.presente,
        motivo_ausencia: !r.presente ? (r.notas || null) : null,
        registrado_por: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('asistencias')
        .upsert(rows, { onConflict: 'nino_id,fecha' });

      if (upsertError) throw upsertError;

      // Actualizar contadores asistencia_presente / asistencia_total en la tabla ninos
      // Para cada niño, recalcular desde los registros guardados
      for (const r of registros) {
        const { data: stats } = await supabaseAdmin
          .from('asistencias')
          .select('presente')
          .eq('nino_id', r.id);

        const total = stats?.length || 0;
        const presentes = stats?.filter((s: any) => s.presente).length || 0;

        await supabaseAdmin
          .from('ninos')
          .update({ asistencia_presente: presentes, asistencia_total: total })
          .eq('id', r.id);
      }

      return NextResponse.json({ mensaje: 'Asistencia de niños registrada', guardados: registros.length });
    }

    // ── tipo === 'voluntarios' ──────────────────────────────────
    const rolesPermitidos = ['coordinador', 'director', 'admin', 'psicopedagogia', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No tenés permisos para registrar asistencia de voluntarios' }, { status: 403 });
    }

    const rows = registros.map((r) => ({
      fecha,
      voluntario_id: r.id,
      presente: r.presente,
      notas: r.notas || null,
      registrado_por: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('asistencia_voluntarios')
      .upsert(rows, { onConflict: 'voluntario_id,fecha' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ mensaje: 'Asistencia de voluntarios registrada', guardados: registros.length });

  } catch (error: any) {
    console.error('Error en POST /api/asistencia:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar asistencia' }, { status: 500 });
  }
}
