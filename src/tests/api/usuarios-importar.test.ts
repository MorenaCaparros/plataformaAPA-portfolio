/**
 * Tests para POST /api/usuarios/importar
 * Importación masiva de usuarios (CSV) — solo director
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRequest, createMockSupabaseAdmin, createSupabaseChain } from '../helpers/api-helpers';

// Mock supabase-js
const { mockAdmin, fromChains } = createMockSupabaseAdmin({
  user: { id: 'director-1', email: 'director@test.com' },
  perfil: { rol: 'director' },
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    toString: () => '',
  })),
}));

import { POST } from '@/app/api/usuarios/importar/route';

describe('POST /api/usuarios/importar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset user and perfil for each test
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'director-1', email: 'director@test.com' } },
      error: null,
    });

    // Perfil chain for director
    fromChains['perfiles'] = createSupabaseChain({ rol: 'director' });
    mockAdmin.from.mockImplementation((table: string) => {
      if (!fromChains[table]) {
        fromChains[table] = createSupabaseChain(null);
      }
      return fromChains[table];
    });
  });

  it('retorna 401 si no hay token de autorización', async () => {
    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      token: '',
      body: { usuarios: [] },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 401 si el token es inválido', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: { usuarios: [] },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si el usuario no es director', async () => {
    fromChains['perfiles'] = createSupabaseChain({ rol: 'voluntario' });
    mockAdmin.from.mockImplementation((table: string) => fromChains[table] || createSupabaseChain(null));

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: { usuarios: [] },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si no se envía array de usuarios', async () => {
    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: { usuarios: 'no-es-array' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Formato inválido');
  });

  it('importa usuarios nuevos correctamente', async () => {
    // listUsers returns empty → user doesn't exist
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    // No orphan profiles
    const perfilesOrphanChain = createSupabaseChain([]);
    // Zona lookup
    const zonasChain = createSupabaseChain({ id: 'zona-1' });
    // Profile update (simulates trigger created perfil)
    const perfilUpdateChain = createSupabaseChain({ id: 'new-user-id' });

    let callCount = 0;
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') {
        callCount++;
        // First call → role check (director), second → orphan check, third → update
        if (callCount === 1) return createSupabaseChain({ rol: 'director' });
        if (callCount === 2) return perfilesOrphanChain;
        return perfilUpdateChain;
      }
      if (table === 'zonas') return zonasChain;
      return createSupabaseChain(null);
    });

    mockAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: {
        usuarios: [
          { email: 'nuevo@test.com', nombre: 'Test', rol: 'voluntario', equipo: 'Las Dalias' },
        ],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.exitosos).toBe(1);
    expect(json.errores).toBe(0);
  });

  it('reporta error si email o nombre faltan en un usuario', async () => {
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: {
        usuarios: [
          { email: '', nombre: '', rol: 'voluntario' },
        ],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.errores).toBe(1);
    expect(json.detalle.errores[0].error).toContain('obligatorios');
  });

  it('reporta error si el rol es inválido', async () => {
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: {
        usuarios: [
          { email: 'test@x.com', nombre: 'Test', rol: 'rol_inventado' },
        ],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.errores).toBe(1);
    expect(json.detalle.errores[0].error).toContain('Rol inválido');
  });

  it('mapea roles legacy correctamente (coordinador → equipo_profesional)', async () => {
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'new-id' } },
      error: null,
    });

    let callCount = 0;
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === 'perfiles') {
        callCount++;
        if (callCount === 1) return createSupabaseChain({ rol: 'director' });
        if (callCount === 2) return createSupabaseChain([]);
        return createSupabaseChain({ id: 'new-id' });
      }
      return createSupabaseChain(null);
    });

    const req = createAuthRequest('/api/usuarios/importar', {
      method: 'POST',
      body: {
        usuarios: [
          { email: 'coord@test.com', nombre: 'Coord', rol: 'coordinador' },
        ],
      },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.exitosos).toBe(1);
  });
});
