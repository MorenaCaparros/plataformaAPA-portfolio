import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Crea un cliente de Supabase para APIs que acepta autenticación desde:
 * 1. Header Authorization: Bearer <token>
 * 2. Cookies de sesión
 * 
 * Esto permite que las APIs funcionen tanto desde el navegador (cookies)
 * como desde herramientas externas tipo Thunder Client/Postman (Bearer token)
 */
export async function createAuthenticatedClient(request: NextRequest) {
  // Intentar obtener token del header Authorization
  const authHeader = request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    console.log('🔑 Token Bearer recibido');
    
    // Decodificar el token para extraer el user_id
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = payload.sub;
      console.log('✅ User ID del token:', userId);
      
      // Usar SERVICE_ROLE_KEY para bypassear RLS y poder verificar el usuario
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );
      
      // Guardar el userId en el cliente para usarlo después
      (supabase as any)._authUserId = userId;
      (supabase as any)._authUserRol = payload.app_metadata?.rol || 'voluntario';
      
      return supabase;
    } catch (err) {
      console.error('❌ Error decodificando token:', err);
      throw new Error('Token inválido');
    }
  }
  
  // Si no hay token en header, usar cookies (sesión del navegador)
  return createServerClient();
}

/**
 * Verifica si el usuario está autenticado desde el token del header o cookies
 * Retorna el usuario o null si no está autenticado
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createAuthenticatedClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
