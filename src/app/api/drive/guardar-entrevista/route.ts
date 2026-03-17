import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { createClient } from '@/lib/supabase/server';
import { createDriveUploadClient } from '@/lib/google/drive-auth';

export const dynamic = 'force-dynamic';

// --- Funciones auxiliares ---
async function getOrCreateFolder(drive: any, folderName: string, parentId: string) {
  try {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    return folder.data.id;
  } catch (error) {
    console.error(`Error buscando/creando carpeta ${folderName}:`, error);
    throw error;
  }
}

async function uploadFile(drive: any, file: File, parentId: string, name: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: name,
      parents: [parentId],
    },
    media: {
      mimeType: file.type,
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });
  return res.data.webViewLink;
}

// --- API Route Principal ---
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const pdfFile = formData.get('pdf') as File;
    const nombreNino = formData.get('nombreNino') as string;
    const fecha = formData.get('fecha') as string;
    const rootFolderId = formData.get('rootFolderId') as string;

    if (!audioFile || !pdfFile || !nombreNino || !rootFolderId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // 2. Crear cliente Drive autenticado (OAuth2 o Service Account)
    const drive = createDriveUploadClient();

    // 3. Estructura de carpetas: rootFolder / NombreNiño / Fecha
    const ninoFolderId = await getOrCreateFolder(drive, nombreNino, rootFolderId);
    const sessionFolderId = await getOrCreateFolder(drive, fecha, ninoFolderId);

    // 4. Subir archivos
    const [audioUrl, pdfUrl] = await Promise.all([
      uploadFile(drive, audioFile, sessionFolderId, audioFile.name),
      uploadFile(drive, pdfFile, sessionFolderId, pdfFile.name)
    ]);

    return NextResponse.json({ success: true, audioUrl, pdfUrl });

  } catch (error: any) {
    console.error('Error detallado en API:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}