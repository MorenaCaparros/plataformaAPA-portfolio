import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

export async function POST(request: Request) {
  try {
    // Obtener token del header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token con supabase admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea director o admin
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfil?.rol !== 'director' && perfil?.rol !== 'admin') {
      return NextResponse.json({ 
        error: 'No autorizado - requiere rol director o admin' 
      }, { status: 403 });
    }

    const { email, nuevaPassword } = await request.json();

    if (!email || !nuevaPassword) {
      return NextResponse.json({ 
        error: 'Email y nueva contraseña son obligatorios' 
      }, { status: 400 });
    }

    if (nuevaPassword.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 });
    }

    // Buscar el usuario por email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const usuario = users.users.find(u => u.email === email);

    if (!usuario) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }

    // Actualizar la contraseña
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuario.id,
      { password: nuevaPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Actualizar el flag de password_temporal en el perfil
    await supabaseAdmin
      .from('perfiles')
      .update({
        password_temporal: false
      })
      .eq('id', usuario.id);

    return NextResponse.json({ 
      success: true,
      mensaje: `Contraseña actualizada correctamente para ${email}` 
    });

  } catch (error: any) {
    console.error('Error al resetear contraseña:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al resetear contraseña' 
    }, { status: 500 });
  }
}

// PUT endpoint removed — mass password reset with hardcoded data is a security risk.
