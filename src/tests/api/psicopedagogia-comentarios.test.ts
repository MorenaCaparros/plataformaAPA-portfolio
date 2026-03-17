/**
 * Tests para /api/psicopedagogia/comentarios (GET, POST, DELETE)
 * Auth: cookie-based via @/lib/supabase/server
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

const { GET, POST, DELETE } = await import('@/app/api/psicopedagogia/comentarios/route');

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'u1' };
  mockFrom.mockReturnValue(createChain([]));
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/psicopedagogia/comentarios
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/psicopedagogia/comentarios', () => {
  it('retorna 401 sin autenticación', async () => {
    mockUser = null;
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios?plan_id=p1') as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 sin plan_id', async () => {
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios') as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/plan_id/i);
  });

  it('retorna 200 con lista de comentarios', async () => {
    mockFrom.mockReturnValue(createChain([{ id: 'c1', contenido: 'Buen avance' }]));
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios?plan_id=p1') as any;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/psicopedagogia/comentarios
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/psicopedagogia/comentarios', () => {
  const makeReq = (body: any) =>
    new Request('http://localhost:3000/api/psicopedagogia/comentarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;

  it('retorna 401 sin sesión', async () => {
    mockUser = null;
    const res = await POST(makeReq({ plan_id: 'p1', contenido: 'Nota' }));
    expect(res.status).toBe(401);
  });

  it('retorna 400 sin campos obligatorios', async () => {
    const res = await POST(makeReq({ plan_id: 'p1' })); // falta contenido
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/obligatorios|contenido/i);
  });

  it('retorna 201 al crear comentario', async () => {
    const comentario = { id: 'c1', plan_id: 'p1', contenido: 'Nota', autor: {} };
    mockFrom.mockReturnValue(createChain(comentario));
    const res = await POST(makeReq({ plan_id: 'p1', contenido: 'Nota' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('c1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/psicopedagogia/comentarios
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /api/psicopedagogia/comentarios', () => {
  it('retorna 401 sin sesión', async () => {
    mockUser = null;
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios?id=c1', {
      method: 'DELETE',
    }) as any;
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 sin id en query', async () => {
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios', {
      method: 'DELETE',
    }) as any;
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('retorna 200 al eliminar comentario', async () => {
    mockFrom.mockReturnValue(createChain(null));
    const req = new Request('http://localhost:3000/api/psicopedagogia/comentarios?id=c1', {
      method: 'DELETE',
    }) as any;
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
