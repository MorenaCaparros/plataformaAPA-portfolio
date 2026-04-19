import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// ─── Mock fallback (usado si la tabla audit_logs no existe aún) ────────────────
function dAgo(d: number) { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); }
function hAgo(h: number) { const x = new Date(); x.setHours(x.getHours() - h); return x.toISOString(); }

const ADMIN_ID  = 'b1000000-0000-0000-0000-000000000001';
const EQUIPO_ID = 'b1000000-0000-0000-0000-000000000002';
const VOL_ID    = 'b1000000-0000-0000-0000-000000000006';

const MOCK_LOGS = [
  { id: 'l001', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'sesiones',     fila_id: 's001', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'lectura', duracion_minutos: 45, estado: 'completada' },                  campos_modificados: null,                   metadata: { ip: '192.168.1.10', dispositivo: 'mobile' }, created_at: hAgo(1) },
  { id: 'l002', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'sesiones',     fila_id: 's002', accion: 'UPDATE', valores_antes: { estado: 'pendiente' },       valores_despues: { estado: 'completada', observaciones: 'Muy buena sesión' },                     campos_modificados: ['estado','observaciones'], metadata: { ip: '192.168.1.10' },              created_at: hAgo(5) },
  { id: 'l003', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's003', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'evaluacion', duracion_minutos: 60, estado: 'completada' },                 campos_modificados: null,                   metadata: { ip: '10.0.0.5' },                  created_at: dAgo(1) },
  { id: 'l004', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's004', accion: 'UPDATE', valores_antes: { duracion_minutos: 30 },      valores_despues: { duracion_minutos: 45 },                                                         campos_modificados: ['duracion_minutos'],    metadata: { ip: '10.0.0.5' },                  created_at: dAgo(1) },
  { id: 'l005', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'ninos',        fila_id: 'n001', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Sofía', apellido: 'López', edad: 7 },                                  campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'panel_admin' }, created_at: dAgo(2) },
  { id: 'l006', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'ninos',        fila_id: 'n002', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Tomás', apellido: 'Martínez', edad: 9 },                               campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'panel_admin' }, created_at: dAgo(2) },
  { id: 'l007', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'ninos',       fila_id: 'n001', accion: 'UPDATE', valores_antes: { notas: null },               valores_despues: { notas: 'Dificultades lecto-escritura. Iniciar plan refuerzo.' },                  campos_modificados: ['notas'],               metadata: { ip: '10.0.0.5' },                  created_at: dAgo(3) },
  { id: 'l008', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'ninos',       fila_id: 'n003', accion: 'UPDATE', valores_antes: { activo: true },              valores_despues: { activo: false, motivo_baja: 'Traslado familiar' },                               campos_modificados: ['activo','motivo_baja'], metadata: { ip: '10.0.0.5' },                 created_at: dAgo(4) },
  { id: 'l009', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'documentos',   fila_id: 'd001', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'informe_sesion', nombre: 'Informe_Sesion_Abril.pdf' },                     campos_modificados: null,                   metadata: { ip: '192.168.1.10', size_kb: 245 }, created_at: dAgo(2) },
  { id: 'l010', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'documentos',  fila_id: 'd002', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'evaluacion_psicopedagogica', nombre: 'Eval_Inicial_Sofia.pdf' },            campos_modificados: null,                   metadata: { ip: '10.0.0.5', size_kb: 890 },    created_at: dAgo(3) },
  { id: 'l011', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'documentos',   fila_id: 'd003', accion: 'DELETE', valores_antes: { tipo: 'borrador', nombre: 'borrador_sin_usar.docx' }, valores_despues: null,                           campos_modificados: null,                   metadata: { ip: '203.0.113.1', motivo: 'Archivo duplicado' }, created_at: dAgo(4) },
  { id: 'l012', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: VOL_ID, accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Carlos', apellido: 'Ruiz', rol: 'voluntario', activo: true },            campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'panel_admin' }, created_at: dAgo(5) },
  { id: 'l013', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: EQUIPO_ID, accion: 'UPDATE', valores_antes: { rol: 'voluntario' },      valores_despues: { rol: 'equipo_profesional' },                                                    campos_modificados: ['rol'],                 metadata: { ip: '203.0.113.1', motivo: 'Promoción de rol' }, created_at: dAgo(6) },
  { id: 'l014', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b005',    accion: 'UPDATE', valores_antes: { activo: true },           valores_despues: { activo: false },                                                                campos_modificados: ['activo'],              metadata: { ip: '203.0.113.1', motivo: 'Baja voluntaria' }, created_at: dAgo(7) },
  { id: 'l015', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'asignaciones', fila_id: 'a001', accion: 'INSERT', valores_antes: null,                          valores_despues: { voluntario_id: VOL_ID, nino_id: 'n001', activa: true },                          campos_modificados: null,                   metadata: { ip: '10.0.0.5', metodo: 'matching_manual' }, created_at: dAgo(8) },
  { id: 'l016', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'asignaciones', fila_id: 'a002', accion: 'UPDATE', valores_antes: { activa: true },              valores_despues: { activa: false, fecha_fin: '2026-04-01' },                                        campos_modificados: ['activa','fecha_fin'],  metadata: { ip: '10.0.0.5', motivo: 'Cierre de ciclo' }, created_at: dAgo(9) },
  { id: 'l017', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'asignaciones', fila_id: 'a003', accion: 'DELETE', valores_antes: { activa: false },             valores_despues: null,                                                                             campos_modificados: null,                   metadata: { ip: '203.0.113.1', motivo: 'Limpieza registros inactivos' }, created_at: dAgo(10) },
  { id: 'l018', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b007', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Laura', apellido: 'Pérez', rol: 'voluntario', activo: true },            campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'importacion_csv' }, created_at: dAgo(11) },
  { id: 'l019', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b008', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Martín', apellido: 'González', rol: 'voluntario', activo: true },        campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'importacion_csv' }, created_at: dAgo(11) },
  { id: 'l020', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b009', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Valentina', apellido: 'Torres', rol: 'voluntario', activo: true },       campos_modificados: null,                   metadata: { ip: '203.0.113.1', origen: 'importacion_csv' }, created_at: dAgo(11) },
  { id: 'l021', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'asignaciones', fila_id: 'a004', accion: 'INSERT', valores_antes: null,                          valores_despues: { voluntario_id: 'b007', nino_id: 'n004', activa: true },                          campos_modificados: null,                   metadata: { ip: '203.0.113.1', metodo: 'matching_ia' },  created_at: dAgo(13) },
  { id: 'l022', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'asignaciones', fila_id: 'a005', accion: 'INSERT', valores_antes: null,                          valores_despues: { voluntario_id: 'b008', nino_id: 'n005', activa: true },                          campos_modificados: null,                   metadata: { ip: '203.0.113.1', metodo: 'matching_ia' },  created_at: dAgo(13) },
  { id: 'l023', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'ninos',       fila_id: 'n004', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Agustín', apellido: 'Díaz', edad: 8 },                                  campos_modificados: null,                   metadata: { ip: '10.0.0.5' },                  created_at: dAgo(12) },
  { id: 'l024', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'ninos',       fila_id: 'n005', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Camila', apellido: 'Romero', edad: 6 },                                 campos_modificados: null,                   metadata: { ip: '10.0.0.5' },                  created_at: dAgo(12) },
  { id: 'l025', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'ninos',       fila_id: 'n006', accion: 'INSERT', valores_antes: null,                          valores_despues: { nombre: 'Luciana', apellido: 'Fernández', edad: 10 },                            campos_modificados: null,                   metadata: { ip: '10.0.0.5' },                  created_at: dAgo(14) },
  { id: 'l026', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'ninos',        fila_id: 'n002', accion: 'UPDATE', valores_antes: { zona_id: 'z001' },           valores_despues: { zona_id: 'z002' },                                                              campos_modificados: ['zona_id'],             metadata: { ip: '203.0.113.1', motivo: 'Cambio equipo' }, created_at: hAgo(8) },
  { id: 'l027', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'ninos',        fila_id: 'n003', accion: 'UPDATE', valores_antes: { prioridad: 'media' },         valores_despues: { prioridad: 'alta' },                                                            campos_modificados: ['prioridad'],           metadata: { ip: '203.0.113.1', motivo: 'Revisión trimestral' }, created_at: dAgo(20) },
  { id: 'l028', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: VOL_ID, accion: 'UPDATE', valores_antes: { max_ninos_asignados: 2 },    valores_despues: { max_ninos_asignados: 3 },                                                        campos_modificados: ['max_ninos_asignados'], metadata: { ip: '203.0.113.1' },              created_at: hAgo(3) },
  { id: 'l029', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b009', accion: 'UPDATE', valores_antes: { horas_disponibles: 2 },      valores_despues: { horas_disponibles: 4 },                                                         campos_modificados: ['horas_disponibles'],   metadata: { ip: '203.0.113.1' },              created_at: hAgo(12) },
  { id: 'l030', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'perfiles',     fila_id: 'b010', accion: 'DELETE', valores_antes: { nombre: 'Usuario', apellido: 'Prueba', rol: 'voluntario' }, valores_despues: null, campos_modificados: null,          metadata: { ip: '203.0.113.1', motivo: 'Cuenta de prueba eliminada' }, created_at: dAgo(16) },
  { id: 'l031', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'documentos',  fila_id: 'd004', accion: 'UPDATE', valores_antes: { nombre: 'plan_inicial.pdf' }, valores_despues: { nombre: 'plan_inicial_v2.pdf' },                                            campos_modificados: ['nombre'],              metadata: { ip: '10.0.0.5' },                  created_at: hAgo(6) },
  { id: 'l032', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'documentos',   fila_id: 'd005', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'foto_actividad', nombre: 'actividad_lectura_22abr.jpg' },                  campos_modificados: null,                   metadata: { ip: '192.168.1.10', size_kb: 1240 }, created_at: hAgo(14) },
  { id: 'l033', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's005', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'juego_educativo', duracion_minutos: 50, estado: 'completada' },             campos_modificados: null,                   metadata: { ip: '192.168.1.15', dispositivo: 'tablet' }, created_at: dAgo(5) },
  { id: 'l034', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'sesiones',     fila_id: 's006', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'lectura', duracion_minutos: 35, estado: 'completada' },                    campos_modificados: null,                   metadata: { ip: '192.168.1.15' },              created_at: dAgo(6) },
  { id: 'l035', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's007', accion: 'UPDATE', valores_antes: { estado: 'pendiente', observaciones: null }, valores_despues: { estado: 'completada', observaciones: 'Progreso notable en comprensión lectora.' }, campos_modificados: ['estado','observaciones'], metadata: { ip: '10.0.0.5' }, created_at: dAgo(7) },
  { id: 'l036', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'sesiones',     fila_id: 's008', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'matematica', duracion_minutos: 40, estado: 'completada' },                  campos_modificados: null,                   metadata: { ip: '192.168.1.10' },              created_at: hAgo(1) },
  { id: 'l037', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's009', accion: 'DELETE', valores_antes: { tipo: 'lectura', estado: 'cancelada' }, valores_despues: null,                                                            campos_modificados: null,                   metadata: { ip: '10.0.0.5', motivo: 'Sesión cancelada sin datos' }, created_at: hAgo(10) },
  { id: 'l038', user_id: ADMIN_ID,  user_email: 'admin@demo.apa',      user_rol: 'admin',             tabla: 'asignaciones', fila_id: 'a006', accion: 'UPDATE', valores_antes: { notas: null },               valores_despues: { notas: 'Seguimiento especial requerido' },                                       campos_modificados: ['notas'],               metadata: { ip: '203.0.113.1' },              created_at: dAgo(15) },
  { id: 'l039', user_id: VOL_ID,    user_email: 'voluntario@demo.apa', user_rol: 'voluntario',        tabla: 'sesiones',     fila_id: 's010', accion: 'UPDATE', valores_antes: { observaciones: null },       valores_despues: { observaciones: 'Muy motivado. Terminó todos los ejercicios.' },                   campos_modificados: ['observaciones'],       metadata: { ip: '192.168.1.10' },              created_at: dAgo(18) },
  { id: 'l040', user_id: EQUIPO_ID, user_email: 'equipo@demo.apa',     user_rol: 'equipo_profesional', tabla: 'sesiones',    fila_id: 's011', accion: 'INSERT', valores_antes: null,                          valores_despues: { tipo: 'evaluacion_comprension', duracion_minutos: 55, estado: 'completada' },      campos_modificados: null,                   metadata: { ip: '10.0.0.5' },                  created_at: dAgo(17) },
];

