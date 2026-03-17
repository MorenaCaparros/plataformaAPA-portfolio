// Proxy autenticado para servir archivos de Google Drive
// Resuelve el problema de archivos inaccesibles: el browser no puede autenticarse
// con la Service Account, pero este endpoint sí puede y hace streaming del archivo.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDriveClient, getDriveFile } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const supabase = await createClient();
    const { fileId } = await params;

    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    if (!fileId) {
      return new NextResponse('fileId requerido', { status: 400 });
    }

    // 2. Obtener metadata del archivo para saber el mimeType
    const archivo = await getDriveFile(fileId);
    const isGoogleDoc = archivo.mimeType.startsWith('application/vnd.google-apps.');

    const drive = createDriveClient();

    // 3. Google Docs/Sheets/Slides → exportar a PDF para preview
    if (isGoogleDoc) {
      const exportMimeTypes: Record<string, string> = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/pdf',
      };
      const exportMime = exportMimeTypes[archivo.mimeType] || 'application/pdf';

      const response = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: 'stream' }
      );

      // Convertir stream de Node a ReadableStream de Web
      const nodeStream = response.data as NodeJS.ReadableStream;
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        headers: {
          'Content-Type': exportMime,
          'Content-Disposition': `inline; filename="${encodeURIComponent(archivo.name)}.pdf"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // 4. Archivos binarios (PDF, imágenes, etc.) → stream directo
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const nodeStream = response.data as NodeJS.ReadableStream;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });

    // Determinar Content-Disposition: inline para preview, attachment para descarga
    const download = request.nextUrl.searchParams.get('download') === '1';
    const disposition = download
      ? `attachment; filename="${encodeURIComponent(archivo.name)}"`
      : `inline; filename="${encodeURIComponent(archivo.name)}"`;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': archivo.mimeType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
        ...(archivo.size ? { 'Content-Length': archivo.size } : {}),
      },
    });

  } catch (error: any) {
    console.error('Error en proxy de Drive:', error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
