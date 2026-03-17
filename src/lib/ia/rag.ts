// Sistema RAG para búsqueda semántica en documentos

import { getEmbeddingModel } from './gemini';
import { supabase } from '../supabase/client';

/**
 * Genera embeddings usando Gemini (gratis)
 */
export async function generateEmbedding(texto: string): Promise<number[]> {
  try {
    const result = await getEmbeddingModel().embedContent(texto);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw new Error('No se pudo generar el embedding');
  }
}

/**
 * Guarda un chunk con su embedding en la base de datos
 * @param supabaseClient - Cliente de Supabase (debe tener permisos para insertar)
 */
export async function saveChunkWithEmbedding(
  supabaseClient: any,
  documentoId: string,
  chunkTexto: string,
  chunkIndex: number,
  metadata: any = {}
): Promise<void> {
  // Generar embedding
  const embedding = await generateEmbedding(chunkTexto);
  
  // Guardar en Supabase usando el cliente proporcionado
  const { error } = await supabaseClient
    .from('document_chunks')
    .insert({
      documento_id: documentoId,
      chunk_text: chunkTexto,
      embedding: JSON.stringify(embedding), // pgvector acepta arrays
      metadata: {
        ...metadata,
        chunk_index: chunkIndex,
        length: chunkTexto.length
      }
    });
  
  if (error) throw error;
}

/**
 * Busca chunks similares usando búsqueda vectorial
 */
export async function searchSimilarChunks(
  query: string,
  limit: number = 5,
  documentoIds?: string[]
): Promise<Array<{
  id: string;
  texto: string;
  similitud: number;
  documento: {
    titulo: string;
    autor: string;
  };
}>> {
  // Generar embedding de la query
  const queryEmbedding = await generateEmbedding(query);
  
  // Construir query SQL para búsqueda vectorial
  // Nota: pgvector usa <-> para distancia coseno (menor = más similar)
  let rpcQuery = supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit
  });
  
  // Si se especifican documentos, filtrar
  if (documentoIds && documentoIds.length > 0) {
    rpcQuery = rpcQuery.in('documento_id', documentoIds);
  }
  
  const { data, error } = await rpcQuery;
  
  if (error) {
    console.error('Error en búsqueda vectorial:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Formatea resultados de búsqueda para el prompt
 */
export function formatSearchResultsForPrompt(
  results: Array<{
    texto: string;
    documento: { titulo: string; autor: string };
  }>
): string {
  if (results.length === 0) {
    return 'No se encontraron documentos relevantes en la biblioteca.';
  }
  
  return results
    .map((result, index) => {
      return `
**Documento ${index + 1}: ${result.documento.titulo}**
Autor: ${result.documento.autor}

${result.texto}

---
`;
    })
    .join('\n');
}
