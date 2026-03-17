/**
 * Tests para src/app/api/voluntarios/habilidades/route.ts
 * Cubre GET (ver estrellas/habilidades) y PATCH (actualizar manualmente).
 * Patrón: Bearer token + supabaseAdmin (service role key).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '../../helpers/api-helpers';

const mockAdmin = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

function setupAuth(user: Record<string, unknown> | null, perfil: { rol: string } | null = null) {
  mockAdmin.auth.getUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'Invalid token' },
  });
  mockAdmin.from.mockImplementation((table: string) => {
    if (table === 'perfiles') return createSupabaseChain(perfil);
    return createSupabaseChain([]);
  });
}

describe('GET /api/voluntarios/habilidades', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin header Authorization', async () => {
    const { NextRequest } = await import('next/server');
    const noAuthReq = new NextRequest(
      new URL('http://localhost:3000/api/voluntarios/habilidades'),
      { method: 'GET' }
    );
    const { GET } = await import('@/app/api/voluntarios/habilidades/route');
    const response = await GET(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 401 si token es inválido', async () => {
    setupAuth(null);
    const { GET } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si voluntario intenta ver otro voluntario', async () => {
    setupAuth({ id: 'user-vol-1' }, { rol: 'voluntario' });
    const { GET } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades', {
      searchParams: { voluntario_id: 'other-vol-id' },
    });
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('retorna 200 con habilidades inicializadas si no hay scores', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-vol' } },
      error: null,
    });
    // scores vacíos (no data)
    const emptyChain = createSupabaseChain([]);
    // Override then to return empty array
    emptyChain.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ data: [], error: null })
    );
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'voluntario' });
      return emptyChain;
    });

    const { GET } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('habilidades');
    expect(data).toHaveProperty('promedio', 0);
    expect(data.habilidades.length).toBe(4); // 4 áreas base
  });
});

describe('PATCH /api/voluntarios/habilidades', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    const { NextRequest } = await import('next/server');
    const noAuthReq = new NextRequest(
      new URL('http://localhost:3000/api/voluntarios/habilidades'),
      { method: 'PATCH', body: JSON.stringify({ voluntario_id: 'v1', area: 'lenguaje', estrellas: 3 }) }
    );
    const { PATCH } = await import('@/app/api/voluntarios/habilidades/route');
    const response = await PATCH(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si no tiene rol permitido', async () => {
    setupAuth({ id: 'user-vol' }, { rol: 'voluntario' });
    const { PATCH } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades', {
      method: 'PATCH',
      body: { voluntario_id: 'v1', area: 'lenguaje', estrellas: 3 },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(403);
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    setupAuth({ id: 'user-1' }, { rol: 'director' });
    const { PATCH } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades', {
      method: 'PATCH',
      body: { voluntario_id: 'v1' }, // falta area y estrellas
    });
    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('requeridos');
  });

  it('retorna 400 si estrellas están fuera de rango', async () => {
    setupAuth({ id: 'user-1' }, { rol: 'coordinador' });
    const { PATCH } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades', {
      method: 'PATCH',
      body: { voluntario_id: 'v1', area: 'lenguaje', estrellas: 6 },
    });
    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('entre 0 y 5');
  });

  it('retorna 200 con habilidad actualizada correctamente', async () => {
    const updatedData = { voluntario_id: 'v1', area: 'lenguaje', score_autoevaluacion: 60 };
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'director' });
      return createSupabaseChain(updatedData);
    });

    const { PATCH } = await import('@/app/api/voluntarios/habilidades/route');
    const request = createAuthRequest('/api/voluntarios/habilidades', {
      method: 'PATCH',
      body: { voluntario_id: 'v1', area: 'lenguaje', estrellas: 3 },
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('mensaje');
    expect(data).toHaveProperty('habilidad');
  });
});
