/**
 * Tests para src/app/api/usuarios/route.ts
 * Cubre GET (listar/obtener) y POST (crear) con verificación de auth y roles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '@/tests/helpers/api-helpers';

// ── Mock de @supabase/supabase-js ───────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserById = vi.fn();
const mockCreateUser = vi.fn();
const mockListUsers = vi.fn();
const mockFromChain = createSupabaseChain();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      admin: {
        getUserById: mockGetUserById,
        createUser: mockCreateUser,
        listUsers: mockListUsers,
      },
    },
    from: vi.fn(() => mockFromChain),
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupAuth(user: Record<string, unknown> | null, perfil: Record<string, unknown> | null) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'Invalid' },
  });

  // Cuando consulte perfiles para verificar rol
  if (perfil) {
    (mockFromChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: perfil,
      error: null,
    });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 si no hay header Authorization', async () => {
    const { GET } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios', { token: '' });
    // Remover el header para simular sin auth
    request.headers.delete('Authorization');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autorizado');
  });

  it('retorna 401 si el token es inválido', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const { GET } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Token inválido');
  });

  it('retorna 403 si el usuario no tiene rol permitido', async () => {
    setupAuth(
      { id: 'user-1', email: 'vol@test.com' },
      { rol: 'voluntario' }
    );

    const { GET } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('No autorizado');
  });
});

describe('POST /api/usuarios', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 sin autenticación', async () => {
    const { POST } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios', {
      method: 'POST',
      body: { email: 'nuevo@test.com', nombre: 'Test', rol: 'voluntario' },
      token: '',
    });
    request.headers.delete('Authorization');

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('retorna 403 si no es director/admin', async () => {
    setupAuth(
      { id: 'user-1', email: 'coord@test.com' },
      { rol: 'coordinador' }
    );

    const { POST } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios', {
      method: 'POST',
      body: { email: 'nuevo@test.com', nombre: 'Test', rol: 'voluntario' },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    setupAuth(
      { id: 'admin-1', email: 'admin@test.com' },
      { rol: 'admin' }
    );

    const { POST } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios', {
      method: 'POST',
      body: { email: 'nuevo@test.com' }, // falta nombre y rol
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('obligatorio');
  });

  it('retorna 400 si el rol es inválido', async () => {
    setupAuth(
      { id: 'admin-1', email: 'admin@test.com' },
      { rol: 'admin' }
    );

    const { POST } = await import('@/app/api/usuarios/route');
    const request = createAuthRequest('/api/usuarios', {
      method: 'POST',
      body: { email: 'nuevo@test.com', nombre: 'Test', rol: 'superadmin' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Rol inválido');
  });
});
