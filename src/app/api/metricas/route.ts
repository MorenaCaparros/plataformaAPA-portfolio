import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Métricas para VOLUNTARIOS
async function getMetricasVoluntario(userId: string) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select('nino_id')
    .eq('voluntario_id', userId)
    .eq('activa', true);

  const ninosIds = (asignaciones || []).map((a: { nino_id: string }) => a.nino_id);

  const { count: sesionesEsteMes } = await supabase
    .from('sesiones')
    .select('*', { count: 'exact', head: true })
    .eq('voluntario_id', userId)
    .gte('fecha', inicioMes.toISOString());

  const { count: sesionesEstaSemana } = await supabase
    .from('sesiones')
    .select('*', { count: 'exact', head: true })
    .eq('voluntario_id', userId)
    .gte('fecha', inicioSemana.toISOString());

  const { data: sesionesMes } = await supabase
    .from('sesiones')
    .select('duracion_minutos')
    .eq('voluntario_id', userId)
    .gte('fecha', inicioMes.toISOString());

  const minutosTotales = (sesionesMes || []).reduce(
    (acc: number, s: { duracion_minutos?: number }) => acc + (s.duracion_minutos || 0), 0
  );

  const { count: totalSesionesHistoricas } = await supabase
    .from('sesiones')
    .select('*', { count: 'exact', head: true })
    .eq('voluntario_id', userId);

  return {
    resumen: {
      ninos_asignados: ninosIds.length,
      sesiones_este_mes: sesionesEsteMes || 0,
      sesiones_esta_semana: sesionesEstaSemana || 0,
      horas_este_mes: Math.round(minutosTotales / 60 * 10) / 10,
    },
    detalle: {
      total_sesiones_historicas: totalSesionesHistoricas || 0,
      promedio_duracion_minutos: sesionesMes && sesionesMes.length > 0 ? Math.round(minutosTotales / sesionesMes.length) : 0,
      racha_dias: 0,
      ultima_sesion: null,
    },
    tendencias: {
      sesiones_vs_mes_anterior: 0,
      progreso_meta_mensual: Math.min(100, Math.round(((sesionesEsteMes || 0) / 12) * 100)),
    }
  };
}

// Métricas para EQUIPO
async function getMetricasEquipo(userId: string, zonaId?: string) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  if (!zonaId) {
    const { data: perfil } = await supabase.from('perfiles').select('zona_id').eq('id', userId).single();
    zonaId = perfil?.zona_id || undefined;
  }

  let queryNinos = supabase.from('ninos').select('id, nivel_alfabetizacion, escolarizado', { count: 'exact' });
  if (zonaId) queryNinos = queryNinos.eq('zona_id', zonaId);
  const { data: ninos, count: totalNinos } = await queryNinos;

  type NinoBasico = { id: string; nivel_alfabetizacion?: string; escolarizado?: boolean };
  const ninosTyped = (ninos || []) as NinoBasico[];
  const ninosIds = ninosTyped.map((n) => n.id);

  let queryVoluntarios = supabase.from('perfiles').select('id', { count: 'exact' }).eq('rol', 'voluntario');
  if (zonaId) queryVoluntarios = queryVoluntarios.eq('zona_id', zonaId);
  const { count: totalVoluntarios } = await queryVoluntarios;

  let querySesionesMes = supabase.from('sesiones').select('id, duracion_minutos, nino_id, voluntario_id', { count: 'exact' }).gte('fecha', inicioMes.toISOString());
  if (ninosIds.length > 0) querySesionesMes = querySesionesMes.in('nino_id', ninosIds);
  const { data: sesionesMes, count: totalSesionesMes } = await querySesionesMes;

  type SesionBasica = { id: string; duracion_minutos?: number; nino_id?: string; voluntario_id?: string };
  const sesionesTyped = (sesionesMes || []) as SesionBasica[];
  const minutosTotales = sesionesTyped.reduce((acc: number, s) => acc + (s.duracion_minutos || 0), 0);
  const voluntariosActivos = new Set(sesionesTyped.map((s) => s.voluntario_id));
  const ninosConSesion = new Set(sesionesTyped.map((s) => s.nino_id));

  const distribucionNivel: Record<string, number> = {};
  ninosTyped.forEach((n) => {
    const nivel = n.nivel_alfabetizacion || 'sin_evaluar';
    distribucionNivel[nivel] = (distribucionNivel[nivel] || 0) + 1;
  });

  let nombreZona = 'Todas las zonas';
  if (zonaId) {
    const { data: zona } = await supabase.from('zonas').select('nombre').eq('id', zonaId).single();
    nombreZona = zona?.nombre || 'Zona desconocida';
  }

  return {
    zona: { id: zonaId || null, nombre: nombreZona },
    resumen: {
      total_ninos: totalNinos || 0,
      total_voluntarios: totalVoluntarios || 0,
      sesiones_este_mes: totalSesionesMes || 0,
      sesiones_esta_semana: 0,
      horas_este_mes: Math.round(minutosTotales / 60 * 10) / 10,
    },
    equipo: {
      voluntarios_activos: voluntariosActivos.size,
      tasa_actividad_voluntarios: totalVoluntarios ? Math.round((voluntariosActivos.size / (totalVoluntarios || 1)) * 100) : 0,
      asignaciones_activas: 0,
    },
    atencion: {
      ninos_sin_sesion_este_mes: ninosIds.filter((id) => !ninosConSesion.has(id)).length,
      promedio_sesiones_por_nino: ninosIds.length > 0 ? Math.round(((totalSesionesMes || 0) / ninosIds.length) * 10) / 10 : 0,
      cobertura_porcentaje: ninosIds.length > 0 ? Math.round((ninosConSesion.size / ninosIds.length) * 100) : 0,
    },
    distribucion: {
      por_nivel_alfabetizacion: distribucionNivel,
      escolarizados: ninosTyped.filter((n) => n.escolarizado).length,
      no_escolarizados: ninosTyped.filter((n) => !n.escolarizado).length,
    },
    alertas: {
      ninos_sin_atencion: ninosIds.filter((id) => !ninosConSesion.has(id)).length,
      voluntarios_inactivos: (totalVoluntarios || 0) - voluntariosActivos.size,
    }
  };
}

