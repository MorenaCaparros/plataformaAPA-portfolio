import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { uploadAudio, deleteAudioFromDrive, extractDriveFileId } from '@/lib/google/drive-storage';

export const dynamic = 'force-dynamic';

// Helper to get authenticated supabase client (for auth + role check only)
async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}

// POST - Subir audio de entrevista a Google Drive
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseClient();

    // Verificar autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (!perfil || !['trabajo_social', 'admin', 'director'].includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const ninoId = formData.get('nino_id') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo de audio' },
        { status: 400 }
      );
    }

    if (!ninoId) {
      return NextResponse.json(
        { error: 'ID del niño es requerido' },
        { status: 400 }
      );
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `entrevista_${ninoId}_${timestamp}.webm`;

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Google Drive (NOT Supabase Storage)
    const result = await uploadAudio(buffer, 'audio/webm', ninoId, fileName);

    return NextResponse.json({
      success: true,
      audio_url: result.url,
      fileId: result.fileId,
      path: fileName, // kept for backwards compatibility
      message: 'Audio subido exitosamente a Google Drive',
    });
  } catch (error) {
    console.error('Error en POST /api/trabajo-social/audio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar audio de Google Drive
export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseClient();

    // Verificar autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Accept either ?fileId=xxx or ?path=xxx (extract fileId from URL if needed)
    const fileId = searchParams.get('fileId') || extractDriveFileId(searchParams.get('path') || '');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId del archivo es requerido' },
        { status: 400 }
      );
    }

    await deleteAudioFromDrive(fileId);

    return NextResponse.json({
      success: true,
      message: 'Audio eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error en DELETE /api/trabajo-social/audio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
