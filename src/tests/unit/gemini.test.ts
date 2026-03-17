/**
 * Tests para src/lib/ia/gemini.ts
 * Verifica lazy initialization y manejo de errores.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de @google/generative-ai usando una clase real para soportar `new`
const mockModel = {
  generateContent: vi.fn(),
  embedContent: vi.fn(),
};

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      apiKey: string;
      constructor(apiKey: string) {
        this.apiKey = apiKey;
      }
      getGenerativeModel() {
        return mockModel;
      }
    },
    GenerativeModel: class {},
  };
});

describe('gemini.ts — lazy initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GOOGLE_AI_API_KEY = 'test-api-key';
  });

  it('getModel() retorna un objeto con generateContent', async () => {
    const { getModel } = await import('@/lib/ia/gemini');
    const model = getModel();
    expect(model).toBeDefined();
    expect(model).toHaveProperty('generateContent');
  });

  it('getEmbeddingModel() retorna un objeto con embedContent', async () => {
    const { getEmbeddingModel } = await import('@/lib/ia/gemini');
    const model = getEmbeddingModel();
    expect(model).toBeDefined();
    expect(model).toHaveProperty('embedContent');
  });

  it('getModel() lanza error si GOOGLE_AI_API_KEY no está configurada', async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    const { getModel } = await import('@/lib/ia/gemini');
    expect(() => getModel()).toThrow('GOOGLE_AI_API_KEY no está configurada');
  });

  it('getEmbeddingModel() lanza error si GOOGLE_AI_API_KEY no está configurada', async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    const { getEmbeddingModel } = await import('@/lib/ia/gemini');
    expect(() => getEmbeddingModel()).toThrow('GOOGLE_AI_API_KEY no está configurada');
  });

  it('la instancia se reusa (lazy singleton)', async () => {
    const { getModel } = await import('@/lib/ia/gemini');
    const model1 = getModel();
    const model2 = getModel();
    expect(model1).toBe(model2); // Misma referencia
  });
});
