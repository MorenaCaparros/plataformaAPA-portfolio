import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 400 días — consistente con middleware y client.ts
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Parsea el full_name de Google en nombre + apellido.
 * Ejemplo: "Juan Carlos Pérez"  →  { nombre: "Juan", apellido: "Carlos Pérez" }
 */
function parsearNombreGoogle(fullName: string | undefined): { nombre: string; apellido: string } {
  if (!fullName?.trim()) return { nombre: '', apellido: '' };
  const partes = fullName.trim().split(/\s+/);
  return {
    nombre: partes[0],
    apellido: partes.slice(1).join(' '),
  };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Si Google devolvió un error, redirigir a login con mensaje
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', errorDescription || 'Error al autenticar con Google');
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    // Crear la response de redirect PRIMERO para adjuntar cookies directamente
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Forzar maxAge persistente — igual que el middleware
            redirectResponse.cookies.set({ name, value, ...options, maxAge: SESSION_MAX_AGE });
          },
          remove(name: string, options: CookieOptions) {
            redirectResponse.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error intercambiando código OAuth:', exchangeError.message);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'Error al verificar la sesión con Google');
      return NextResponse.redirect(loginUrl);
    }

    // ── Sincronizar perfil con datos de Google ──────────────────────────────
    const authUser = sessionData?.user;
    if (authUser) {
      const meta = authUser.user_metadata ?? {};
      const email = authUser.email ?? '';

      // Google provee: full_name (o name), avatar_url
      const fullName: string = meta.full_name ?? meta.name ?? '';
      const { nombre, apellido } = parsearNombreGoogle(fullName);
      const fotoUrl: string = meta.avatar_url ?? meta.picture ?? '';

      // Verificar si ya tiene perfil
      const { data: perfilExistente } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, apellido')
        .eq('id', authUser.id)
        .single();

      if (!perfilExistente) {
        // Usuario nuevo: crear perfil con datos de Google
        // rol = 'voluntario' por defecto; el admin luego puede cambiarlo
        await supabaseAdmin.from('perfiles').insert({
          id: authUser.id,
          email,
          nombre: nombre || email,
          apellido,
          foto_perfil_url: fotoUrl || null,
          rol: 'voluntario',
          activo: true,
          password_temporal: false,
        });
      } else {
        // Perfil existente: actualizar nombre/apellido SOLO si todavía tienen el email
        // como valor (lo que pone el trigger por defecto) o están vacíos
        const nombreParece = (s: string) => !s || s === email || s.includes('@');
        const necesitaActualizar =
          nombreParece(perfilExistente.nombre) ||
          (nombre && nombreParece(perfilExistente.apellido ?? ''));

        if (necesitaActualizar && nombre) {
          await supabaseAdmin
            .from('perfiles')
            .update({
              nombre,
              apellido,
              ...(fotoUrl ? { foto_perfil_url: fotoUrl } : {}),
            })
            .eq('id', authUser.id);
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return redirectResponse;
  }

  // Sin código ni error — redirigir a login
  return NextResponse.redirect(new URL('/login', request.url));
}
