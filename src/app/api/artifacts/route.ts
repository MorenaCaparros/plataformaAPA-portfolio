import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nino_id, tipo, titulo, descripcion, contenido } = body;

    // Validar campos requeridos
    if (!nino_id || !tipo || !titulo || !contenido) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Obtener usuario actual
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Insertar artefacto
    const { data, error } = await supabase
      .from('nino_artifacts')
      .insert({
        nino_id,
        tipo,
        titulo,
        descripcion,
        contenido,
        creado_por: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error al guardar artefacto:', error);
      return NextResponse.json(
        { error: 'Error al guardar el artefacto' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en POST /api/artifacts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ninoId = searchParams.get('nino_id');

    if (!ninoId) {
      return NextResponse.json(
        { error: 'nino_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener usuario actual
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener artefactos del niño
    const { data, error } = await supabase
      .from('nino_artifacts')
      .select(`
        *,
        perfiles:creado_por (
          nombre,
          apellido
        )
      `)
      .eq('nino_id', ninoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener artefactos:', error);
      return NextResponse.json(
        { error: 'Error al obtener los artefactos' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error en GET /api/artifacts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
