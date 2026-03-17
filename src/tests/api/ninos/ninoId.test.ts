/**
 * Tests para src/app/api/ninos/[ninoId]/route.ts
 * Cubre GET - obtener datos de un niño por ID.
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

describe('GET /api/ninos/[ninoId]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin header Authorization', async () => {
    const { NextRequest } = await import('next/server');
    const noAuthReq = new NextRequest(
      new URL('http://localhost:3000/api/ninos/nino-1'),
      { method: 'GET' }
    );

    const { GET } = await import('@/app/api/ninos/[ninoId]/route');
    const response = await GET(noAuthReq, { params: { ninoId: 'nino-1' } });
    expect(response.status).toBe(401);
  });

  it('retorna 401 si token es inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const { GET } = await import('@/app/api/ninos/[ninoId]/route');
    const request = createAuthRequest('/api/ninos/nino-1');
    const response = await GET(request, { params: { ninoId: 'nino-1' } });
    expect(response.status).toBe(401);
  });

  it('retorna 403 si voluntario no tiene asignación activa', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'vol-1' } },
      error: null,
    });

    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    const asignacionChain = createSupabaseChain(null); // no assignment found
    asignacionChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return perfilChain;
      if (table === 'asignaciones') return asignacionChain;
      return createSupabaseChain(null);
    });

    const { GET } = await import('@/app/api/ninos/[ninoId]/route');
    const request = createAuthRequest('/api/ninos/nino-1');
    const response = await GET(request, { params: { ninoId: 'nino-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Sin acceso');
  });

  it('retorna 404 si niño no existe', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const perfilChain = createSupabaseChain({ rol: 'director' });
    const ninoChain = createSupabaseChain(null, { message: 'not found' }); // not found

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return perfilChain;
      return ninoChain;
    });

    const { GET } = await import('@/app/api/ninos/[ninoId]/route');
    const request = createAuthRequest('/api/ninos/nonexistent');
    const response = await GET(request, { params: { ninoId: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('no encontrado');
  });

  it('retorna 200 con datos del niño para staff', async () => {
    const mockNino = { id: 'nino-1', alias: 'Juanito', rango_etario: '5-7' };

    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const perfilChain = createSupabaseChain({ rol: 'psicopedagogia' });
    const ninoChain = createSupabaseChain(mockNino);

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return perfilChain;
      return ninoChain;
    });

    const { GET } = await import('@/app/api/ninos/[ninoId]/route');
    const request = createAuthRequest('/api/ninos/nino-1');
    const response = await GET(request, { params: { ninoId: 'nino-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('nino');
  });
});
