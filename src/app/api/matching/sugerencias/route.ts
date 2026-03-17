import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface DeficitNino {
  area: string;
  nivel_gravedad: number; // 1-5 (5 = crítico)
  descripcion: string;
}

interface HabilidadesVoluntario {
  lenguaje: number;
  grafismo: number;
  lectura_escritura: number;
  matematicas: number;
}

interface SugerenciaMatching {
  voluntario_id: string;
  voluntario_nombre: string;
  score: number;
  habilidades: HabilidadesVoluntario;
  asignaciones_actuales: number;
  disponibilidad: 'alta' | 'media' | 'baja';
  detalles_score: {
    score_habilidades: number;
    score_disponibilidad: number;
    score_zona: number;
  };
}

/**
 * Mapeo de áreas entre déficits de niños y habilidades de voluntarios
 */
const MAPEO_AREAS: Record<string, keyof HabilidadesVoluntario> = {
  'lenguaje_vocabulario': 'lenguaje',
  'lenguaje': 'lenguaje',
  'grafismo_motricidad': 'grafismo',
  'grafismo': 'grafismo',
  'lectura_escritura': 'lectura_escritura',
  'lectura': 'lectura_escritura',
  'escritura': 'lectura_escritura',
  'nociones_matematicas': 'matematicas',
  'matematicas': 'matematicas',
  'general': 'lenguaje', // Default a lenguaje si es general
};

