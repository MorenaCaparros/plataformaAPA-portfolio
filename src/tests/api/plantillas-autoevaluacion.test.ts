/**
 * Tests para src/app/api/plantillas-autoevaluacion/route.ts
 * Cubre GET (listar plantillas).
 * Patrón: Hybrid (Bearer OR cookies) via createAuthenticatedClient.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFromQuery = vi.fn();

vi.mock('@/lib/supabase/api-auth', () => ({
  createAuthenticatedClient: vi.fn(async () => ({
    _authUserId: 'user-1',
    auth: { getUser: mockGetUser },
    from: mockFromQuery,
  })),
}));

function createChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'insert', 'update'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Resolve the chain when awaited
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data, error })
  );
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

describe('GET /api/plantillas-autoevaluacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 200 con array de plantillas', async () => {
    const mockCapacitaciones = [
      {
        id: 'cap-1',
        nombre: 'Autoevaluación Lenguaje',
        area: 'lenguaje',
        descripcion: 'Test desc',
        activa: true,
        puntaje_minimo_aprobacion: 70,
        created_at: '2025-01-01',
        preguntas: [
          {
            id: 'p1',
            orden: 1,
            pregunta: '¿Qué es...?',
            tipo_pregunta: 'opcion_multiple',
            puntaje: 10,
            area_especifica: 'lenguaje',
            opciones: [
              { id: 'o1', orden: 1, texto_opcion: 'A', es_correcta: true },
              { id: 'o2', orden: 2, texto_opcion: 'B', es_correcta: false },
            ],
          },
        ],
      },
    ];

    mockFromQuery.mockReturnValue(createChain(mockCapacitaciones));

    const { GET } = await import('@/app/api/plantillas-autoevaluacion/route');
    const request = new NextRequest(
      new URL('http://localhost:3000/api/plantillas-autoevaluacion'),
      { method: 'GET' }
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('titulo', 'Autoevaluación Lenguaje');
    expect(data[0]).toHaveProperty('area', 'lenguaje');
    expect(data[0].preguntas).toHaveLength(1);
  });

  it('retorna 200 con array vacío si no hay plantillas', async () => {
    mockFromQuery.mockReturnValue(createChain([]));

    const { GET } = await import('@/app/api/plantillas-autoevaluacion/route');
    const request = new NextRequest(
      new URL('http://localhost:3000/api/plantillas-autoevaluacion'),
      { method: 'GET' }
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('filtra por area cuando se proporciona searchParam', async () => {
    const chain = createChain([]);
    mockFromQuery.mockReturnValue(chain);

    const { GET } = await import('@/app/api/plantillas-autoevaluacion/route');
    const request = new NextRequest(
      new URL('http://localhost:3000/api/plantillas-autoevaluacion?area=lenguaje'),
      { method: 'GET' }
    );
    await GET(request);

    // Verificar que se llamó eq con area
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});
