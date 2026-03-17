/**
 * Tests para /api/debug/asignaciones (GET)
 * Auth: ninguna, pero bloqueado en producción
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

beforeEach(() => vi.clearAllMocks());

describe('GET /api/debug/asignaciones', () => {
  it('retorna 404 en producción', async () => {
    const originalEnv = process.env.NODE_ENV;
    // @ts-expect-error — solo para testing
    process.env.NODE_ENV = 'production';

    // Re-importar para captar el env
    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ from: vi.fn() })),
    }));
    const { GET } = await import('@/app/api/debug/asignaciones/route');

    const req = new Request('http://localhost:3000/api/debug/asignaciones?voluntario_id=abc');
    const res = await GET(req as any);
    expect(res.status).toBe(404);

    // @ts-expect-error
    process.env.NODE_ENV = originalEnv;
  });

  it('retorna 400 sin voluntario_id en query', async () => {
    const originalEnv = process.env.NODE_ENV;
    // @ts-expect-error
    process.env.NODE_ENV = 'test';

    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ from: vi.fn() })),
    }));
    const { GET } = await import('@/app/api/debug/asignaciones/route');

    const req = new Request('http://localhost:3000/api/debug/asignaciones');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/voluntario_id/);

    // @ts-expect-error
    process.env.NODE_ENV = originalEnv;
  });
});
