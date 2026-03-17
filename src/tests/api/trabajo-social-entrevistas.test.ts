/**
 * Tests para GET/POST /api/trabajo-social/entrevistas
 * CRUD de entrevistas de trabajo social (cookie-based via createClient)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseChain } from '../helpers/api-helpers';

const mockSupabase: Record<string, any> = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

// This route uses createClient from @supabase/supabase-js directly with cookies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
    set: vi.fn(),
    toString: () => 'cookie=value',
  })),
}));

import { GET, POST } from '@/app/api/trabajo-social/entrevistas/route';

describe('GET /api/trabajo-social/entrevistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna entrevistas correctamente', async () => {
    const mockEntrevistas = [
      { id: 'ent-1', nino_id: 'nino-1', tipo: 'inicial', nino: { id: 'nino-1', alias: 'Test' } },
    ];
    mockSupabase.from.mockImplementation(() => createSupabaseChain(mockEntrevistas));

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entrevistas).toHaveLength(1);
  });

  it('filtra por nino_id si se provee', async () => {
    const chain = createSupabaseChain([]);
    mockSupabase.from.mockImplementation(() => chain);

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas?nino_id=nino-123');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('nino_id', 'nino-123');
  });

  it('retorna 500 si hay error de base de datos', async () => {
    const errorChain = createSupabaseChain(null, { message: 'DB error' });
    mockSupabase.from.mockImplementation(() => errorChain);

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/trabajo-social/entrevistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'ts-user-1' } } },
    });
  });

  it('retorna 401 si no hay sesión', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nino_id: 'nino-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si rol no es trabajo_social', async () => {
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ rol: 'voluntario' })
    );

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nino_id: 'nino-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si falta nino_id', async () => {
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ rol: 'trabajo_social' })
    );

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('niño');
  });

  it('crea entrevista exitosamente', async () => {
    const mockEntrevista = { id: 'ent-new', nino_id: 'nino-1', tipo: 'inicial' };
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'trabajo_social' });
      if (table === 'entrevistas') return createSupabaseChain(mockEntrevista);
      // Secondary tables (alimentacion, escolaridad, etc.)
      return createSupabaseChain(null);
    });

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nino_id: 'nino-1',
        tipo_entrevista: 'inicial',
        lugar_entrevista: 'Sede',
        observaciones_trabajadora_social: 'Todo bien',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.entrevista).toBeTruthy();
  });

  it('retorna 500 si falla la inserción de entrevista', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'admin' });
      if (table === 'entrevistas') return createSupabaseChain(null, { message: 'Insert failed' });
      return createSupabaseChain(null);
    });

    const req = new Request('http://localhost:3000/api/trabajo-social/entrevistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nino_id: 'nino-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
