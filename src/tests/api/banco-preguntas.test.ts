/**
 * Tests para GET/POST /api/banco-preguntas
 * Gestión del banco de preguntas de capacitación (createAuthenticatedClient)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain } from '../helpers/api-helpers';

const mockSupabase: Record<string, any> = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  _authUserId: 'user-1',
};

vi.mock('@/lib/supabase/api-auth', () => ({
  createAuthenticatedClient: vi.fn(async () => mockSupabase),
}));

import { GET, POST } from '@/app/api/banco-preguntas/route';

describe('GET /api/banco-preguntas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase._authUserId = 'user-1';
  });

  it('retorna 403 si usuario no tiene permiso', async () => {
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ id: 'user-1', rol: 'voluntario' })
    );

    const req = createAuthRequest('/api/banco-preguntas');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('retorna preguntas para rol autorizado', async () => {
    const mockPreguntas = [
      {
        id: 'q1',
        pregunta: '¿Cómo evaluar lectura?',
        tipo_pregunta: 'escala',
        area_especifica: 'lectura_escritura',
        puntaje: 10,
        orden: 1,
        respuesta_correcta: '',
        opciones: [],
        created_at: '2026-01-01',
      },
    ];

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      if (table === 'preguntas_capacitacion') return createSupabaseChain(mockPreguntas);
      return createSupabaseChain([]);
    });

    const req = createAuthRequest('/api/banco-preguntas');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].pregunta).toBe('¿Cómo evaluar lectura?');
    expect(json[0].activa).toBe(true);
  });

  it('filtra por area si se provee', async () => {
    const preguntasChain = createSupabaseChain([]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return preguntasChain;
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      searchParams: { area: 'lenguaje' },
    });
    await GET(req);
    expect(preguntasChain.eq).toHaveBeenCalledWith('area_especifica', 'lenguaje');
  });

  it('filtra por activa=true (puntaje > 0)', async () => {
    const preguntasChain = createSupabaseChain([]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'psicopedagogia' });
      return preguntasChain;
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      searchParams: { activa: 'true' },
    });
    await GET(req);
    expect(preguntasChain.gt).toHaveBeenCalledWith('puntaje', 0);
  });

  it('retorna 500 si hay error de DB', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return createSupabaseChain(null, { message: 'DB error' });
    });

    const req = createAuthRequest('/api/banco-preguntas');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/banco-preguntas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase._authUserId = 'user-1';
  });

  it('retorna 403 si usuario no tiene permiso', async () => {
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ id: 'user-1', rol: 'voluntario' })
    );

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: { preguntas: [{ pregunta: 'Test', area: 'lenguaje' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si preguntas no es array o está vacío', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return createSupabaseChain([]);
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: { preguntas: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('preguntas');
  });

  it('retorna 400 si una pregunta no tiene texto', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return createSupabaseChain([]);
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: { preguntas: [{ pregunta: '', area: 'lenguaje' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('texto');
  });

  it('retorna 400 si una pregunta no tiene area', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return createSupabaseChain([]);
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: { preguntas: [{ pregunta: 'Test pregunta', area: '' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('área');
  });

  it('crea preguntas exitosamente', async () => {
    const createdPreguntas = [
      { id: 'q-new', pregunta: 'Test', tipo_pregunta: 'escala', area_especifica: 'lenguaje' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      if (table === 'preguntas_capacitacion') return createSupabaseChain(createdPreguntas);
      return createSupabaseChain([]);
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: {
        preguntas: [
          { pregunta: 'Test pregunta', area: 'lenguaje', tipo_pregunta: 'escala' },
        ],
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveLength(1);
  });

  it('retorna 500 si falla la inserción', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'perfiles') return createSupabaseChain({ id: 'user-1', rol: 'director' });
      return createSupabaseChain(null, { message: 'Insert failed' });
    });

    const req = createAuthRequest('/api/banco-preguntas', {
      method: 'POST',
      body: {
        preguntas: [
          { pregunta: 'Test pregunta', area: 'lenguaje' },
        ],
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
