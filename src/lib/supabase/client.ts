import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

// 400 días en segundos — igual que el middleware
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

/** Lee todas las cookies del documento (seguro en SSR: devuelve {} si no hay document) */
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  return document.cookie.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) acc[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    return acc;
  }, {} as Record<string, string>);
}

function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // createBrowserClient de @supabase/ssr gestiona las cookies con maxAge explícito.
  // La persistencia de sesión está asegurada por:
  // 1. cookieOptions con maxAge 400 días → las cookies NO expiran al cerrar el navegador
  // 2. window.location.href (redirect completo) luego de signInWithPassword en el login
  // 3. El middleware que refresca el access token con el refresh token en cada request
  return createBrowserClient(url, key, {
    cookies: {
      get(name: string) {
        return parseCookies()[name];
      },
      set(name: string, value: string, options: CookieOptions) {
        const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
        document.cookie = `${name}=${encodeURIComponent(value)}; path=${options.path ?? '/'}; max-age=${SESSION_MAX_AGE}; samesite=lax${secure}`;
      },
      remove(name: string, options: CookieOptions) {
        const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
        document.cookie = `${name}=; path=${options.path ?? '/'}; max-age=0; samesite=lax${secure}`;
      },
    },
  });
}

// Proxy con lazy init: el cliente real se crea en el primer acceso (navegador),
// no al importar el módulo (evita errores durante el build de Next.js).
let _client: ReturnType<typeof createClient> | null = null;
const handler: ProxyHandler<object> = {
  get(_target, prop, receiver) {
    if (!_client) _client = createClient();
    const value = Reflect.get(_client, prop, receiver);
    return typeof value === 'function' ? value.bind(_client) : value;
  },
};

export const supabase = new Proxy({}, handler) as ReturnType<typeof createClient>;
