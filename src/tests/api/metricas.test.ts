/**
 * Tests para /api/metricas — lógica del GET handler y switch de roles.
 *
 * Estrategia: mock de @supabase/supabase-js para que createClient()
 * devuelva un cliente controlado, con mocks por defecto que devuelven
 * conteos en cero y arrays vacíos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Crea un chain fake de Supabase que devuelve { data, count, error } al final */
function createChain(result: { data?: unknown; count?: number; error?: null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'from', 'select', 'eq', 'neq', 'in', 'gte', 'lte', 'order',
    'limit', 'range', 'insert', 'update', 'delete',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain['single'] = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });

  // Por defecto, await del chain devuelve el resultado
  // (cuando se usa sin .single(), ej: const { data } = await supabase.from().select()...)
  const thenable: Record<string, unknown> = {
    ...chain,
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: result.data ?? [], count: result.count ?? 0, error: null }),
  };
  for (const method of methods) {
    thenable[method] = vi.fn().mockReturnValue(thenable);
  }
  thenable['single'] = vi.fn().mockResolvedValue({ data: result.data ?? null, error: null });
  thenable['maybeSingle'] = vi.fn().mockResolvedValue({ data: result.data ?? null, error: null });

  return thenable;
}

// ── Mock de @supabase/supabase-js ────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const chain = createChain({ data: [], count: 0 });
  return {
    createClient: vi.fn(() => ({ from: vi.fn(() => chain) })),
  };
});

// Import AFTER mocking
import { GET } from '@/app/api/metricas/route';

// ── Helpers de request ───────────────────────────────────────────────────────
function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/metricas');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

// ────────────────────────────────────────────────────────────────────────────
// Validación de parámetros
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/metricas — validación de parámetros', () => {
  it('retorna 400 si no hay parámetros', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('requeridos');
  });

  it('retorna 400 si falta userId', async () => {
    const res = await GET(makeRequest({ rol: 'voluntario' }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta rol', async () => {
    const res = await GET(makeRequest({ userId: 'abc-123' }));
    expect(res.status).toBe(400);
  });

  it('retorna 400 para un rol desconocido', async () => {
    const res = await GET(makeRequest({ userId: 'abc-123', rol: 'rol_inexistente' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rol no válido/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Switch de roles — respuesta 200 y shape correcta
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/metricas — switch de roles', () => {
  it('rol voluntario → retorna 200 con claves resumen, detalle, tendencias', async () => {
    const res = await GET(makeRequest({ userId: 'vol-1', rol: 'voluntario' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.metricas).toHaveProperty('resumen');
    expect(body.metricas).toHaveProperty('detalle');
    expect(body.metricas).toHaveProperty('tendencias');
  });

  it('rol coordinador → retorna 200 (shape de equipo)', async () => {
    const res = await GET(makeRequest({ userId: 'coord-1', rol: 'coordinador' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.metricas).toBeDefined();
  });

  it('rol trabajador_social → retorna 200 (bug corregido, no 400)', async () => {
    const res = await GET(makeRequest({ userId: 'ts-1', rol: 'trabajador_social' }));
    expect(res.status).toBe(200);
  });

  it('rol trabajadora_social → retorna 200 (bug corregido, no 400)', async () => {
    const res = await GET(makeRequest({ userId: 'ts-2', rol: 'trabajadora_social' }));
    expect(res.status).toBe(200);
  });

  it('rol equipo_profesional → retorna 200 (bug corregido, no 400)', async () => {
    const res = await GET(makeRequest({ userId: 'ep-1', rol: 'equipo_profesional' }));
    expect(res.status).toBe(200);
  });

  it('rol psicopedagogia → retorna 200 con claves resumen, este_mes, distribucion', async () => {
    const res = await GET(makeRequest({ userId: 'psico-1', rol: 'psicopedagogia' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.metricas).toHaveProperty('resumen');
    expect(body.metricas).toHaveProperty('este_mes');
    expect(body.metricas).toHaveProperty('distribucion');
  });

  it('rol admin → retorna 200 (misma shape que psicopedagogia)', async () => {
    const res = await GET(makeRequest({ userId: 'admin-1', rol: 'admin' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.metricas).toHaveProperty('resumen');
  });

  it('rol director → retorna 200', async () => {
    const res = await GET(makeRequest({ userId: 'dir-1', rol: 'director' }));
    expect(res.status).toBe(200);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Shape de respuesta exitosa
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/metricas — shape de respuesta', () => {
  it('incluye success, rol, metricas y generado_en', async () => {
    const res = await GET(makeRequest({ userId: 'vol-1', rol: 'voluntario' }));
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('rol', 'voluntario');
    expect(body).toHaveProperty('metricas');
    expect(body).toHaveProperty('generado_en');
  });

  it('generado_en es una fecha ISO válida', async () => {
    const res = await GET(makeRequest({ userId: 'vol-1', rol: 'voluntario' }));
    const body = await res.json();
    expect(() => new Date(body.generado_en)).not.toThrow();
    expect(new Date(body.generado_en).getFullYear()).toBeGreaterThan(2020);
  });
});
