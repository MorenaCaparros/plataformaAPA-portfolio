// ──────────────────────────────────────────────────────────────
// Cliente Supabase Admin (service_role) — inicialización lazy
// ──────────────────────────────────────────────────────────────
//
// PROBLEMA: createClient() a nivel de módulo falla durante el
// build de Next.js porque las env vars no están disponibles en
// ese momento ("Collecting page data" phase).
//
// SOLUCIÓN: Proxy que difiere la creación del cliente hasta el
// primer uso real (dentro de un request handler), cuando las
// env vars ya están inyectadas por Netlify/Vercel.
// ──────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

// Proxy: el objeto se crea en tiempo de módulo (sin acceder a env vars),
// pero el cliente real solo se inicializa cuando se accede a una propiedad.
const handler: ProxyHandler<object> = {
  get(_target, prop, receiver) {
    const client = createAdminClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
};

// supabaseAdmin y supabase son alias del mismo cliente admin.
// Los route handlers usan uno u otro según su convención local.
export const supabaseAdmin = new Proxy({}, handler) as unknown as SupabaseClient;
export const supabase = supabaseAdmin;
