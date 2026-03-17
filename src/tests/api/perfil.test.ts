/**
 * Tests para src/app/api/perfil/route.ts
 * Cubre GET (obtener perfil) y PATCH (actualizar perfil propio).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '@/tests/helpers/api-helpers';

const mockGetUser = vi.fn();
const mockFromChain = createSupabaseChain();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      admin: { getUserById: vi.fn() },
    },
    from: vi.fn(() => mockFromChain),
  })),
}));

describe('GET /api/perfil', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin authorization header', async () => {
    const { GET } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil', { token: '' });
    request.headers.delete('Authorization');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autorizado');
  });

  it('retorna 401 si el token es inválido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });

    const { GET } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('retorna 200 con perfil cuando está autenticado', async () => {
    const mockPerfil = {
      id: 'user-1',
      nombre: 'María',
      apellido: 'López',
      rol: 'voluntario',
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    (mockFromChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPerfil,
      error: null,
    });

    const { GET } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.perfil).toEqual(mockPerfil);
  });
});

describe('PATCH /api/perfil', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });

    const { PATCH } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { nombre: 'Nuevo nombre' },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it('retorna 400 si no hay campos para actualizar', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { PATCH } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { campo_invalido: 'no permitido' },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No hay campos');
  });

  it('actualiza campos permitidos correctamente', async () => {
    const updatedPerfil = {
      id: 'user-1',
      nombre: 'Nuevo Nombre',
      telefono: '11-2222-3333',
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    (mockFromChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: updatedPerfil,
      error: null,
    });

    const { PATCH } = await import('@/app/api/perfil/route');
    const request = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { nombre: 'Nuevo Nombre', telefono: '11-2222-3333' },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.perfil).toEqual(updatedPerfil);
  });
});
