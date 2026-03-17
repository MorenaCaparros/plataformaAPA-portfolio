/**
 * Tests para GET/POST /api/psicopedagogia/evaluaciones
 * Evaluaciones psicopedagógicas (entrevistas tipo 'inicial')
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '../helpers/api-helpers';

// vi.hoisted runs before vi.mock — safe for top-level module const
const mockAdmin = vi.hoisted(() => {
  const chainMethods = ['select','insert','update','delete','upsert','eq','neq','in','gte','lte','gt','lt','order','limit','range','is','not','or','ilike'];
  function makeChain(data: any = null, err: any = null) {
    const c: any = {};
    chainMethods.forEach(m => { c[m] = vi.fn().mockReturnValue(c); });
    c.single = vi.fn().mockResolvedValue({ data, error: err });
    c.maybeSingle = vi.fn().mockResolvedValue({ data, error: err });
    c.then = vi.fn((resolve: any) => resolve({ data, error: err }));
    return c;
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'psico-1', email: 'psico@test.com' } }, error: null }),
    },
    from: vi.fn((_table: string) => makeChain()),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

import { GET, POST } from '@/app/api/psicopedagogia/evaluaciones/route';

describe('GET /api/psicopedagogia/evaluaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'psico-1', email: 'psico@test.com' } },
      error: null,
    });
  });

  it('retorna 401 sin token', async () => {
    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', { token: '' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 si token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Bad token' },
    });

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna evaluaciones mapeadas correctamente', async () => {
    const mockEntrevistas = [
      {
        id: 'eval-1',
        nino_id: 'nino-1',
        fecha: '2026-01-20',
        observaciones: 'Obs test',
        conclusiones: 'Conc test',
        acciones_sugeridas: 'Acc test',
        nino: { id: 'nino-1', alias: 'Juancito', fecha_nacimiento: '2018-01-01', rango_etario: '5-7' },
        entrevistador: { id: 'psico-1', nombre: 'Ana', apellido: 'García' },
      },
    ];

    const entrevistasChain = createSupabaseChain(mockEntrevistas);
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'entrevistas') return entrevistasChain;
      return createSupabaseChain(null);
    });

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.evaluaciones).toHaveLength(1);
    expect(json.evaluaciones[0]).toMatchObject({
      id: 'eval-1',
      fecha_evaluacion: '2026-01-20',
      observaciones_generales: 'Obs test',
      conclusiones: 'Conc test',
    });
  });

  it('filtra por nino_id si se provee', async () => {
    const chain = createSupabaseChain([]);
    mockAdmin.from.mockImplementation(() => chain);

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      searchParams: { nino_id: 'nino-123' },
    });
    await GET(req);

    expect(chain.eq).toHaveBeenCalledWith('tipo', 'inicial');
    expect(chain.eq).toHaveBeenCalledWith('nino_id', 'nino-123');
  });

  it('retorna 500 si hay error de base de datos', async () => {
    const errorChain = createSupabaseChain(null, { message: 'DB error' });
    mockAdmin.from.mockImplementation(() => errorChain);

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/psicopedagogia/evaluaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'psico-1', email: 'psico@test.com' } },
      error: null,
    });

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'psicopedagogia' });
      return createSupabaseChain(null);
    });
  });

  it('retorna 401 sin token', async () => {
    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      method: 'POST',
      token: '',
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si rol no permitido', async () => {
    mockAdmin.from.mockImplementation(() => createSupabaseChain({ rol: 'voluntario' }));

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      method: 'POST',
      body: { nino_id: 'nino-1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si falta nino_id', async () => {
    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('niño');
  });

  it('crea evaluación correctamente', async () => {
    const mockEvaluacion = { id: 'eval-new', nino_id: 'nino-1', tipo: 'inicial' };
    const entrevistasChain = createSupabaseChain(mockEvaluacion);
    const ninosChain = createSupabaseChain(null);

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'psicopedagogia' });
      if (table === 'entrevistas') return entrevistasChain;
      if (table === 'ninos') return ninosChain;
      return createSupabaseChain(null);
    });

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      method: 'POST',
      body: {
        nino_id: 'nino-1',
        comprension_ordenes: 3,
        nivel_alfabetizacion: 'inicial',
        observaciones_generales: 'Buen progreso',
        dificultades_identificadas: ['Lectura'],
        fortalezas: ['Matemáticas'],
        recomendaciones: 'Más ejercicios de lectura',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('retorna 500 si falla la inserción', async () => {
    const errorChain = createSupabaseChain(null, { message: 'Insert error' });
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ rol: 'psicopedagogia' });
      if (table === 'entrevistas') return errorChain;
      return createSupabaseChain(null);
    });

    const req = createAuthRequest('/api/psicopedagogia/evaluaciones', {
      method: 'POST',
      body: { nino_id: 'nino-1' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
