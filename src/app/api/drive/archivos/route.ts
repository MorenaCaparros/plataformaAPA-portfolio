// API para listar archivos de Google Drive

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listDriveFiles, listDriveFolders, DriveFolder } from '@/lib/google/drive';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

// Carpetas que solo puede ver el director
const CARPETAS_DIRECTOR_ONLY = ['ninos', 'niños', 'fotos', 'transcripciones'];
// Carpetas que NADIE ve desde la Biblioteca (uso interno del sistema)
const CARPETAS_SISTEMA = ['fotos', 'transcripciones'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener rol del perfil
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rol = perfil?.rol || 'voluntario';

    // Obtener folderId de query params (opcional)
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || undefined;

    // Verificar que las credenciales estén configuradas
    const hasOAuth2 = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID) &&
                      (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET) &&
                      process.env.GOOGLE_REFRESH_TOKEN;
    const hasServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID || (!hasOAuth2 && !hasServiceAccount)) {
      return NextResponse.json({ 
        error: 'Google Drive no configurado',
        configured: false,
        archivos: [],
        carpetas: []
      }, { status: 200 });
    }

    // Listar archivos y carpetas
    const [archivos, carpetasRaw] = await Promise.all([
      listDriveFiles(folderId),
      listDriveFolders(folderId)
    ]);

    // Filtrar carpetas según el rol (solo en el nivel raíz)
    let carpetas: DriveFolder[] = carpetasRaw;
    if (!folderId) {
      carpetas = carpetasRaw.filter((c: DriveFolder) => {
        const nombreNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Carpetas del sistema: nunca visibles
        if (CARPETAS_SISTEMA.some(s => nombreNorm.includes(s))) return false;
        // Carpetas solo para director
        if (CARPETAS_DIRECTOR_ONLY.some(s => nombreNorm.includes(s))) {
          return rol === 'director';
        }
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      archivos,
      carpetas,
      rol,
      folderId: folderId || process.env.GOOGLE_DRIVE_FOLDER_ID
    });

  } catch (error: any) {
    console.error('Error en API Drive:', error);
    return NextResponse.json({ 
      error: error.message,
      configured: true,
      archivos: [],
      carpetas: []
    }, { status: 500 });
  }
}