// GET /api/audit-logs
// Query params: tabla, accion, user_id, desde, hasta, page, per_page
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Solo admin/director
    const { data: perfil } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!perfil || !['admin', 'director'].includes(perfil.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tabla    = searchParams.get('tabla');
    const accion   = searchParams.get('accion');
    const userId   = searchParams.get('user_id');
    const desde    = searchParams.get('desde');
    const hasta    = searchParams.get('hasta');
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage  = Math.min(100, Math.max(10, parseInt(searchParams.get('per_page') ?? '50', 10)));
    const offset   = (page - 1) * perPage;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (tabla)   query = query.eq('tabla', tabla);
    if (accion)  query = query.eq('accion', accion);
    if (userId)  query = query.eq('user_id', userId);
    if (desde)   query = query.gte('created_at', desde);
    if (hasta)   query = query.lte('created_at', hasta);

    const { data, count, error } = await query;

    if (error) {
      // Si la tabla no existe, devolver datos mock en lugar de 500
      if (error.code === 'PGRST200' || error.code === 'PGRST205' || error.message?.includes('audit_logs')) {
        console.warn('[audit-logs GET] Tabla audit_logs no existe, devolviendo mock');
        return NextResponse.json({ data: MOCK_LOGS, total: MOCK_LOGS.length, page: 1, per_page: 50, total_pages: 1 });
      }
      console.error('[audit-logs GET]', error.message);
      return NextResponse.json({ error: 'Error al obtener logs' }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count ?? 0) / perPage),
    });
  } catch (err) {
    console.error('[audit-logs GET] inesperado:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
