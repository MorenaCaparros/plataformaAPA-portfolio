import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Forzar runtime dinámico porque usa request.headers
export const dynamic = 'force-dynamic';

// Cliente admin con service role key
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

// Helper: verificar auth y obtener perfil
async function verificarAuth(request: NextRequest, rolesPermitidos: string[]) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No autorizado', status: 401 };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Token inválido', status: 401 };
  }
  const { data: perfil } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();
  if (!rolesPermitidos.includes(perfil?.rol || '')) {
    return { error: 'No autorizado para esta acción', status: 403 };
  }
  return { user, perfil };
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación — GET permite roles ampliados
    const auth = await verificarAuth(request, ['director', 'admin', 'psicopedagogia', 'equipo_profesional']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Si hay parámetro 'id', devolver solo ese usuario
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('id');

    if (usuarioId) {
      // Obtener un usuario específico
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(usuarioId);
      
      return NextResponse.json({ 
        usuario: {
          id: usuarioId,
          email: authData?.user?.email || 'Sin email'
        }
      });
    }

    // Obtener todos los perfiles con datos completos
    const { data: perfiles, error: perfilesError } = await supabaseAdmin
      .from('perfiles')
      .select(`
        id, nombre, apellido, rol, zona_id,
        fecha_nacimiento, telefono, email, direccion,
        foto_perfil_url, fecha_ingreso, max_ninos_asignados,
        activo, password_temporal, ultima_conexion, notas,
        created_at, updated_at,
        zonas ( id, nombre )
      `)
      .order('created_at', { ascending: false });

    if (perfilesError) throw perfilesError;

    // Para cada perfil, obtener el email de auth.users (email en perfiles puede estar vacío)
    const usuariosConEmail = await Promise.all(
      (perfiles || []).map(async (perfil: any) => {
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
        
        return {
          ...perfil,
          email: perfil.email || authData?.user?.email || 'Sin email',
          zona_nombre: perfil.zonas?.nombre || 'Sin equipo',
          // Keep backward compat
          metadata: { nombre_completo: [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') }
        };
      })
    );

    return NextResponse.json({ usuarios: usuariosConEmail });

  } catch (error: any) {
    console.error('Error en /api/usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol — POST solo director/admin
    const auth = await verificarAuth(request, ['director', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { email, nombre, apellido, rol, zona_id, telefono, password } = body;

    // Validaciones
    if (!email || !nombre || !rol) {
      return NextResponse.json(
        { error: 'Email, nombre y rol son obligatorios' },
        { status: 400 }
      );
    }

    const rolesValidos = ['voluntario', 'equipo_profesional', 'director'];
    if (!rolesValidos.includes(rol)) {
      return NextResponse.json(
        { error: `Rol inválido: "${rol}". Debe ser: ${rolesValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Generar password si no se proporciona
    const passwordFinal = password && password.length >= 6
      ? password
      : `Temp${Math.random().toString(36).slice(2, 10)}!`;
    const passwordEsTemporal = !password || password.length < 6;

    // Verificar si ya existe en auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioExistente = existingUsers?.users?.find(
      (u: any) => u.email === email.toLowerCase().trim()
    );

    if (usuarioExistente) {
      // Verificar si también tiene perfil
      const { data: perfilExistente } = await supabaseAdmin
        .from('perfiles')
        .select('id')
        .eq('id', usuarioExistente.id)
        .single();

      if (perfilExistente) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con ese email' },
          { status: 409 }
        );
      }

      // Existe en auth pero no tiene perfil → crear perfil
      const { error: perfilError } = await supabaseAdmin
        .from('perfiles')
        .insert({
          id: usuarioExistente.id,
          email: email.toLowerCase().trim(),
          nombre,
          apellido: apellido || '',
          rol,
          zona_id: zona_id || null,
          telefono: telefono || '',
          password_temporal: passwordEsTemporal,
          activo: true,
        });

      if (perfilError) throw perfilError;

      return NextResponse.json({
        mensaje: 'Usuario creado correctamente (perfil vinculado a auth existente)',
        usuario: { id: usuarioExistente.id, email },
        password_temporal: passwordEsTemporal ? passwordFinal : undefined,
      });
    }

    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      email_confirm: true,
      password: passwordFinal,
    });

    if (authError) throw authError;

    const userId = authData.user!.id;

    // 2. Intentar UPDATE primero (por si el trigger creó el perfil)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('perfiles')
      .update({
        email: email.toLowerCase().trim(),
        nombre,
        apellido: apellido || '',
        rol,
        zona_id: zona_id || null,
        telefono: telefono || '',
        password_temporal: passwordEsTemporal,
        activo: true,
      })
      .eq('id', userId)
      .select('id')
      .single();

    // 3. Si UPDATE no encontró fila → INSERT (trigger no existe o falló)
    if (updateError || !updated) {
      const { error: insertError } = await supabaseAdmin
        .from('perfiles')
        .insert({
          id: userId,
          email: email.toLowerCase().trim(),
          nombre,
          apellido: apellido || '',
          rol,
          zona_id: zona_id || null,
          telefono: telefono || '',
          password_temporal: passwordEsTemporal,
          activo: true,
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      mensaje: 'Usuario creado correctamente',
      usuario: { id: userId, email },
      password_temporal: passwordEsTemporal ? passwordFinal : undefined,
    });
  } catch (error: any) {
    console.error('Error en POST /api/usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear usuario' },
      { status: 500 }
    );
  }
}
