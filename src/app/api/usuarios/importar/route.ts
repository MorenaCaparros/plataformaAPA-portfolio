import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface UsuarioCSV {
  email: string;
  nombre: string;
  apellido?: string;
  rol: 'voluntario' | 'equipo_profesional' | 'director';
  equipo?: string; // Las Dalias, La Herradura, etc.
  telefono?: string;
  password?: string; // Contraseña opcional
}

// Mapeo de roles legacy a roles actuales
const ROLES_MAPPING: Record<string, string> = {
  'voluntario': 'voluntario',
  'director': 'director',
  'equipo_profesional': 'equipo_profesional',
  // Backward compat: mapear roles viejos a los nuevos
  'coordinador': 'equipo_profesional',
  'psicopedagogia': 'equipo_profesional',
  'admin': 'director',
  'trabajador_social': 'equipo_profesional',
  'trabajadora_social': 'equipo_profesional',
};

export async function POST(request: NextRequest) {
  try {
    // Obtener token del header
    const authorization = request.headers.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No autenticado - falta token de autorización'
      }, { status: 401 });
    }
    
    const token = authorization.substring(7);

    // Crear cliente admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar el token y obtener el user_id
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error verificando token:', userError);
      return NextResponse.json({ 
        error: 'Token inválido',
        details: userError?.message 
      }, { status: 401 });
    }

    // Verificar que el usuario es admin
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      console.error('Error obteniendo perfil:', perfilError);
      return NextResponse.json({ 
        error: 'No se pudo verificar el rol del usuario'
      }, { status: 403 });
    }

    if (perfil.rol !== 'director') {
      return NextResponse.json({ 
        error: 'No autorizado - requiere rol director' 
      }, { status: 403 });
    }

    // Leer CSV del body
    const { usuarios }: { usuarios: UsuarioCSV[] } = await request.json();

    if (!usuarios || !Array.isArray(usuarios)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const resultados = {
      exitosos: [] as string[],
      errores: [] as { email: string; error: string }[],
    };

    // Crear usuarios uno por uno
    for (const usuario of usuarios) {
      try {
        // Validar que tenga email y nombre
        if (!usuario.email || !usuario.nombre) {
          throw new Error('Email y nombre son obligatorios');
        }

        // Normalizar rol a minúscula (acepta Voluntario, VOLUNTARIO, etc.)
        const rolInput = (usuario.rol || '').toLowerCase().trim();
        const rolNormalizado = ROLES_MAPPING[rolInput];
        if (!rolNormalizado) {
          throw new Error(`Rol inválido: "${usuario.rol}". Debe ser: voluntario, equipo_profesional, o director`);
        }

        // Verificar si el usuario ya existe en auth.users
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const usuarioExistente = existingUsers?.users?.find(u => u.email === usuario.email);
        
        if (usuarioExistente) {
          // Si existe en auth, verificar si también tiene perfil
          const { data: perfilExistente } = await supabaseAdmin
            .from('perfiles')
            .select('id')
            .eq('id', usuarioExistente.id)
            .single();
          
          if (perfilExistente) {
            throw new Error('El usuario ya existe completamente. Use un email diferente.');
          } else {
            // Existe en auth pero no tiene perfil, podemos crear el perfil
            // Usar el ID existente
            let zona_id = null;
            if (usuario.equipo) {
              const { data: zona } = await supabaseAdmin
                .from('zonas')
                .select('id')
                .eq('nombre', usuario.equipo)
                .single();
              zona_id = zona?.id;
            }
            
            const { error: perfilError } = await supabaseAdmin
              .from('perfiles')
              .insert({
                id: usuarioExistente.id,
                rol: rolNormalizado,
                zona_id,
                nombre: usuario.nombre,
                apellido: usuario.apellido || '',
                telefono: usuario.telefono || '',
                password_temporal: false,
                activo: true,
              });
            
            if (perfilError) throw perfilError;
            resultados.exitosos.push(usuario.email);
            continue;
          }
        }

        // Verificar perfiles huérfanos (perfil sin usuario en auth)
        const { data: perfilesHuerfanos } = await supabaseAdmin
          .from('perfiles')
          .select('id, email')
          .eq('email', usuario.email);
        
        if (perfilesHuerfanos && perfilesHuerfanos.length > 0) {
          // Eliminar perfiles huérfanos automáticamente
          await supabaseAdmin
            .from('perfiles')
            .delete()
            .in('id', perfilesHuerfanos.map((p: { id: string }) => p.id));
        }

        // Generar o usar password del CSV
        const password = usuario.password && usuario.password.length >= 8
          ? usuario.password
          : `Temp${Math.random().toString(36).slice(2, 10)}!`; // Password temporal si no hay

        const passwordEsTemporal = !usuario.password || usuario.password.length < 8;

        // 1. Crear usuario en auth (usando admin client)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: usuario.email,
          email_confirm: true,
          password,
        });

        if (authError) throw authError;

        // 2. Obtener zona_id si tiene equipo
        let zona_id = null;
        if (usuario.equipo) {
          const { data: zona } = await supabaseAdmin
            .from('zonas')
            .select('id')
            .eq('nombre', usuario.equipo)
            .single();
          zona_id = zona?.id;
        }

        // 3. UPDATE perfil si el trigger ya lo creó, sino INSERT
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('perfiles')
          .update({
            rol: rolNormalizado,
            zona_id,
            nombre: usuario.nombre,
            apellido: usuario.apellido || '',
            telefono: usuario.telefono || '',
            password_temporal: passwordEsTemporal,
            activo: true,
          })
          .eq('id', authData.user!.id)
          .select('id')
          .single();

        // Si UPDATE no encontró fila (trigger no creó perfil) → INSERT
        if (updateError || !updated) {
          const { error: insertError } = await supabaseAdmin
            .from('perfiles')
            .insert({
              id: authData.user!.id,
              rol: rolNormalizado,
              zona_id,
              nombre: usuario.nombre,
              apellido: usuario.apellido || '',
              telefono: usuario.telefono || '',
              password_temporal: passwordEsTemporal,
              activo: true,
            });

          if (insertError) throw insertError;
        }

        resultados.exitosos.push(usuario.email);
      } catch (error: any) {
        resultados.errores.push({
          email: usuario.email,
          error: error.message || 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      mensaje: `Procesados ${usuarios.length} usuarios`,
      exitosos: resultados.exitosos.length,
      errores: resultados.errores.length,
      detalle: resultados,
    });
  } catch (error: any) {
    console.error('Error importando usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar usuarios' },
      { status: 500 }
    );
  }
}
