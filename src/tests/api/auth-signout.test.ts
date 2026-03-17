/**
 * Tests para /api/auth/signout (POST)
 * Auth: cookie-based via @/lib/supabase/server
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock del cliente Supabase (cookie-based) ───────────────────────────────
const mockSignOut = vi.fn().mockResolvedValue({});
const mockSupabase = {
  auth: { signOut: mockSignOut },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const { POST } = await import('@/app/api/auth/signout/route');

beforeEach(() => vi.clearAllMocks());

describe('POST /api/auth/signout', () => {
  it('llama a supabase.auth.signOut', async () => {
    const req = new Request('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    }) as any;
    // NextRequest necesita nextUrl — forzamos con propiedad
    req.nextUrl = new URL('http://localhost:3000/api/auth/signout');

    const res = await POST(req);
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('retorna redirect 302 a /login', async () => {
    const req = new Request('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    }) as any;
    req.nextUrl = new URL('http://localhost:3000/api/auth/signout');

    const res = await POST(req);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login');
  });
});
