import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

// GET - Listar capacitaciones
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const tipo = searchParams.get('tipo');
    const capacitacionId = searchParams.get('id');

    // Si se pide una capacitación específica
    if (capacitacionId) {
      const { data, error } = await supabaseAdmin
        .from('capacitaciones')
        .select('*')
        .eq('id', capacitacionId)
        .single();

      if (error) throw error;
      return NextResponse.json({ capacitacion: data });
    }

    // Listar capacitaciones con filtros opcionales
    let query = supabaseAdmin
      .from('capacitaciones')
      .select('*')
      .eq('activa', true)
      .order('created_at', { ascending: false });

    if (area) {
      query = query.eq('area', area);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ capacitaciones: data });

  } catch (error: any) {
    console.error('Error en GET /api/capacitaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener capacitaciones' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva capacitación (solo admin/TS/coordinador/psico)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar rol
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rolesPermitidos = ['director', 'trabajador_social', 'coordinador', 'psicopedagogia', 'equipo_profesional'];
    if (!perfil || !rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear capacitaciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      titulo,
      descripcion,
      area,
      tipo,
      puntaje_otorgado,
      duracion_estimada
    } = body;

    // Validaciones
    if (!titulo || !area || !tipo) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: titulo, area, tipo' },
        { status: 400 }
      );
    }

    const areasValidas = ['lenguaje', 'grafismo', 'lectura_escritura', 'matematicas', 'general', 'lenguaje_vocabulario', 'grafismo_motricidad', 'nociones_matematicas'];
    if (!areasValidas.includes(area)) {
      return NextResponse.json(
        { error: `Área inválida. Debe ser: ${areasValidas.join(', ')}` },
        { status: 400 }
      );
    }

    const tiposValidos = ['capacitacion', 'autoevaluacion'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo inválido. Debe ser: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Crear capacitación (new schema fields)
    const { data, error } = await supabaseAdmin
      .from('capacitaciones')
      .insert({
        nombre: titulo,
        descripcion,
        area,
        tipo,
        es_obligatoria: true,
        puntaje_minimo_aprobacion: puntaje_otorgado ? puntaje_otorgado * 20 : 70,
        duracion_estimada_minutos: duracion_estimada || null,
        creado_por: user.id,
        activa: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      mensaje: 'Capacitación creada exitosamente',
      capacitacion: data
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error en POST /api/capacitaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear capacitación' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar capacitación
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de capacitación requerido' }, { status: 400 });
    }

    // Verificar que el usuario es el creador
    const { data: capacitacion } = await supabaseAdmin
      .from('capacitaciones')
      .select('creado_por')
      .eq('id', id)
      .single();

    if (!capacitacion || capacitacion.creado_por !== user.id) {
      return NextResponse.json(
        { error: 'Solo el creador puede editar esta capacitación' },
        { status: 403 }
      );
    }

    // Actualizar
    const { data, error } = await supabaseAdmin
      .from('capacitaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      mensaje: 'Capacitación actualizada exitosamente',
      capacitacion: data
    });

  } catch (error: any) {
    console.error('Error en PUT /api/capacitaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar capacitación' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar capacitación
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de capacitación requerido' }, { status: 400 });
    }

    // Desactivar en lugar de eliminar
    const { error } = await supabaseAdmin
      .from('capacitaciones')
      .update({ activa: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ mensaje: 'Capacitación desactivada exitosamente' });

  } catch (error: any) {
    console.error('Error en DELETE /api/capacitaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al desactivar capacitación' },
      { status: 500 }
    );
  }
}
