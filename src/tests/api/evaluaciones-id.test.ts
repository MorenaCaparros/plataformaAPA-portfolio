/**
 * Tests para /api/psicopedagogia/evaluaciones/[id] (GET)
 * Auth: Bearer token → supabaseAdmin, con verificación de rol
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain, createMockSupabaseAdmin } from '../helpers/api-helpers';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const { mockAdmin } = createMockSupabaseAdmin({
  user: { id: 'user-1', email: 'psico@apa.org' },
  perfil: { rol: 'psicopedagogia' },
  defaultData: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

const { GET } = await import('@/app/api/psicopedagogia/evaluaciones/[id]/route');

beforeEach(() => vi.clearAllMocks());

describe('GET /api/psicopedagogia/evaluaciones/[id]', () => {
  const makeReq = (token?: string) =>
    createAuthRequest('/api/psicopedagogia/evaluaciones/eval-1', {
      method: 'GET',
      token,
    });

  it('retorna 401 sin Authorization header', async () => {
    const req = makeReq('');
    const res = await GET(req, { params: { id: 'eval-1' } });
    expect(res.status).toBe(401);
  });

  it('retorna 401 con token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    });
    const req = makeReq();
    const res = await GET(req, { params: { id: 'eval-1' } });
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = makeReq();
    const res = await GET(req, { params: { id: 'eval-1' } });
    expect(res.status).toBe(403);
  });

  it('retorna 404 si evaluación no existe (PGRST116)', async () => {
    const perfilChain = createSupabaseChain({ rol: 'psicopedagogia' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    const evalChain = createSupabaseChain(null, { code: 'PGRST116', message: 'not found' });
    mockAdmin.from.mockReturnValueOnce(evalChain);

    const req = makeReq();
    const res = await GET(req, { params: { id: 'eval-999' } });
    expect(res.status).toBe(404);
  });

  it('retorna 200 con datos de evaluación', async () => {
    const evalData = { id: 'eval-1', nino: { alias: 'Juan' }, entrevistador: { nombre: 'Ana' } };
    const perfilChain = createSupabaseChain({ rol: 'psicopedagogia' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    const evalChain = createSupabaseChain(evalData);
    mockAdmin.from.mockReturnValueOnce(evalChain);

    const req = makeReq();
    const res = await GET(req, { params: { id: 'eval-1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.evaluacion.id).toBe('eval-1');
  });
});
