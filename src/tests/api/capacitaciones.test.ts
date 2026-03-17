/**
 * Tests para src/app/api/capacitaciones/route.ts
 * Cubre GET (listar), POST (crear) capacitaciones.
 * Patrón: Bearer token + supabaseAdmin (service role key).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '../helpers/api-helpers';

const mockAdmin = {
  auth: {
    getUser: vi.fn(),
  },
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

describe('GET /api/capacitaciones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin header Authorization', async () => {
    const { NextRequest } = await import('next/server');
    const noAuthReq = new NextRequest(
      new URL('http://localhost:3000/api/capacitaciones'),
      { method: 'GET' }
    );
    const { GET } = await import('@/app/api/capacitaciones/route');
    const response = await GET(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 401 si el token es inválido', async () => {
    setupAuth(null);
    const { GET } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('retorna 200 con capacitaciones para usuario autenticado', async () => {
    const mockData = [{ id: 'c1', nombre: 'Lectura', area: 'lenguaje' }];
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const capacitacionesChain = createSupabaseChain(mockData);
    mockAdmin.from.mockReturnValue(capacitacionesChain);

    const { GET } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('capacitaciones');
  });
});

describe('POST /api/capacitaciones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    const { NextRequest } = await import('next/server');
    const noAuthReq = new NextRequest(
      new URL('http://localhost:3000/api/capacitaciones'),
      { method: 'POST', body: JSON.stringify({ titulo: 'test' }) }
    );
    const { POST } = await import('@/app/api/capacitaciones/route');
    const response = await POST(noAuthReq);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si el usuario no tiene rol permitido', async () => {
    setupAuth({ id: 'user-vol' }, { rol: 'voluntario' });
    const { POST } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones', {
      method: 'POST',
      body: { titulo: 'Cap test', area: 'lenguaje', tipo: 'capacitacion' },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    setupAuth({ id: 'user-1' }, { rol: 'director' });
    const { POST } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones', {
      method: 'POST',
      body: { titulo: 'Solo titulo' }, // falta area y tipo
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Faltan campos obligatorios');
  });

  it('retorna 400 si el area es inválida', async () => {
    setupAuth({ id: 'user-1' }, { rol: 'director' });
    const { POST } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones', {
      method: 'POST',
      body: { titulo: 'Cap', area: 'area_invalida', tipo: 'capacitacion' },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Área inválida');
  });

  it('retorna 400 si el tipo es inválido', async () => {
    setupAuth({ id: 'user-1' }, { rol: 'director' });
    const { POST } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones', {
      method: 'POST',
      body: { titulo: 'Cap', area: 'lenguaje', tipo: 'tipo_invalido' },
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Tipo inválido');
  });

  it('retorna 201 cuando se crea correctamente', async () => {
    const createdData = { id: 'new-1', nombre: 'Cap nueva', area: 'lenguaje' };
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'director' });
      return createSupabaseChain(createdData);
    });

    const { POST } = await import('@/app/api/capacitaciones/route');
    const request = createAuthRequest('/api/capacitaciones', {
      method: 'POST',
      body: { titulo: 'Cap nueva', area: 'lenguaje', tipo: 'capacitacion' },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('mensaje');
    expect(data).toHaveProperty('capacitacion');
  });
});
