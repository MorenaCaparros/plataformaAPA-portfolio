import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    // Eliminar artefacto
    const { error } = await supabase
      .from('nino_artifacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar artefacto:', error);
      return NextResponse.json(
        { error: 'Error al eliminar el artefacto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/artifacts/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
