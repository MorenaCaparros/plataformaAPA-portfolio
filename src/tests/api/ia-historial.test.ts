/**
 * Tests para /api/ia/historial (GET, POST)
 * Auth: cookie-based via @/lib/supabase/server con verificación de rol
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock helpers ───────────────────────────────────────────────────────────
function createChain(data: unknown = null, error: unknown = null, count: number | null = null) {
  const chain: Record<string, any> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'single', 'order', 'limit', 'range']
    .forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.then = vi.fn((resolve: any) => resolve({ data, error, count }));
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

const { GET, POST } = await import('@/app/api/ia/historial/route');

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'u1' };
  mockPerfil = { rol: 'psicopedagogia' };

  mockFrom.mockImplementation(() => createChain(mockPerfil));
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ia/historial
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/ia/historial', () => {
  it('retorna 401 sin autenticación', async () => {
    mockUser = null;
    const req = new Request('http://localhost:3000/api/ia/historial') as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    mockPerfil = { rol: 'voluntario' };
    mockFrom.mockReturnValueOnce(createChain({ rol: 'voluntario' }));
    const req = new Request('http://localhost:3000/api/ia/historial') as any;
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('retorna 200 con historial y total', async () => {
    // perfil
    mockFrom.mockReturnValueOnce(createChain({ rol: 'psicopedagogia' }));
    // historial query
    const items = [{ id: 'h1', pregunta: 'Test' }];
    mockFrom.mockReturnValueOnce(createChain(items, null, 1));

    const req = new Request('http://localhost:3000/api/ia/historial') as any;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.historial).toBeDefined();
    expect(json.total).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/ia/historial
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/ia/historial', () => {
  const makeReq = (body: any) =>
    new Request('http://localhost:3000/api/ia/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;

  it('retorna 401 sin sesión', async () => {
    mockUser = null;
    const res = await POST(makeReq({ modo: 'biblioteca', pregunta: 'test' }));
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol no permitido', async () => {
    mockFrom.mockReturnValueOnce(createChain({ rol: 'voluntario' }));
    const res = await POST(makeReq({ modo: 'biblioteca', pregunta: 'test' }));
    expect(res.status).toBe(403);
  });

  it('retorna 400 sin modo o pregunta', async () => {
    mockFrom.mockReturnValueOnce(createChain({ rol: 'psicopedagogia' }));
    const res = await POST(makeReq({ modo: 'biblioteca' })); // falta pregunta
    expect(res.status).toBe(400);
  });

  it('retorna 200 al crear entrada de historial', async () => {
    // perfil
    mockFrom.mockReturnValueOnce(createChain({ rol: 'psicopedagogia' }));
    // insert
    mockFrom.mockReturnValueOnce(createChain({ id: 'h-new' }));

    const res = await POST(makeReq({
      modo: 'biblioteca',
      pregunta: '¿Qué es la dislexia?',
      respuesta: 'Es...',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
