/**
 * Tests para src/app/api/asignaciones/route.ts
 * Cubre GET (listar), POST (crear), PATCH (actualizar) asignaciones voluntario-niño.
 * Patrón: Bearer token + supabaseAdmin (service role key).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createMockSupabaseAdmin, createSupabaseChain } from '../helpers/api-helpers';

// Mock del módulo @supabase/supabase-js con createClient
const mockAdmin = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

// Helpers de chain reutilizables
function setupAuth(user: Record<string, unknown> | null, perfil: { rol: string } | null = null) {
  mockAdmin.auth.getUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'Invalid token' },
  });

  const perfilesChain = createSupabaseChain(perfil);
  const asignacionesChain = createSupabaseChain([]);

  mockAdmin.from.mockImplementation((table: string) => {
    if (table === 'perfiles') return perfilesChain;
    return asignacionesChain;
  });

  return { perfilesChain, asignacionesChain };
}

describe('GET /api/asignaciones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin header Authorization', async () => {
    const request = createAuthRequest('/api/asignaciones', { token: '' });
    // Remove auth header to test without it
    const noAuthReq = new (await import('next/server')).NextRequest(
      new URL('http://localhost:3000/api/asignaciones'),
      { method: 'GET' }
    );

    const { GET } = await import('@/app/api/asignaciones/route');
    const response = await GET(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 401 si el token es inválido', async () => {
    setupAuth(null);

    const { GET } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Token inválido');
  });

  it('retorna 200 con asignaciones para usuario autenticado', async () => {
    const mockData = [{ id: 'a1', voluntario_id: 'v1', nino_id: 'n1', activa: true }];
    const user = { id: 'user-1' };
    const { asignacionesChain } = setupAuth(user, { rol: 'coordinador' });

    // Override the chain to resolve with data
    const thenableChain = createSupabaseChain(mockData);
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'coordinador' });
      return thenableChain;
    });

    const { GET } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('asignaciones');
    expect(data).toHaveProperty('total');
  });
});

describe('POST /api/asignaciones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    const noAuthReq = new (await import('next/server')).NextRequest(
      new URL('http://localhost:3000/api/asignaciones'),
      { method: 'POST', body: JSON.stringify({ voluntario_id: 'v1', nino_id: 'n1' }) }
    );

    const { POST } = await import('@/app/api/asignaciones/route');
    const response = await POST(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si no tiene rol permitido', async () => {
    setupAuth({ id: 'user-vol' }, { rol: 'voluntario' });

    const { POST } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1', nino_id: 'n1' },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('No tienes permisos');
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    const asignacionesChain = createSupabaseChain(null);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'director' });
      return asignacionesChain;
    });

    const { POST } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1' }, // falta nino_id
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('requeridos');
  });

  it('retorna 400 si ya existe asignacion activa duplicada', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const existingAssignment = { id: 'existing-1' };
    const perfilesChain = createSupabaseChain({ rol: 'coordinador' });
    const asignacionesChain = createSupabaseChain(existingAssignment); // single returns existing

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return perfilesChain;
      return asignacionesChain;
    });

    const { POST } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1', nino_id: 'n1' },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Ya existe');
  });
});

describe('PATCH /api/asignaciones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    const noAuthReq = new (await import('next/server')).NextRequest(
      new URL('http://localhost:3000/api/asignaciones'),
      { method: 'PATCH', body: JSON.stringify({ id: 'a1' }) }
    );

    const { PATCH } = await import('@/app/api/asignaciones/route');
    const response = await PATCH(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si no tiene rol permitido', async () => {
    setupAuth({ id: 'user-vol' }, { rol: 'voluntario' });

    const { PATCH } = await import('@/app/api/asignaciones/route');
    const request = createAuthRequest('/api/asignaciones', {
      method: 'PATCH',
      body: { id: 'a1', motivo_fin: 'Fin de programa' },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(403);
  });
});
