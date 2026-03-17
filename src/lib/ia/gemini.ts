// Configuración de Gemini AI

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Inicialización lazy para evitar errores durante el build
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let embeddingModel: GenerativeModel | null = null;

// Función para obtener la instancia de Gemini (lazy initialization)
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY no está configurada');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Función para obtener el modelo de chat (lazy initialization)
// Usa el primer modelo de la lista de fallback como preferido
export function getModel(): GenerativeModel {
  if (!model) {
    model = getGenAI().getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }
  return model;
}

// Función para obtener el modelo de embeddings (lazy initialization)
export function getEmbeddingModel(): GenerativeModel {
  if (!embeddingModel) {
    // embedding-001: compatible con v1beta, 768 dims
    embeddingModel = getGenAI().getGenerativeModel({ model: 'embedding-001' });
  }
  return embeddingModel;
}

// Exportar para compatibilidad con código existente
// NOTA: Usar getModel() y getEmbeddingModel() en su lugar
export { getGenAI as genAI };

// ─── Rotación de API keys ──────────────────────────────────────────────────
// Soporta hasta 5 keys: GOOGLE_AI_API_KEY, GOOGLE_AI_API_KEY_2, ..., GOOGLE_AI_API_KEY_5
// Útil en tests multi-usuario para evitar rate limits del plan gratis (15 RPM por key)

function getApiKeys(): string[] {
  // Orden: KEY_2..KEY_5 primero, KEY_1 como último recurso
  return [
    process.env.GOOGLE_AI_API_KEY_2,
    process.env.GOOGLE_AI_API_KEY_3,
    process.env.GOOGLE_AI_API_KEY_4,
    process.env.GOOGLE_AI_API_KEY_5,
    process.env.GOOGLE_AI_API_KEY,   // fallback
  ].filter(Boolean) as string[];
}

// ─── Modelos en orden de preferencia (el primero que funcione se usa) ─────
// Si Google depreca uno, la función cae automáticamente al siguiente.
const MODELOS_FALLBACK = [
  'gemini-2.5-flash',          // más reciente con plan free (2026)
  'gemini-2.5-flash-preview-04-17', // preview alternativo
  'gemini-2.0-flash-exp',      // experimental/gratis
  'gemini-1.5-flash-8b',       // versión ligera 1.5
  'gemini-1.5-pro',            // 1.5 pro como último recurso
];

/**
 * Genera texto con Gemini rotando keys Y modelos automáticamente.
 * - 429 (rate limit) → prueba la siguiente key con el mismo modelo
 * - 404 / deprecado → descarta el modelo y prueba el siguiente de la lista
 */
export async function callGeminiWithKeyRotation(prompt: string): Promise<string> {
  const keys = getApiKeys();

  if (keys.length === 0) {
    throw new Error('GOOGLE_AI_API_KEY no está configurada');
  }

  let ultimoError: any;

  for (const modelName of MODELOS_FALLBACK) {
    let modelDisponible = true;

    for (const key of keys) {
      try {
        const ai = new GoogleGenerativeAI(key);
        const model = ai.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err: any) {
        ultimoError = err;
        const status = err?.status || err?.httpErrorCode;
        const msg: string = err?.message || '';

        // 429 = rate limit → rotar a la siguiente key (mismo modelo)
        if (status === 429 || msg.includes('429')) {
          continue;
        }

        // 404 / "not found" / "no longer available" → abandonar este modelo, probar el siguiente
        if (
          status === 404 ||
          msg.includes('404') ||
          msg.includes('not found') ||
          msg.includes('no longer available') ||
          msg.includes('is not supported') ||
          msg.includes('ListModels')
        ) {
          modelDisponible = false;
          break; // salir del loop de keys, pasar al siguiente modelo
        }

        // Cualquier otro error → propagar directamente
        throw err;
      }
    }

    if (modelDisponible) {
      // Si llegamos acá con modelDisponible=true pero sin retornar,
      // significa que todas las keys dieron 429 para este modelo → probar siguiente
    }
  }

  throw new Error(
    'No se pudo conectar con Gemini: todos los modelos y keys fallaron. ' +
    (ultimoError?.message || 'Intentá más tarde.')
  );
}

/**
 * Genera embedding vectorial para búsqueda semántica (siempre usa la key primaria).
 * Gemini text-embedding-004 → 768 dimensiones.
 */
export async function generarEmbedding(texto: string): Promise<number[]> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_API_KEY no está configurada');

  const ai = new GoogleGenerativeAI(key);
  // embedding-001 es compatible con v1beta (768 dims, igual que text-embedding-004)
  const model = ai.getGenerativeModel({ model: 'embedding-001' });
  const result = await model.embedContent(texto);
  return result.embedding.values;
}
