/**
 * Tests para /api/documentos/[id] (DELETE, PATCH)
 * Auth: cookie-based via @/lib/supabase/server con verificación de rol
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock helpers ───────────────────────────────────────────────────────────
function createChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'single', 'order', 'limit']
    .forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.then = vi.fn((resolve: any) => resolve({ data, error }));
  return chain;
}

let mockUser: any = { id: 'u1' };
let mockPerfil: any = { rol: 'psicopedagogia' };
const mockFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: mockUser },
      error: mockUser ? null : { message: 'no user' },
    })),
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const { DELETE, PATCH } = await import('@/app/api/documentos/[id]/route');

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'u1' };
  mockPerfil = { rol: 'psicopedagogia' };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'perfiles') return createChain(mockPerfil);
    if (table === 'document_chunks') return createChain(null);
    if (table === 'documentos') return createChain(null);
    return createChain(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/documentos/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /api/documentos/[id]', () => {
  const makeReq = () => new Request('http://localhost:3000/api/documentos/doc-1', { method: 'DELETE' }) as any;
  const params = { params: Promise.resolve({ id: 'doc-1' }) };

  it('retorna 401 sin autenticación', async () => {
    mockUser = null;
    const res = await DELETE(makeReq(), params);
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    mockPerfil = { rol: 'voluntario' };
    const res = await DELETE(makeReq(), params);
    expect(res.status).toBe(403);
  });

  it('retorna 200 con rol psicopedagogia', async () => {
    const res = await DELETE(makeReq(), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('retorna 200 con rol director', async () => {
    mockPerfil = { rol: 'director' };
    const res = await DELETE(makeReq(), params);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/documentos/[id]
// ═══════════════════════════════════════════════════════════════════════════
describe('PATCH /api/documentos/[id]', () => {
  const makeReq = (body: any) =>
    new Request('http://localhost:3000/api/documentos/doc-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;
  const params = { params: Promise.resolve({ id: 'doc-1' }) };

  it('retorna 401 sin sesión', async () => {
    mockUser = null;
    const res = await PATCH(makeReq({ tags: ['a'] }), params);
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    mockPerfil = { rol: 'voluntario' };
    const res = await PATCH(makeReq({ tags: ['a'] }), params);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si tags no es array', async () => {
    const res = await PATCH(makeReq({ tags: 'no-array' }), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/array/i);
  });

  it('retorna 400 con rango_etario no válido', async () => {
    const res = await PATCH(makeReq({ rango_etario: '99' }), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/rango_etario/i);
  });

  it('retorna 400 si no hay campos para actualizar', async () => {
    const res = await PATCH(makeReq({}), params);
    expect(res.status).toBe(400);
  });

  it('retorna 200 con tags válidos', async () => {
    const res = await PATCH(makeReq({ tags: ['lectura', 'MATEMÁTICAS'] }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('acepta equipo_profesional como rol válido', async () => {
    mockPerfil = { rol: 'equipo_profesional' };
    const res = await PATCH(makeReq({ rango_etario: '6-8' }), params);
    expect(res.status).toBe(200);
  });
});