/**
 * GET /api/matching/sugerencias?ninoId=xxx
 * Obtiene sugerencias de voluntarios compatibles para un niño
 * Basado en:
 * - Habilidades del voluntario (de autoevaluaciones completadas)
 * - Déficits del niño (de evaluación psicopedagógica)
 * - Carga actual del voluntario
 * - Proximidad de zona (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient(request);

    // Verificar autenticación
    let userId = (supabase as any)._authUserId;
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      userId = user.id;
    }

    // Verificar permisos (solo coordinador, profesional, director)
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('id, rol')
      .eq('id', userId)
      .single();

    if (perfilError || !perfil) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (!['coordinador', 'psicopedagogia', 'director', 'admin', 'equipo_profesional'].includes(perfil.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta operación' },
        { status: 403 }
      );
    }

    // Obtener ninoId del query param
    const { searchParams } = new URL(request.url);
    const ninoId = searchParams.get('ninoId') || searchParams.get('nino_id');

    if (!ninoId) {
      return NextResponse.json(
        { error: 'Falta parámetro ninoId' },
        { status: 400 }
      );
    }

    // 1. Obtener información del niño y sus déficits
    const { data: nino, error: ninoError } = await supabase
      .from('ninos')
      .select('id, alias, zona_id')
      .eq('id', ninoId)
      .single();

    if (ninoError || !nino) {
      return NextResponse.json(
        { error: 'Niño no encontrado' },
        { status: 404 }
      );
    }

    // Obtener déficits del niño desde historico_deficits (puede estar vacío, no bloqueante)
    const { data: deficitsData } = await supabase
      .from('historico_deficits')
      .select('area, nivel_gravedad, descripcion')
      .eq('nino_id', ninoId)
      .is('resuelto_en', null)
      .order('detectado_en', { ascending: false });

    const deficits: DeficitNino[] = (deficitsData || []).map((d: any) => ({
      area: d.area,
      nivel_gravedad: d.nivel_gravedad || 3,
      descripcion: d.descripcion || '',
    }));

    const sinDeficits = deficits.length === 0;

    // 2. Obtener todos los voluntarios
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

    const { data: voluntarios, error: voluntariosError } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombre, apellido, zona_id')
      .eq('rol', 'voluntario');

    if (voluntariosError) {
      return NextResponse.json(
        { error: 'Error al obtener voluntarios' },
        { status: 500 }
      );
    }

    // 3. Para cada voluntario, obtener sus scores por área
    //    Primero intenta scores_voluntarios_por_area (tabla consolidada),
    //    si no hay datos hace fallback a voluntarios_capacitaciones (porcentaje completado)
    const sugerencias: SugerenciaMatching[] = [];

    for (const voluntario of voluntarios || []) {
      const areaMapping: Record<string, keyof HabilidadesVoluntario> = {
        'lenguaje_vocabulario': 'lenguaje',
        'lenguaje': 'lenguaje',
        'grafismo_motricidad': 'grafismo',
        'grafismo': 'grafismo',
        'lectura_escritura': 'lectura_escritura',
        'nociones_matematicas': 'matematicas',
        'matematicas': 'matematicas',
      };
      const habilidades: HabilidadesVoluntario = { lenguaje: 0, grafismo: 0, lectura_escritura: 0, matematicas: 0 };
      let tieneEvaluacion = false;

      // Intentar primero scores consolidados
      const { data: scores } = await supabase
        .from('scores_voluntarios_por_area')
        .select('area, score_final')
        .eq('voluntario_id', voluntario.id);

      if (scores && scores.length > 0) {
        tieneEvaluacion = true;
        for (const s of scores) {
          const key = areaMapping[s.area];
          if (key) {
            habilidades[key] = (s.score_final || 0) / 20; // 0-100 → 0-5
          }
        }
      } else {
        // Fallback: calcular scores desde respuestas individuales (para voluntarios
        // cuyo backfill aún no corrió o que tienen autoevaluaciones muy recientes)
        const { data: respuestas } = await supabase
          .from('respuestas_capacitaciones')
          .select(`
            es_correcta,
            pregunta:preguntas_capacitacion!inner(area_especifica),
            vol_cap:voluntarios_capacitaciones!inner(
              capacitacion:capacitaciones!inner(area, tipo),
              estado
            )
          `)
          .eq('vol_cap.voluntario_id', voluntario.id)
          .in('vol_cap.estado', ['aprobada', 'completada']);

        if (respuestas && respuestas.length > 0) {
          tieneEvaluacion = true;
          const contadorPorArea: Record<string, { correctas: number; total: number }> = {};

          for (const r of respuestas as any[]) {
            const areaPregunta = (r.pregunta?.area_especifica || r.vol_cap?.capacitacion?.area || '').trim();
            const key = areaMapping[areaPregunta];
            if (!key) continue;
            if (!contadorPorArea[areaPregunta]) contadorPorArea[areaPregunta] = { correctas: 0, total: 0 };
            contadorPorArea[areaPregunta].total += 1;
            if (r.es_correcta) contadorPorArea[areaPregunta].correctas += 1;
          }

          for (const [area, counts] of Object.entries(contadorPorArea)) {
            const key = areaMapping[area];
            if (key && counts.total > 0) {
              const pct = (counts.correctas / counts.total) * 100;
              habilidades[key] = Math.max(habilidades[key], pct / 20); // 0-100 → 0-5
            }
          }
        }
      }

      // Incluir voluntarios SIN evaluación solo cuando el niño no tiene déficits
      // (modo "todos disponibles" — se muestran al final con score bajo)
      if (!tieneEvaluacion && !sinDeficits) {
        continue;
      }

      // Obtener asignaciones actuales del voluntario
      const { data: asignaciones, error: asignacionesError } = await supabase
        .from('asignaciones')
        .select('id')
        .eq('voluntario_id', voluntario.id)
        .eq('activa', true);

      const numAsignaciones = asignaciones?.length || 0;

      // Calcular score de matching
      const score = calcularScoreMatching(
        deficits,
        habilidades,
        numAsignaciones,
        voluntario.zona_id,
        nino.zona_id
      );

      // Determinar disponibilidad
      let disponibilidad: 'alta' | 'media' | 'baja' = 'alta';
      if (numAsignaciones >= 3) disponibilidad = 'baja';
      else if (numAsignaciones >= 2) disponibilidad = 'media';

      const voluntarioNombre = [voluntario.nombre, voluntario.apellido].filter(Boolean).join(' ') || 'Voluntario sin nombre';

      sugerencias.push({
        voluntario_id: voluntario.id,
        voluntario_nombre: voluntarioNombre,
        score: Math.round(score.total),
        habilidades,
        asignaciones_actuales: numAsignaciones,
        disponibilidad,
        detalles_score: {
          score_habilidades: Math.round(score.habilidades),
          score_disponibilidad: Math.round(score.disponibilidad),
          score_zona: Math.round(score.zona),
        },
      });
    }

    // Ordenar por score descendente
    sugerencias.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      nino: {
        id: nino.id,
        alias: nino.alias,
        deficits,
      },
      sugerencias,
      total: sugerencias.length,
      sinDeficits,
    });

  } catch (error) {
    console.error('Error en matching/sugerencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Calcula habilidades promedio por área desde las respuestas
 */
