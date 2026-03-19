import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 400 días: mismo maxAge que en el cliente browser para consistencia
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Asegurar que las cookies de sesión sean persistentes (no solo de sesión del navegador)
          // IMPORTANTE: ...options va PRIMERO para que maxAge: SESSION_MAX_AGE siempre gane
          // (Supabase envía maxAge: 3600 en options; si lo dejamos último, pisa el nuestro)
          const persistentOptions = { ...options, maxAge: SESSION_MAX_AGE };
          request.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas de autenticación (redirigir a dashboard si ya está logueado)
  const authPaths = ['/login', '/registro', '/recuperar-contrasena', '/restablecer-contrasena', '/auth/callback'];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Rutas públicas legales (accesibles para TODOS, autenticados o no)
  const legalPaths = ['/privacidad', '/terminos'];
  const isLegalPath = legalPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Rutas públicas = auth + legales
  const isPublicPath = isAuthPath || isLegalPath;

  // 🔥 EXCLUIR RUTAS DE API - manejan su propia autenticación
  // Excepción: /api/auth/signout necesita pasar por el middleware para limpiar cookies
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/auth/signout');
  if (isApiRoute) {
    return response; // Dejar pasar sin verificar cookies
  }

  // Rutas legales: siempre accesibles, no redirigir nunca
  if (isLegalPath) {
    return response;
  }

  // Si no está autenticado y trata de acceder a ruta protegida
  if (!user && !isPublicPath && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está autenticado y trata de acceder a login/registro
  if (user && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
