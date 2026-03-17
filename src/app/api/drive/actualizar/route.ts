import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDriveUploadClient } from '@/lib/google/drive-auth';

export const dynamic = 'force-dynamic';

const ROLES_PUEDEN_EDITAR = ['director', 'psicopedagogia', 'equipo_profesional'];

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !ROLES_PUEDEN_EDITAR.includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 });
    }

    const body = await req.json();
    const { fileId, descripcion, tags, rango_etario } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId requerido' }, { status: 400 });
    }

    const drive = createDriveUploadClient();

    const appProperties: Record<string, string> = {};
    if (descripcion !== undefined) appProperties.descripcion = (descripcion || '').slice(0, 500);
    if (tags !== undefined) appProperties.tags = Array.isArray(tags) ? tags.join(',') : (tags || '');
    if (rango_etario !== undefined) appProperties.rango_etario = rango_etario || '';

    await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        description: descripcion || undefined,
        appProperties,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando metadata en Drive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
