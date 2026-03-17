import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// createBrowserClient de @supabase/ssr gestiona las cookies con maxAge explícito.
// La persistencia de sesión está asegurada por:
// 1. cookieOptions con maxAge 400 días → las cookies NO expiran al cerrar el navegador
// 2. window.location.href (redirect completo) luego de signInWithPassword en el login
// 3. El middleware que refresca el access token con el refresh token en cada request
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      return parseCookies()[name];
    },
    set(name: string, value: string, options: CookieOptions) {
      const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
      document.cookie = `${name}=${encodeURIComponent(value)}; path=${options.path ?? '/'}; max-age=${SESSION_MAX_AGE}; samesite=lax${secure}`;
    },
    remove(name: string, options: CookieOptions) {
      // Incluir samesite y secure igual que en set() para que el browser haga match
      const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
      document.cookie = `${name}=; path=${options.path ?? '/'}; max-age=0; samesite=lax${secure}`;
    },
  },
});
