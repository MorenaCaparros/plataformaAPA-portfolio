/**
 * demo-client.ts
 * --------------
 * Cliente Supabase simulado para modo DEMO_MODE=true.
 *
 * Activar con: NEXT_PUBLIC_DEMO_MODE=true en .env.local
 *
 * Limitaciones del modo demo:
 *  - Datos de solo lectura (writes se simulan sin persistir)
 *  - Auth simulada (cualquier email @demo.apa es válido)
 *  - Funciones de IA retornan respuestas predefinidas
 */

import {
  DEMO_NINOS, DEMO_SESIONES, DEMO_PERFILES, DEMO_ZONAS,
  DEMO_CAPACITACIONES, DEMO_CURRENT_USER, filterBy,
} from './demo-data';

export const isDemoMode = (): boolean =>
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type SupabaseResponse<T> = { data: T | null; error: null | { message: string } };

function ok<T>(data: T): SupabaseResponse<T> {
  return { data, error: null };
}

class MockQueryBuilder<T> {
  private _data: T[];
  private _filters: Record<string, unknown> = {};
  private _isSingle = false;
  private _limit: number | null = null;

  constructor(data: T[]) { this._data = data; }

  select(_columns?: string) { return this; }
  eq(col: string, val: unknown) { this._filters[col] = val; return this; }
  neq(col: string, val: unknown) { this._data = this._data.filter((i) => (i as Record<string,unknown>)[col] !== val); return this; }
  order(_col: string, _opts?: unknown) { return this; }
  limit(n: number) { this._limit = n; return this; }

  single() {
    this._isSingle = true;
    return Promise.resolve(this._resolve() as SupabaseResponse<T>);
  }

  insert(_values: unknown) { return Promise.resolve(ok(null)); }
  update(_values: unknown) { return Promise.resolve(ok(null)); }
  delete()                 { return Promise.resolve(ok(null)); }

  then(resolve: (v: SupabaseResponse<T[]>) => void) {
    return Promise.resolve(this._resolve() as SupabaseResponse<T[]>).then(resolve);
  }

  private _resolve(): SupabaseResponse<T | T[]> {
    let result = filterBy(this._data, this._filters as Partial<T>);
    if (this._limit !== null) result = result.slice(0, this._limit);
    if (this._isSingle) return ok(result[0] ?? null) as SupabaseResponse<T>;
    return ok(result);
  }
}

const TABLES: Record<string, unknown[]> = {
  ninos: DEMO_NINOS,
  sesiones: DEMO_SESIONES,
  perfiles: DEMO_PERFILES,
  zonas: DEMO_ZONAS,
  capacitaciones: DEMO_CAPACITACIONES,
};

export const demoClient = {
  from: (table: string) => new MockQueryBuilder(TABLES[table] ?? []),

  auth: {
    getUser: () => Promise.resolve({
      data: { user: { id: DEMO_CURRENT_USER.id, email: DEMO_CURRENT_USER.email } },
      error: null,
    }),
    getSession: () => Promise.resolve({
      data: { session: { user: { id: DEMO_CURRENT_USER.id, email: DEMO_CURRENT_USER.email }, access_token: 'demo-token' } },
      error: null,
    }),
    signInWithPassword: ({ email }: { email: string; password: string }) => {
      const user = DEMO_PERFILES.find((p) => p.email === email);
      if (!user) return Promise.resolve({ data: null, error: { message: 'Usuario no encontrado. Usar email @demo.apa' } });
      return Promise.resolve({ data: { user: { id: user.id, email: user.email }, session: { access_token: 'demo-token' } }, error: null });
    },
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },

  storage: {
    from: (_bucket: string) => ({
      upload: () => Promise.resolve(ok(null)),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: '/demo-placeholder.pdf' } }),
      list: () => Promise.resolve(ok([])),
    }),
  },

  rpc: (_fn: string, _params?: unknown) => Promise.resolve(ok(null)),
};

/**
 * Devuelve el cliente adecuado según DEMO_MODE:
 *  - true  → demoClient (sin Supabase real)
 *  - false → cliente real de Supabase
 */
export async function getSupabaseClient() {
  if (isDemoMode()) return demoClient;
  const { supabase } = await import('./client');
  return supabase;
}

/** Respuestas de IA predefinidas para modo demo (sin API Key) */
export const DEMO_AI_RESPONSES: Record<string, string> = {
  resumen_semanal: `
**Resumen del período - Nico** *(demostración)*

Durante las últimas 3 sesiones se observó **progreso significativo** en fluidez lectora.
El estudiante pasó de trabarse en sílabas trabadas a leer oraciones cortas de forma autónoma.
Motivación alta (5/5) y frustración ante errores en descenso.

**Recomendación:** Avanzar hacia textos con párrafos de mayor complejidad.
Incorporar lecturas sobre temas de interés para sostener la motivación.

*Respuesta generada en modo demo. En producción se usa Google Gemini 1.5 Flash.*
  `.trim(),
};
