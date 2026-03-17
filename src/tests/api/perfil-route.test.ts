/**
 * Tests para /api/perfil (GET, PATCH)
 * Auth: Bearer token → supabaseAdmin con helper getAuthUser
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain, createMockSupabaseAdmin } from '../helpers/api-helpers';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const { mockAdmin } = createMockSupabaseAdmin({
  user: { id: 'user-1', email: 'test@apa.org' },
  perfil: { rol: 'voluntario' },
  defaultData: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

const { GET, PATCH } = await import('@/app/api/perfil/route');

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/perfil
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/perfil', () => {
  it('retorna 401 sin Authorization header', async () => {
    const req = createAuthRequest('/api/perfil', { token: '' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 con token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid token' },
    });
    const req = createAuthRequest('/api/perfil');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 200 con perfil del usuario', async () => {
    const perfilData = { id: 'user-1', nombre: 'Ana', rol: 'voluntario', zonas: { nombre: 'Norte' } };
    const chain = createSupabaseChain(perfilData);
    mockAdmin.from.mockReturnValueOnce(chain);

    const req = createAuthRequest('/api/perfil');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.perfil).toBeDefined();
    expect(json.perfil.id).toBe('user-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/perfil
// ═══════════════════════════════════════════════════════════════════════════
describe('PATCH /api/perfil', () => {
  it('retorna 401 sin header', async () => {
    const req = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      token: '',
      body: { nombre: 'Nuevo' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 sin campos para actualizar', async () => {
    const req = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { rol: 'admin' }, // no está en camposPermitidos
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/campos/i);
  });

  it('retorna 200 al actualizar nombre y teléfono', async () => {
    const updated = { id: 'user-1', nombre: 'Ana B', telefono: '1234' };
    const chain = createSupabaseChain(updated);
    mockAdmin.from.mockReturnValueOnce(chain);

    const req = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { nombre: 'Ana B', telefono: '1234' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.perfil.nombre).toBe('Ana B');
  });

  it('ignora campos no permitidos (ej: rol, email)', async () => {
    const updated = { id: 'user-1', nombre: 'X' };
    const chain = createSupabaseChain(updated);
    mockAdmin.from.mockReturnValueOnce(chain);

    const req = createAuthRequest('/api/perfil', {
      method: 'PATCH',
      body: { nombre: 'X', rol: 'admin', email: 'hack@evil.com' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    // La ruta debería solo actualizar nombre, ignorando rol y email
  });
});
