// API para obtener información de un archivo específico de Drive

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDriveFile, getEmbedUrl } from '@/lib/google/drive';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const supabase = await createClient();
    const { fileId } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'fileId requerido' }, { status: 400 });
    }

    // Obtener información del archivo
    const archivo = await getDriveFile(fileId);
    const embedUrl = getEmbedUrl(fileId, archivo.mimeType);

    return NextResponse.json({
      success: true,
      archivo,
      embedUrl
    });

  } catch (error: any) {
    console.error('Error obteniendo archivo de Drive:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
