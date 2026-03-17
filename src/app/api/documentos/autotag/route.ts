// filepath: src/app/api/documentos/autotag/route.ts
// Genera tags automáticamente con IA para un documento dado su ID
// Lee los primeros chunks ya indexados (ahorra re-procesar el PDF)
// y pide a Gemini Flash un set de 5-10 tags relevantes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/ia/gemini';

export async function POST(request: NextRequest) {
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

    const { documentoId } = await request.json();
    if (!documentoId) {
      return NextResponse.json({ error: 'documentoId requerido' }, { status: 400 });
    }

    // Obtener info del documento
    const { data: documento, error: docError } = await supabase
      .from('documentos')
      .select('id, titulo, autor, tipo, metadata')
      .eq('id', documentoId)
      .single();

    if (docError || !documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Leer los primeros 4 chunks (suficiente contexto, sin gastar tokens en exceso)
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('chunk_text')
      .eq('documento_id', documentoId)
      .order('metadata->chunk_index', { ascending: true })
      .limit(4);

    if (chunksError || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'Sin contenido indexado para este documento' }, { status: 422 });
    }

    const textoMuestra = chunks.map((c: any) => c.chunk_text).join('\n\n').slice(0, 3000);

    const prompt = `Sos un asistente especializado en psicopedagogía y educación. 
Analizá el siguiente fragmento de un documento psicopedagógico y generá entre 5 y 10 tags/etiquetas en español.

Documento: "${documento.titulo}" — ${documento.autor} (tipo: ${documento.tipo})
${documento.metadata?.descripcion ? `Descripción: ${documento.metadata.descripcion}` : ''}

FRAGMENTO:
${textoMuestra}

REGLAS para los tags:
- En minúsculas, sin acentos innecesarios
- Palabras simples o frases cortas (máximo 3 palabras)
- Relacionados con el tema pedagógico/psicopedagógico del documento
- Ejemplos de buenos tags: "lectura", "alfabetizacion", "dislexia", "escritura", "lenguaje oral", "fonemas", "desarrollo cognitivo", "estrategias pedagogicas", "atencion", "inclusion"
- NO tags genéricos como "documento", "libro", "texto"

Respondé SOLO con un JSON array de strings, sin ningún otro texto:
["tag1", "tag2", "tag3", ...]`;

    const result = await getModel().generateContent(prompt);
    const rawText = result.response.text().trim();

    // Parsear el JSON del array de tags
    let tags: string[] = [];
    try {
      // Limpiar posible markdown code block
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      tags = JSON.parse(jsonText);
      if (!Array.isArray(tags)) throw new Error('No es un array');
      // Sanitizar: minúsculas, trim, max 30 chars, deduplicar
      tags = [...new Set(
        tags
          .map((t: any) => String(t).toLowerCase().trim().slice(0, 30))
          .filter((t: string) => t.length > 1)
      )].slice(0, 10);
    } catch {
      // Si falla el parse, extraer palabras clave manualmente del texto
      console.warn('No se pudo parsear JSON de tags, extrayendo manualmente:', rawText);
      tags = rawText
        .replace(/["\[\]{}]/g, '')
        .split(/,|\n/)
        .map((t: string) => t.trim().toLowerCase())
        .filter((t: string) => t.length > 2 && t.length < 30)
        .slice(0, 8);
    }

    if (tags.length === 0) {
      return NextResponse.json({ error: 'No se pudieron generar tags' }, { status: 422 });
    }

    // Guardar los tags en el documento
    const { error: updateError } = await supabase
      .from('documentos')
      .update({ tags })
      .eq('id', documentoId);

    if (updateError) throw updateError;

    console.log(`✅ Tags auto-generados para "${documento.titulo}":`, tags);

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error en autotag:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar tags' },
      { status: 500 }
    );
  }
}
