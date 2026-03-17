// ============================================================
// Módulo de IA - Plataforma APA
// Estrategia: Google Gemini (primario) → OpenRouter (fallback)
// ============================================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// ─── Instancias lazy (evitan errores durante el build) ────────────────────
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let embeddingModel: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no está configurada');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getModel(): GenerativeModel {
  if (!model) {
    model = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
    });
  }
  return model;
}

export function getEmbeddingModel(): GenerativeModel {
  if (!embeddingModel) {
    embeddingModel = getGenAI().getGenerativeModel({ model: 'embedding-001' });
  }
  return embeddingModel;
}

// Alias de compatibilidad
export { getGenAI as genAI };

// ─── Modelos Gemini en orden de preferencia ────────────────────────────────
const MODELOS_GEMINI = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

// ─── Fallback OpenRouter ───────────────────────────────────────────────────
// API compatible con OpenAI. Modelo gratuito: google/gemini-2.0-flash-exp:free
// Docs: https://openrouter.ai/docs
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no está configurada');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plataforma-apa.netlify.app',
      'X-Title': 'Plataforma APA',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Función principal: Gemini → OpenRouter ────────────────────────────────
/**
 * Intenta generar texto con Google Gemini (key primaria).
 * Si Gemini falla por rate limit o error, cae automáticamente a OpenRouter.
 */
export async function callGeminiWithKeyRotation(prompt: string): Promise<string> {
  const googleKey = process.env.GOOGLE_AI_API_KEY;
  let ultimoErrorGemini: any;

  // ── Intentar con Google Gemini ──
  if (googleKey) {
    for (const modelName of MODELOS_GEMINI) {
      try {
        const ai = new GoogleGenerativeAI(googleKey);
        const geminiModel = ai.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 },
        });
        const result = await geminiModel.generateContent(prompt);
        return result.response.text();
      } catch (err: any) {
        ultimoErrorGemini = err;
        const status = err?.status || err?.httpErrorCode;
        const msg: string = err?.message || '';

        // 404 / modelo no disponible → probar el siguiente modelo
        if (
          status === 404 ||
          msg.includes('404') ||
          msg.includes('not found') ||
          msg.includes('no longer available') ||
          msg.includes('is not supported')
        ) {
          continue;
        }

        // 429 rate limit o cualquier otro error → ir directo a OpenRouter
        break;
      }
    }
  }

  // ── Fallback: OpenRouter ──
  try {
    console.warn('[IA] Gemini no disponible, usando OpenRouter como fallback.');
    return await callOpenRouter(prompt);
  } catch (openRouterError: any) {
    throw new Error(
      `IA no disponible. Gemini: ${ultimoErrorGemini?.message || 'sin key'}. ` +
      `OpenRouter: ${openRouterError?.message || 'error desconocido'}.`
    );
  }
}

// ─── Embeddings: siempre Google (no hay equivalente gratuito en OpenRouter) ─
/**
 * Genera embedding vectorial para búsqueda semántica.
 * Gemini embedding-001 → 768 dimensiones.
 */
export async function generarEmbedding(texto: string): Promise<number[]> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_API_KEY no está configurada');

  const ai = new GoogleGenerativeAI(key);
  const embModel = ai.getGenerativeModel({ model: 'embedding-001' });
  const result = await embModel.embedContent(texto);
  return result.embedding.values;
}
