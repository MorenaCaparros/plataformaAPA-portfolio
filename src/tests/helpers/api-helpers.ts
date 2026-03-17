/**
 * Helpers de testing para API routes.
 * Provee funciones utilitarias para crear requests y mocks de Supabase.
 */
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

/**
 * Crea un NextRequest con headers de autorización Bearer.
 */
export function createAuthRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    token?: string;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, token = 'test-token-123', searchParams } = options;

  const urlObj = new URL(url, 'http://localhost:3000');
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      urlObj.searchParams.set(key, val);
    }
  }

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = { method, headers };
  if (body) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  // Cast necesario: Next.js RequestInit no acepta signal: null del tipo estándar
  return new NextRequest(urlObj, init as never);
}

/**
 * Crea un chain mockeable de Supabase (from().select().eq()... etc.)
 */
export function createSupabaseChain(resolvedData: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'order', 'limit', 'range', 'is', 'not', 'or', 'ilike',
  ];

  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminadores que retornan resultados
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: resolvedData, error, count: Array.isArray(resolvedData) ? resolvedData.length : 0 })
  );

  return chain;
}

/**
 * Crea un mock de supabaseAdmin con auth y from().
 */
export function createMockSupabaseAdmin(overrides: {
  user?: Record<string, unknown> | null;
  perfil?: Record<string, unknown> | null;
  defaultData?: unknown;
} = {}) {
  const { user = null, perfil = null, defaultData = null } = overrides;

  const fromChains: Record<string, ReturnType<typeof createSupabaseChain>> = {};

  const mockAdmin = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Invalid token' },
      }),
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: user ? { ...user, email: user.email || 'test@test.com' } : null },
        }),
        listUsers: vi.fn().mockResolvedValue({
          data: { users: user ? [{ id: user.id, email: user.email || 'test@test.com' }] : [] },
          error: null,
        }),
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({
          data: { user: { id: user?.id || 'user-id' } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((tableName: string) => {
      if (!fromChains[tableName]) {
        // Si es la tabla de perfiles, resolver con el perfil mock
        if (tableName === 'perfiles' && perfil) {
          fromChains[tableName] = createSupabaseChain(perfil);
        } else {
          fromChains[tableName] = createSupabaseChain(defaultData);
        }
      }
      return fromChains[tableName];
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/file' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };

  return { mockAdmin, fromChains };
}
