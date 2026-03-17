/**
 * Tests para /api/artifacts (POST, GET) y /api/artifacts/[id] (DELETE)
 * Auth: Bearer token → supabaseAdmin.auth.getUser(token)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain, createMockSupabaseAdmin } from '../helpers/api-helpers';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const { mockAdmin } = createMockSupabaseAdmin({
  user: { id: 'user-1', email: 'test@apa.org' },
  perfil: { rol: 'psicopedagogia' },
  defaultData: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

// ── Importación dinámica de las rutas ──────────────────────────────────────
const { POST, GET } = await import('@/app/api/artifacts/route');
const { DELETE } = await import('@/app/api/artifacts/[id]/route');

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/artifacts
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/artifacts', () => {
  it('retorna 401 sin Authorization header', async () => {
    const req = createAuthRequest('/api/artifacts', {
      method: 'POST',
      token: '',
      body: { nino_id: 'n1', tipo: 'resumen', titulo: 'Test', contenido: 'data' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 con token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    });

    const req = createAuthRequest('/api/artifacts', {
      method: 'POST',
      body: { nino_id: 'n1', tipo: 'resumen', titulo: 'T', contenido: 'c' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 si faltan campos requeridos', async () => {
    const req = createAuthRequest('/api/artifacts', {
      method: 'POST',
      body: { nino_id: 'n1' }, // falta tipo, titulo, contenido
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/campos requeridos/i);
  });

  it('retorna 200 y el artefacto creado con campos completos', async () => {
    const artifact = { id: 'art-1', nino_id: 'n1', tipo: 'resumen', titulo: 'T', contenido: 'c' };
    const chain = createSupabaseChain(artifact);
    mockAdmin.from.mockReturnValue(chain);

    const req = createAuthRequest('/api/artifacts', {
      method: 'POST',
      body: { nino_id: 'n1', tipo: 'resumen', titulo: 'T', contenido: 'c', descripcion: 'd' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('art-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/artifacts
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/artifacts', () => {
  it('retorna 400 si falta nino_id en query', async () => {
    const req = createAuthRequest('/api/artifacts', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/nino_id/);
  });

  it('retorna 401 sin header de auth', async () => {
    const req = createAuthRequest('/api/artifacts', {
      method: 'GET',
      token: '',
      searchParams: { nino_id: 'n1' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 200 con lista de artefactos', async () => {
    const items = [{ id: 'a1' }, { id: 'a2' }];
    const chain = createSupabaseChain(items);
    mockAdmin.from.mockReturnValue(chain);

    const req = createAuthRequest('/api/artifacts', {
      method: 'GET',
      searchParams: { nino_id: 'n1' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/artifacts/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /api/artifacts/[id]', () => {
  it('retorna 401 sin Authorization', async () => {
    const req = createAuthRequest('/api/artifacts/abc', { method: 'DELETE', token: '' });
    const context = { params: Promise.resolve({ id: 'abc' }) };
    const res = await DELETE(req, context);
    expect(res.status).toBe(401);
  });

  it('retorna 200 con success al eliminar', async () => {
    const chain = createSupabaseChain(null, null);
    mockAdmin.from.mockReturnValue(chain);

    const req = createAuthRequest('/api/artifacts/abc', { method: 'DELETE' });
    const context = { params: Promise.resolve({ id: 'abc' }) };
    const res = await DELETE(req, context);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
