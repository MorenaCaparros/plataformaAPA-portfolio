import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDriveUploadClient } from '@/lib/google/drive-auth';
import { Readable } from 'stream';

// Evitar cacheo estático en el upload
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar Autenticación con Supabase (Seguridad)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener datos del formulario
    const formData = await req.formData();
    const archivo = formData.get('file') as File;
    const carpetaId = formData.get('folderId') as string;
    const nombreArchivo = formData.get('fileName') as string;
    const descripcion = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!archivo) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // 3. Crear cliente Drive autenticado (OAuth2 o Service Account)
    const drive = createDriveUploadClient();

    // 4. Convertir el archivo File a un Stream leíble para Google
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 5. Subir el archivo
    // Guardar descripción y tags como appProperties de Drive (metadata custom)
    const appProperties: Record<string, string> = {};
    if (descripcion) appProperties.descripcion = descripcion.slice(0, 500);
    if (tags) appProperties.tags = tags.slice(0, 500);

    const response = await drive.files.create({
      requestBody: {
        name: nombreArchivo || archivo.name,
        parents: carpetaId ? [carpetaId] : [],
        description: descripcion || undefined,
        ...(Object.keys(appProperties).length > 0 ? { appProperties } : {}),
      },
      media: {
        mimeType: archivo.type,
        body: stream,
      },
      fields: 'id, webViewLink, thumbnailLink',
      supportsAllDrives: true,
    });

    const fileId = response.data.id!;

    // 6. Si es una imagen, hacer pública para que se pueda mostrar en <img>
    const isImage = archivo.type.startsWith('image/');
    if (isImage) {
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
        });
      } catch (permErr) {
        console.warn('No se pudo hacer público el archivo:', permErr);
      }
    }

    // 7. Generar URLs
    // thumbnailUrl funciona como <img src> para imágenes públicas
    const thumbnailUrl = isImage
      ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
      : null;

    // 8. Responder con éxito
    return NextResponse.json({ 
      success: true,
      fileId,
      url: thumbnailUrl || response.data.webViewLink,
      webViewLink: response.data.webViewLink,
      thumbnailUrl,
    });

  } catch (error: any) {
    console.error('Error subiendo a Drive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}