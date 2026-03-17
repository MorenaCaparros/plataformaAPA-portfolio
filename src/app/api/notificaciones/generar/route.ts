import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/notificaciones/generar
 * 
 * Client-side triggered: when a volunteer loads their dashboard, this endpoint
 * checks whether a new capacitación reminder notification should be created
 * based on the admin-configurable interval.
 * 
 * Logic:
 * 1. Check if notifications are active (configuracion_sistema)
 * 2. Check if the volunteer has pending capacitaciones (necesita_capacitacion = true)
 * 3. Check the last reminder notification for this volunteer
 * 4. If enough time has passed (interval from config), create a new notification
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 1. Load config
    const { data: configRows } = await supabase
      .from('configuracion_sistema')
      .select('clave, valor')
      .in('clave', ['notificacion_capacitacion_activa', 'notificacion_capacitacion_intervalo_horas']);

    const configMap: Record<string, string> = {};
    (configRows || []).forEach((r: any) => { configMap[r.clave] = r.valor; });

    const notifActiva = configMap['notificacion_capacitacion_activa'] !== 'false';
    const intervaloHoras = parseInt(configMap['notificacion_capacitacion_intervalo_horas'] || '48');

    if (!notifActiva) {
      return NextResponse.json({ created: false, reason: 'notificaciones_desactivadas' });
    }

    // 2. Check if volunteer has areas that need capacitación
    const { data: scores } = await supabase
      .from('scores_voluntarios_por_area')
      .select('area, necesita_capacitacion')
      .eq('voluntario_id', user.id)
      .eq('necesita_capacitacion', true);

    const areasPendientes = (scores || []).map((s: any) => s.area as string);

    if (areasPendientes.length === 0) {
      return NextResponse.json({ created: false, reason: 'sin_capacitaciones_pendientes' });
    }

    // 3. Check last reminder notification for this user
    const { data: lastNotif } = await supabase
      .from('notificaciones')
      .select('created_at')
      .eq('usuario_id', user.id)
      .eq('tipo', 'recordatorio_capacitacion')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastNotif && lastNotif.length > 0) {
      const lastCreated = new Date(lastNotif[0].created_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - lastCreated.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed < intervaloHoras) {
        return NextResponse.json({
          created: false,
          reason: 'intervalo_no_cumplido',
          nextIn: Math.ceil(intervaloHoras - hoursElapsed),
        });
      }
    }

    // 4. Build area labels for the message
    const AREA_LABELS: Record<string, string> = {
      lenguaje: 'Lenguaje y Vocabulario',
      lenguaje_vocabulario: 'Lenguaje y Vocabulario',
      grafismo: 'Grafismo y Motricidad Fina',
      grafismo_motricidad: 'Grafismo y Motricidad Fina',
      lectura_escritura: 'Lectura y Escritura',
      nociones_matematicas: 'Nociones Matemáticas',
      matematicas: 'Nociones Matemáticas',
    };

    const areasTexto = areasPendientes
      .map((a: string) => AREA_LABELS[a] || a)
      .join(', ');

    // 5. Create the notification
    const { error: insertError } = await supabase
      .from('notificaciones')
      .insert({
        usuario_id: user.id,
        tipo: 'recordatorio_capacitacion',
        titulo: '📚 Capacitaciones sugeridas',
        mensaje: `Tenés capacitaciones opcionales disponibles en: ${areasTexto}. Completarlas puede ayudarte a mejorar tus habilidades con los niños.`,
        enlace: '/dashboard/capacitaciones',
        leida: false,
      });

    if (insertError) {
      console.error('Error al crear notificación:', insertError);
      return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 });
    }

    return NextResponse.json({ created: true, areas: areasPendientes });
  } catch (error) {
    console.error('Error en /api/notificaciones/generar:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