function calcularHabilidadesPorArea(respuestas: any): HabilidadesVoluntario {
  const areasPuntajes: Record<string, number[]> = {
    lenguaje: [],
    grafismo: [],
    lectura_escritura: [],
    matematicas: [],
  };

  // Agrupar respuestas por área
  if (Array.isArray(respuestas)) {
    respuestas.forEach((resp: any) => {
      const area = resp.area?.toLowerCase().replace(/\s+/g, '_');
      const areaKey = MAPEO_AREAS[area];

      if (areaKey && resp.respuesta && typeof resp.respuesta === 'number') {
        areasPuntajes[areaKey].push(resp.respuesta);
      }
    });
  }

  // Calcular promedios
  const habilidades: HabilidadesVoluntario = {
    lenguaje: calcularPromedio(areasPuntajes.lenguaje),
    grafismo: calcularPromedio(areasPuntajes.grafismo),
    lectura_escritura: calcularPromedio(areasPuntajes.lectura_escritura),
    matematicas: calcularPromedio(areasPuntajes.matematicas),
  };

  return habilidades;
}

/**
 * Calcula el score de matching entre déficits del niño y habilidades del voluntario.
 * Si no hay déficits registrados, usa el promedio de habilidades del voluntario como score.
 */
function calcularScoreMatching(
  deficits: DeficitNino[],
  habilidades: HabilidadesVoluntario,
  numAsignaciones: number,
  zonaVoluntario: string | null,
  zonaNino: string | null
): { total: number; habilidades: number; disponibilidad: number; zona: number } {
  let scoreHabilidades = 0;

  if (deficits.length === 0) {
    // Sin déficits: score basado en promedio general de habilidades (peso: 70%)
    const promedioHabilidades =
      (habilidades.lenguaje + habilidades.grafismo + habilidades.lectura_escritura + habilidades.matematicas) / 4;
    scoreHabilidades = (promedioHabilidades / 5) * 70; // normalizar 0-5 → 0-70
  } else {
    // Con déficits: peso por área según prioridad
    deficits.forEach((deficit) => {
      const area = deficit.area.toLowerCase().replace(/\s+/g, '_');
      const areaKey = MAPEO_AREAS[area];
      if (areaKey) {
        const habilidadVoluntario = habilidades[areaKey];
        const prioridad = deficit.nivel_gravedad; // 1-5
        scoreHabilidades += habilidadVoluntario * prioridad * 2.8;
      }
    });
    const maxScoreHabilidades = deficits.length * 5 * 5 * 2.8;
    scoreHabilidades = maxScoreHabilidades > 0 ? (scoreHabilidades / maxScoreHabilidades) * 70 : 0;
  }

  // 2. Score por disponibilidad (peso: 20%)
  let scoreDisponibilidad = 20;
  if (numAsignaciones >= 3) scoreDisponibilidad = 5;
  else if (numAsignaciones === 2) scoreDisponibilidad = 12;
  else if (numAsignaciones === 1) scoreDisponibilidad = 16;

  // 3. Score por zona (peso: 10%)
  let scoreZona = 10;
  if (!zonaVoluntario || !zonaNino) {
    scoreZona = 5;
  } else if (zonaVoluntario !== zonaNino) {
    scoreZona = 3;
  }

  const total = scoreHabilidades + scoreDisponibilidad + scoreZona;

  return {
    total,
    habilidades: scoreHabilidades,
    disponibilidad: scoreDisponibilidad,
    zona: scoreZona,
  };
}

/**
 * Calcula promedio de un array de números
 */
function calcularPromedio(numeros: number[]): number {
  if (numeros.length === 0) return 2.5;
  const suma = numeros.reduce((acc, num) => acc + num, 0);
  return suma / numeros.length;
}
