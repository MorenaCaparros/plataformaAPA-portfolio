/**
 * Tests para src/app/api/documentos/autotag/route.ts
 * Cubre POST - auto-generación de tags con IA.
 * Patrón: Cookie-based via createClient() from @/lib/supabase/server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Mock getModel from gemini
vi.mock('@/lib/ia/gemini', () => ({
  getModel: vi.fn(() => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => '["alfabetizacion", "lectura", "escritura", "fonemas", "lenguaje oral"]',
      },
    }),
  })),
}));

function createChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // For await on non-single chain calls
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: Array.isArray(data) ? data : data ? [data] : [], error })
  );
  return chain;
}

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL('http://localhost:3000/api/documentos/autotag'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/documentos/autotag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } });

    const { POST } = await import('@/app/api/documentos/autotag/route');
    const response = await POST(createPostRequest({ documentoId: 'doc-1' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autenticado');
  });

  it('retorna 403 si el rol no es permitido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const perfilChain = createChain({ rol: 'voluntario' });
    mockFrom.mockReturnValue(perfilChain);

    const { POST } = await import('@/app/api/documentos/autotag/route');
    const response = await POST(createPostRequest({ documentoId: 'doc-1' }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('No autorizado');
  });

  it('retorna 400 si falta documentoId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const perfilChain = createChain({ rol: 'psicopedagogia' });
    mockFrom.mockReturnValue(perfilChain);

    const { POST } = await import('@/app/api/documentos/autotag/route');
    const response = await POST(createPostRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('documentoId');
  });

  it('retorna 404 si el documento no existe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const callCount = { n: 0 };
    mockFrom.mockImplementation(() => {
      callCount.n++;
      if (callCount.n === 1) return createChain({ rol: 'director' }); // perfiles
      return createChain(null, { message: 'not found' }); // documentos - not found
    });

    const { POST } = await import('@/app/api/documentos/autotag/route');
    const response = await POST(createPostRequest({ documentoId: 'nonexistent' }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrado');
  });

  it('retorna 422 si no hay chunks indexados', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const callCount = { n: 0 };
    mockFrom.mockImplementation(() => {
      callCount.n++;
      if (callCount.n === 1) return createChain({ rol: 'psicopedagogia' }); // perfiles
      if (callCount.n === 2) return createChain({ id: 'doc-1', titulo: 'Test', autor: 'Autor', tipo: 'pdf', metadata: {} }); // documentos
      // chunks - empty
      const emptyChain = createChain([]);
      emptyChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
        resolve({ data: [], error: null })
      );
      return emptyChain;
    });

    const { POST } = await import('@/app/api/documentos/autotag/route');
    const response = await POST(createPostRequest({ documentoId: 'doc-1' }));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain('Sin contenido indexado');
  });
});
