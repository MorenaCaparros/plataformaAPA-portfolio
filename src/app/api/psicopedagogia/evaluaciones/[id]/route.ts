import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/psicopedagogia/evaluaciones/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verify role
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesPermitidos = ['psicopedagogia', 'admin', 'director', 'equipo_profesional', 'coordinador'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('entrevistas')
      .select(`
        *,
        nino:ninos!entrevistas_nino_id_fkey(
          id,
          alias,
          fecha_nacimiento,
          rango_etario,
          nivel_alfabetizacion,
          zona:zonas(nombre)
        ),
        entrevistador:perfiles!entrevistas_entrevistador_id_fkey(
          id,
          nombre,
          apellido,
          rol
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
      }
      console.error('Error fetching evaluación:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ evaluacion: data });
  } catch (error) {
    console.error('Error en GET /api/psicopedagogia/evaluaciones/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