// Métricas para ADMIN
async function getMetricasAdmin() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { count: totalNinos } = await supabase.from('ninos').select('*', { count: 'exact', head: true });
  const { count: totalVoluntarios } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'voluntario');
  const { count: totalUsuarios } = await supabase.from('perfiles').select('*', { count: 'exact', head: true });
  const { count: totalZonas } = await supabase.from('zonas').select('*', { count: 'exact', head: true });
  const { count: totalSesiones } = await supabase.from('sesiones').select('*', { count: 'exact', head: true });

  const { data: sesionesMes } = await supabase.from('sesiones').select('duracion_minutos, voluntario_id, nino_id').gte('fecha', inicioMes.toISOString());
  type SesionMes = { duracion_minutos?: number; voluntario_id?: string; nino_id?: string };
  const sesionesTyped = (sesionesMes || []) as SesionMes[];
  const minutosTotales = sesionesTyped.reduce((acc: number, s) => acc + (s.duracion_minutos || 0), 0);
  const sesionesEsteMes = sesionesTyped.length;
  const voluntariosActivos = new Set(sesionesTyped.map((s) => s.voluntario_id));
  const ninosAtendidos = new Set(sesionesTyped.map((s) => s.nino_id));

  const { data: distribucionRoles } = await supabase.from('perfiles').select('rol');
  const porRol: Record<string, number> = {};
  ((distribucionRoles || []) as { rol: string }[]).forEach((p) => { porRol[p.rol] = (porRol[p.rol] || 0) + 1; });

  const { data: zonas } = await supabase.from('zonas').select('id, nombre');
  type ZonaBasica = { id: string; nombre: string };
  const zonasTyped = (zonas || []) as ZonaBasica[];

  const metricasPorZona = await Promise.all(zonasTyped.map(async (zona) => {
    const { count: ninosZona } = await supabase.from('ninos').select('*', { count: 'exact', head: true }).eq('zona_id', zona.id);
    const { count: voluntariosZona } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'voluntario').eq('zona_id', zona.id);
    return { zona_id: zona.id, nombre: zona.nombre, ninos: ninosZona || 0, voluntarios: voluntariosZona || 0, sesiones_mes: 0 };
  }));

  return {
    resumen: { total_ninos: totalNinos || 0, total_voluntarios: totalVoluntarios || 0, total_usuarios: totalUsuarios || 0, total_zonas: totalZonas || 0, total_sesiones: totalSesiones || 0 },
    este_mes: { sesiones: sesionesEsteMes || 0, horas: Math.round(minutosTotales / 60 * 10) / 10, voluntarios_activos: voluntariosActivos.size, ninos_atendidos: ninosAtendidos.size },
    esta_semana: { sesiones: 0 },
    cobertura: { ninos_atendidos_porcentaje: totalNinos ? Math.round((ninosAtendidos.size / (totalNinos || 1)) * 100) : 0, voluntarios_activos_porcentaje: totalVoluntarios ? Math.round((voluntariosActivos.size / (totalVoluntarios || 1)) * 100) : 0, asignaciones_activas: 0 },
    distribucion: { usuarios_por_rol: porRol, por_zona: metricasPorZona },
    tendencias: { sesiones_vs_mes_anterior: 0 },
    alertas: { ninos_sin_atencion: (totalNinos || 0) - ninosAtendidos.size, voluntarios_inactivos: (totalVoluntarios || 0) - voluntariosActivos.size }
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const rol = searchParams.get('rol');
    const zonaId = searchParams.get('zonaId');

    if (!userId || !rol) {
      return NextResponse.json({ error: 'userId y rol son requeridos' }, { status: 400 });
    }

    let metricas;
    switch (rol) {
      case 'voluntario':
        metricas = await getMetricasVoluntario(userId);
        break;
      case 'coordinador':
      case 'trabajo_social':
      case 'trabajador_social':
      case 'trabajadora_social':
      case 'equipo_profesional':
        metricas = await getMetricasEquipo(userId, zonaId || undefined);
        break;
      case 'psicopedagogia':
      case 'admin':
      case 'director':
        metricas = await getMetricasAdmin();
        break;
      default:
        return NextResponse.json({ error: 'Rol no válido' }, { status: 400 });
    }

    return NextResponse.json({ success: true, rol, metricas, generado_en: new Date().toISOString() });
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    return NextResponse.json({ error: 'Error al obtener métricas', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 });
  }
}
