/**
 * Tests para /api/voluntarios/capacitaciones (GET, POST, PATCH)
 * Auth: Bearer token → supabaseAdmin.auth.getUser(token)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createSupabaseChain, createMockSupabaseAdmin } from '../helpers/api-helpers';

// ── Mock de @supabase/supabase-js ──────────────────────────────────────────
const { mockAdmin } = createMockSupabaseAdmin({
  user: { id: 'user-1', email: 'coord@apa.org' },
  perfil: { rol: 'coordinador' },
  defaultData: null,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

const { GET, POST, PATCH } = await import('@/app/api/voluntarios/capacitaciones/route');

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/voluntarios/capacitaciones
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/voluntarios/capacitaciones', () => {
  it('retorna 401 sin Authorization header', async () => {
    const req = createAuthRequest('/api/voluntarios/capacitaciones', { token: '' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 con token inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    });
    const req = createAuthRequest('/api/voluntarios/capacitaciones');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si voluntario intenta ver capacitaciones de otro', async () => {
    // Auth user = user-1, pidiendo voluntario_id de otro
    mockAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    // Perfil usuario actual = voluntario (no puede ver de otros)
    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      searchParams: { voluntario_id: 'other-user' },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('retorna 200 con capacitaciones y estadísticas', async () => {
    const items = [
      { estado: 'pendiente', capacitacion: { nombre: 'Cap1' } },
      { estado: 'completada', capacitacion: { nombre: 'Cap2' } },
    ];
    // perfil chain
    const perfilChain = createSupabaseChain({ rol: 'coordinador' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    // capacitaciones chain
    const capChain = createSupabaseChain(items);
    mockAdmin.from.mockReturnValueOnce(capChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      searchParams: { voluntario_id: 'vol-1' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.capacitaciones).toHaveLength(2);
    expect(json.estadisticas).toBeDefined();
    expect(json.estadisticas.total).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/voluntarios/capacitaciones
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/voluntarios/capacitaciones', () => {
  it('retorna 401 sin header', async () => {
    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'POST',
      token: '',
      body: { voluntario_id: 'v1', capacitacion_id: 'c1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 con rol voluntario', async () => {
    // perfil chain con rol voluntario
    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1', capacitacion_id: 'c1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 sin campos requeridos', async () => {
    const perfilChain = createSupabaseChain({ rol: 'coordinador' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1' }, // falta capacitacion_id
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si usuario no es voluntario', async () => {
    const perfilChain = createSupabaseChain({ rol: 'coordinador' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    // Perfil del target user = coordinador (no voluntario)
    const targetChain = createSupabaseChain({ rol: 'coordinador' });
    mockAdmin.from.mockReturnValueOnce(targetChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1', capacitacion_id: 'c1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/voluntario/i);
  });

  it('retorna 201 al asignar capacitación', async () => {
    const perfilChain = createSupabaseChain({ rol: 'coordinador' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    // target es voluntario
    const targetChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(targetChain);
    // insert 
    const insertChain = createSupabaseChain({ id: 'vc-1', estado: 'pendiente' });
    mockAdmin.from.mockReturnValueOnce(insertChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'POST',
      body: { voluntario_id: 'v1', capacitacion_id: 'c1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.mensaje).toMatch(/asignada/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/voluntarios/capacitaciones
// ═══════════════════════════════════════════════════════════════════════════
describe('PATCH /api/voluntarios/capacitaciones', () => {
  it('retorna 401 sin header', async () => {
    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'PATCH',
      token: '',
      body: { id: 'vc-1', estado: 'en_progreso' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 sin id o estado', async () => {
    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'PATCH',
      body: { id: 'vc-1' }, // falta estado
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('retorna 400 con estado inválido', async () => {
    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'PATCH',
      body: { id: 'vc-1', estado: 'invalido' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/estado/i);
  });

  it('retorna 404 si la asignación no existe', async () => {
    // asignacion lookup retorna null
    const asigChain = createSupabaseChain(null);
    mockAdmin.from.mockReturnValueOnce(asigChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'PATCH',
      body: { id: 'vc-999', estado: 'en_progreso' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it('retorna 200 al actualizar estado (voluntario propio)', async () => {
    // asignacion lookup
    const asigChain = createSupabaseChain({ voluntario_id: 'user-1', fecha_inicio: null });
    mockAdmin.from.mockReturnValueOnce(asigChain);
    // perfil chain
    const perfilChain = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockReturnValueOnce(perfilChain);
    // update chain
    const updateChain = createSupabaseChain({ id: 'vc-1', estado: 'en_progreso' });
    mockAdmin.from.mockReturnValueOnce(updateChain);

    const req = createAuthRequest('/api/voluntarios/capacitaciones', {
      method: 'PATCH',
      body: { id: 'vc-1', estado: 'en_progreso' },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mensaje).toMatch(/actualizada/i);
  });
});
