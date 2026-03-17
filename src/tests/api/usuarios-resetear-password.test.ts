/**
 * Tests para /api/usuarios/resetear-password (POST)
 * Auth: Bearer token → supabaseAdmin, requiere rol director/admin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain, createMockSupabaseAdmin } from '../helpers/api-helpers';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const { mockAdmin } = createMockSupabaseAdmin({
  user: { id: 'dir-1', email: 'director@apa.org' },
  perfil: { rol: 'director' },
  defaultData: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

const { POST } = await import('@/app/api/usuarios/resetear-password/route');

beforeEach(() => vi.clearAllMocks());

describe('POST /api/usuarios/resetear-password', () => {
  it('retorna 401 sin Authorization header', async () => {
    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      token: '',
      body: { email: 'vol@apa.org', nuevaPassword: '123456' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 con token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    });
    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'vol@apa.org', nuevaPassword: '123456' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'vol@apa.org', nuevaPassword: '123456' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 sin email o contraseña', async () => {
    const perfilChain = createSupabaseChain({ rol: 'director' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'vol@apa.org' }, // falta nuevaPassword
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si contraseña tiene menos de 6 caracteres', async () => {
    const perfilChain = createSupabaseChain({ rol: 'director' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'vol@apa.org', nuevaPassword: '12345' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/6 caracteres/);
  });

  it('retorna 404 si el email no existe', async () => {
    const perfilChain = createSupabaseChain({ rol: 'director' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    // listUsers retorna users sin match
    mockAdmin.auth.admin.listUsers.mockResolvedValueOnce({
      data: { users: [] },
      error: null,
    });

    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'noexiste@apa.org', nuevaPassword: '123456' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('retorna 200 al resetear contraseña correctamente', async () => {
    const perfilChain = createSupabaseChain({ rol: 'director' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    mockAdmin.auth.admin.listUsers.mockResolvedValueOnce({
      data: { users: [{ id: 'target-1', email: 'vol@apa.org' }] },
      error: null,
    });
    mockAdmin.auth.admin.updateUserById.mockResolvedValueOnce({ error: null });
    // update perfil (password_temporal)
    const updateChain = createSupabaseChain(null);
    mockAdmin.from.mockReturnValueOnce(updateChain);

    const req = createAuthRequest('/api/usuarios/resetear-password', {
      method: 'POST',
      body: { email: 'vol@apa.org', nuevaPassword: '123456' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
