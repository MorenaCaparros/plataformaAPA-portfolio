/**
 * Tests para src/app/api/psicopedagogia/planes/route.ts
 * Cubre GET (listar), POST (crear), PATCH (actualizar) planes de intervención.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFromChain: Record<string, ReturnType<typeof vi.fn>> = {};
const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'];

for (const method of chainMethods) {
  mockFromChain[method] = vi.fn().mockReturnValue(mockFromChain);
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => mockFromChain),
  })),
}));

function createRequest(
  pathname: string,
  options: { method?: string; body?: Record<string, unknown>; searchParams?: Record<string, string> } = {}
) {
  const { method = 'GET', body, searchParams } = options;
  const url = new URL(`http://localhost:3000${pathname}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  const headers = new Headers();
  const init: RequestInit = { method, headers };
  if (body) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }
  return new (require('next/server').NextRequest)(url, init);
}

describe('GET /api/psicopedagogia/planes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const method of chainMethods) {
      mockFromChain[method] = vi.fn().mockReturnValue(mockFromChain);
    }
  });

  it('retorna 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } });

    const { GET } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autenticado');
  });

  it('retorna 200 con datos cuando hay usuario autenticado', async () => {
    const mockPlanes = [
      { id: 'plan-1', titulo: 'Plan A', area: 'lectura_escritura' },
    ];

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // La cadena termina cuando se resuelve el thenable (await query)
    const thenable: Record<string, unknown> = { ...mockFromChain };
    thenable.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ data: mockPlanes, error: null })
    );
    for (const method of chainMethods) {
      (mockFromChain[method] as ReturnType<typeof vi.fn>).mockReturnValue(thenable);
    }

    const { GET } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/psicopedagogia/planes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const method of chainMethods) {
      mockFromChain[method] = vi.fn().mockReturnValue(mockFromChain);
    }
  });

  it('retorna 401 sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } });

    const { POST } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes', {
      method: 'POST',
      body: { nino_id: '1', titulo: 'Plan test', area: 'lectura_escritura' },
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('retorna 403 si el usuario no tiene rol permitido', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    (mockFromChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { rol: 'voluntario' },
      error: null,
    });

    const { POST } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes', {
      method: 'POST',
      body: { nino_id: '1', titulo: 'Plan test', area: 'lectura_escritura' },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Sin permisos');
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    (mockFromChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { rol: 'psicopedagogia' },
      error: null,
    });

    const { POST } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes', {
      method: 'POST',
      body: { titulo: 'Sin nino_id ni area' },
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Faltan campos obligatorios');
  });
});

describe('PATCH /api/psicopedagogia/planes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const method of chainMethods) {
      mockFromChain[method] = vi.fn().mockReturnValue(mockFromChain);
    }
  });

  it('retorna 401 sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } });

    const { PATCH } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes', {
      method: 'PATCH',
      body: { id: 'plan-1', estado: 'completado' },
    });
    const response = await PATCH(request);

    expect(response.status).toBe(401);
  });

  it('retorna 400 si falta el id del plan', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { PATCH } = await import('@/app/api/psicopedagogia/planes/route');
    const request = createRequest('/api/psicopedagogia/planes', {
      method: 'PATCH',
      body: { estado: 'completado' },
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Falta id');
  });
});
