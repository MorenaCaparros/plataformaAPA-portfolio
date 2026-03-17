/**
 * Tests para src/app/api/feedback/analizar/route.ts
 * Cubre POST - análisis de feedback con IA (Gemini).
 * Patrón: Cookie-based via createServerClient (@supabase/ssr).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSingle = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Mock GoogleGenerativeAI
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => 'Análisis generado por IA' },
        }),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

// Set env before imports
process.env.GOOGLE_AI_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/feedback/analizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/feedback/analizar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    });
  });

  it('retorna 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/feedback/analizar/route');
    const response = await POST(createRequest({ comentario: 'test', puntuaciones: {} }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autenticado');
  });

  it('retorna 403 si el rol no es director', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { rol: 'voluntario' }, error: null });

    const { POST } = await import('@/app/api/feedback/analizar/route');
    const response = await POST(createRequest({ comentario: 'test', puntuaciones: {} }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Acceso denegado');
  });

  it('retorna 400 si faltan datos (comentario o puntuaciones)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { rol: 'director' }, error: null });

    const { POST } = await import('@/app/api/feedback/analizar/route');
    const response = await POST(createRequest({ comentario: 'Sin puntuaciones' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Faltan datos');
  });

  it('retorna 200 con análisis generado por IA', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { rol: 'director' }, error: null });

    const { POST } = await import('@/app/api/feedback/analizar/route');
    const response = await POST(createRequest({
      comentario: 'El coordinador muestra liderazgo.',
      puntuaciones: {
        liderazgo: 8,
        gestion: 7,
        comunicacion: 9,
        compromiso: 8,
      },
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('analisis');
    expect(typeof data.analisis).toBe('string');
    expect(data.analisis.length).toBeGreaterThan(0);
  });
});
