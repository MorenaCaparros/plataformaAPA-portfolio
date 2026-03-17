/**
 * Tests para src/middleware.ts
 * Verifica la lógica de redirección por autenticación.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de @supabase/ssr
const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

function createRequest(pathname: string): NextRequest {
  const url = new URL(`http://localhost:3000${pathname}`);
  return new NextRequest(url, {
    headers: new Headers(),
  });
}

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetUser.mockReset();
  });

  it('deja pasar rutas de API (excepto signout) sin verificar auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/api/metricas?userId=1&rol=admin');
    const response = await middleware(request);

    // No debería redirigir
    expect(response.status).not.toBe(302);
    expect(response.status).not.toBe(307);
  });

  it('redirige a /login si no está autenticado y accede a /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/dashboard');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('permite acceso a /login sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/login');
    const response = await middleware(request);

    // No debería redirigir
    expect(response.status).not.toBe(307);
  });

  it('redirige de /login a /dashboard si ya está autenticado', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@test.com' } },
      error: null,
    });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/login');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('permite acceso a /dashboard si está autenticado', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@test.com' } },
      error: null,
    });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/dashboard');
    const response = await middleware(request);

    // No debería redirigir
    expect(response.status).not.toBe(307);
  });

  it('permite acceso a /registro sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/registro');
    const response = await middleware(request);

    expect(response.status).not.toBe(307);
  });

  it('permite acceso a /recuperar-contrasena sin autenticación', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/recuperar-contrasena');
    const response = await middleware(request);

    expect(response.status).not.toBe(307);
  });

  it('permite la ruta raíz (/) sin autenticación (sin redirigir)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { middleware } = await import('@/middleware');

    const request = createRequest('/');
    const response = await middleware(request);

    // La raíz no redirige a login (pathname === '/')
    expect(response.status).not.toBe(307);
  });

  it('exporta config con matcher correcto', async () => {
    const { config } = await import('@/middleware');
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
