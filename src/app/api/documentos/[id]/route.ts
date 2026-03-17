// API Route para documentos individuales: DELETE + PATCH (tags manuales)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea psicopedagogia o admin
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !['psicopedagogia', 'director'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Await params en Next.js 14+
    const { id: documentoId } = await params;

    // Primero eliminar los chunks (por la FK)
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('documento_id', documentoId);

    if (chunksError) {
      console.error('Error eliminando chunks:', chunksError);
      throw new Error('Error al eliminar chunks del documento');
    }

    // Luego eliminar el documento
    const { error: docError } = await supabase
      .from('documentos')
      .delete()
      .eq('id', documentoId);

    if (docError) {
      console.error('Error eliminando documento:', docError);
      throw new Error('Error al eliminar documento');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE documento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar documento' },
      { status: 500 }
    );
  }
}

// PATCH — actualizar tags manualmente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !['psicopedagogia', 'director', 'equipo_profesional'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: documentoId } = await params;
    const body = await request.json();
    const { tags, rango_etario } = body;

    const updatePayload: Record<string, any> = {};

    // Actualizar tags si se proveen
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'tags debe ser un array de strings' }, { status: 400 });
      }
      // Sanitizar tags: minúsculas, trim, deduplicar, max 10
      updatePayload.tags = [...new Set(
        tags
          .map((t: any) => String(t).toLowerCase().trim().slice(0, 30))
          .filter((t: string) => t.length > 1)
      )].slice(0, 10);
    }

    // Actualizar rango_etario si se provee
    if ('rango_etario' in body) {
      const RANGOS_VALIDOS = ['3-4', '4-5', '5-6', '6-8', '8-10', '10+', null];
      if (!RANGOS_VALIDOS.includes(rango_etario)) {
        return NextResponse.json({ error: 'rango_etario no válido' }, { status: 400 });
      }
      updatePayload.rango_etario = rango_etario;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const { error } = await supabase
      .from('documentos')
      .update(updatePayload)
      .eq('id', documentoId);

    if (error) throw error;

    return NextResponse.json({ success: true, ...updatePayload });
  } catch (error: any) {
    console.error('Error en PATCH documento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar tags' },
      { status: 500 }
    );
  }
}
