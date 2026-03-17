import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processDocument, extractMetadata } from '@/lib/ia/document-processor';

/**
 * Endpoint para extraer metadata (título y autor) de un documento
 * Solo extrae, no guarda en la base de datos
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== INICIO: Extracción de metadata ===');
    
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Error de autenticación:', authError);
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log('Usuario autenticado:', user.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No se proporcionó archivo');
      return NextResponse.json(
        { error: 'No se proporcionó un archivo' },
        { status: 400 }
      );
    }

    console.log('Archivo recibido:', file.name, 'Tamaño:', file.size, 'bytes');

    // Procesar archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Extrayendo texto del archivo...');
    const texto = await processDocument(buffer, file.name);
    console.log('Texto extraído:', texto.length, 'caracteres');

    if (!texto || texto.length < 100) {
      console.log('Texto muy corto, no se puede extraer metadata');
      return NextResponse.json(
        { metadata: { titulo: null, autor: null } },
        { status: 200 }
      );
    }

    // Extraer metadata con IA
    console.log('Extrayendo metadata con IA...');
    const metadata = await extractMetadata(texto);
    console.log('Metadata final:', metadata);

    return NextResponse.json({
      metadata
    });

  } catch (error: any) {
    console.error('=== ERROR en metadata endpoint ===');
    console.error('Tipo de error:', error?.constructor?.name);
    console.error('Mensaje:', error?.message);
    console.error('Stack:', error?.stack);
    
    // Siempre devolver JSON, nunca HTML
    return new NextResponse(
      JSON.stringify({ 
        error: error?.message || 'Error procesando el documento', 
        metadata: { titulo: null, autor: null } 
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
