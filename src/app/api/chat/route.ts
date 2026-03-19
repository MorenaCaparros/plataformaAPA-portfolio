// API Route - MÃ³dulo IA centralizado
// Toda consulta requiere un niÃ±o seleccionado.
// La IA relaciona: perfil del niÃ±o + sesiones + planes de intervenciÃ³n + biblioteca RAG.
// Acceso por rol: voluntarios solo ven sus niÃ±os asignados; admin/equipo ven todos.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGeminiWithKeyRotation, generarEmbedding } from '@/lib/ia/gemini';
import { PROMPT_IA_CENTRALIZADO, PROMPT_CHAT_BIBLIOTECA, PROMPT_ANALISIS_SESION, PROMPT_IA_GRUPAL } from '@/lib/ia/prompts';

// â”€â”€ LÃ­mite diario de llamadas a Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Configurable con GEMINI_MAX_DAILY_CALLS en .env.local / Netlify env vars.
// Usa historial_consultas_ia para contar llamadas del dÃ­a en curso.
// Por defecto: 300 (suficiente para una prueba de un dÃ­a con 10 personas).
const MAX_DAILY_CALLS = parseInt(process.env.GEMINI_MAX_DAILY_CALLS || '300', 10);

// â”€â”€ LÃ­mites por usuario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAX_CALLS_PER_USER_PER_HOUR: mÃ¡ximo de consultas por usuario en 1 hora (default: 10)
// MIN_MINUTES_BETWEEN_CALLS: minutos mÃ­nimos entre consultas del mismo usuario (default: 10)
const MAX_CALLS_PER_USER_PER_HOUR = parseInt(process.env.GEMINI_MAX_PER_USER_HORA || '10', 10);
const MIN_MINUTES_BETWEEN_CALLS   = parseInt(process.env.GEMINI_MIN_MINUTOS_ENTRE  || '10', 10);

async function verificarLimiteDiario(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ bloqueado: boolean; uso: number; limite: number }> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('historial_consultas_ia')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hoy.toISOString());

    const uso = count ?? 0;
    return { bloqueado: uso >= MAX_DAILY_CALLS, uso, limite: MAX_DAILY_CALLS };
  } catch {
    return { bloqueado: false, uso: 0, limite: MAX_DAILY_CALLS };
  }
}

async function verificarLimiteUsuario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ bloqueado: boolean; mensaje: string }> {
  try {
    const ahora = new Date();

    // 1) Ãšltima consulta del usuario â†’ cooldown entre consultas
    const { data: ultima } = await supabase
      .from('historial_consultas_ia')
      .select('created_at')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ultima?.created_at) {
      const diff = (ahora.getTime() - new Date(ultima.created_at).getTime()) / 1000 / 60;
      if (diff < MIN_MINUTES_BETWEEN_CALLS) {
        const espera = Math.ceil(MIN_MINUTES_BETWEEN_CALLS - diff);
        return {
          bloqueado: true,
          mensaje: `EsperÃ¡ ${espera} minuto${espera !== 1 ? 's' : ''} antes de hacer otra consulta.`,
        };
      }
    }

    // 2) Consultas en la Ãºltima hora â†’ tope por usuario
    const haceUnaHora = new Date(ahora.getTime() - 60 * 60 * 1000);
    const { count } = await supabase
      .from('historial_consultas_ia')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .gte('created_at', haceUnaHora.toISOString());

    const usoHora = count ?? 0;
    if (usoHora >= MAX_CALLS_PER_USER_PER_HOUR) {
      return {
        bloqueado: true,
        mensaje: `Alcanzaste el lÃ­mite de ${MAX_CALLS_PER_USER_PER_HOUR} consultas por hora. IntentÃ¡ mÃ¡s tarde.`,
      };
    }

    return { bloqueado: false, mensaje: '' };
  } catch {
    return { bloqueado: false, mensaje: '' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticaciÃ³n
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // â”€â”€ LÃ­mite diario global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { bloqueado, uso, limite } = await verificarLimiteDiario(supabase);
    if (bloqueado) {
      return NextResponse.json(
        {
          error: `Se alcanzÃ³ el lÃ­mite diario de consultas (${uso}/${limite}). El lÃ­mite se reinicia a medianoche. ContactÃ¡ al administrador si necesitÃ¡s mÃ¡s.`,
        },
        { status: 429 }
      );
    }

    // â”€â”€ LÃ­mite por usuario (cooldown + tope por hora) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const limiteUsuario = await verificarLimiteUsuario(supabase, user.id);
    if (limiteUsuario.bloqueado) {
      return NextResponse.json({ error: limiteUsuario.mensaje }, { status: 429 });
    }

    const body = await request.json();
    const pregunta: string = body.pregunta;
    const tipo = body.tipo as string | undefined;
    const tagsFilter: string[] = Array.isArray(body.tags) ? body.tags : [];

    // Acepta ninoId (legacy, un nino) o ninoIds (nuevo, multiples ninos)
    const ninoIds: string[] = Array.isArray(body.ninoIds) && body.ninoIds.length > 0
      ? body.ninoIds
      : body.ninoId
      ? [body.ninoId]
      : [];

    if (!pregunta?.trim()) {
      return NextResponse.json({ error: 'Pregunta requerida' }, { status: 400 });
    }

    // ── Modo Biblioteca: consulta libre sobre la biblioteca RAG, sin nino ──────
    if (tipo === 'biblioteca') {
      try {
        const queryEmbedding = await generarEmbedding(pregunta);

        // Filtrar documentos por tags si se especificaron
        let filterIds: string[] | null = null;
        let totalDocumentos = 0;

        if (tagsFilter.length > 0) {
          const { data: docsConTags } = await supabase
            .from('documentos')
            .select('id')
            .overlaps('tags', tagsFilter);
          filterIds = (docsConTags || []).map((d: any) => d.id);
          totalDocumentos = filterIds.length;
        } else {
          const { count } = await supabase
            .from('documentos')
            .select('*', { count: 'exact', head: true });
          totalDocumentos = count || 0;
        }

        const { data: chunks } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 8,
          filter_documento_ids: filterIds,
        });

        let fragmentosBibliografia = 'No hay documentos cargados en la biblioteca aún.';
        let fuentesUsadas: { titulo: string; autor: string }[] = [];

        if (chunks && chunks.length > 0) {
          fragmentosBibliografia = chunks.map((chunk: any, i: number) =>
            `--- Fragmento ${i + 1} ---\nDocumento: ${chunk.documento.titulo}\nAutor: ${chunk.documento.autor}\n\n${chunk.texto}`
          ).join('\n\n');
          fuentesUsadas = [...new Map(chunks.map((c: any) => [c.documento.titulo, { titulo: c.documento.titulo, autor: c.documento.autor }])).values()];
        }

        const promptFinal = PROMPT_CHAT_BIBLIOTECA
          + `\n\n**FRAGMENTOS RELEVANTES DE LA BIBLIOTECA:**\n${fragmentosBibliografia}`
          + `\n\n**PREGUNTA:**\n${pregunta.trim()}`;

        const respuesta = await callGeminiWithKeyRotation(promptFinal);

        await supabase.from('historial_consultas_ia').insert({
          usuario_id: user.id,
          modo: 'biblioteca',
          nino_id: null,
          pregunta: pregunta.trim(),
          respuesta,
          fuentes: fuentesUsadas.length > 0 ? fuentesUsadas : null,
          tags_usados: tagsFilter.length > 0 ? tagsFilter : null,
          tokens_aprox: Math.round((promptFinal.length + respuesta.length) / 4),
        });

        return NextResponse.json({
          respuesta,
          fuentes: fuentesUsadas,
          totalDocumentos,
          filtradoPorTags: tagsFilter.length > 0 ? tagsFilter : null,
        });
      } catch (error: any) {
        console.error('Error en modo biblioteca:', error);
        return NextResponse.json(
          { error: error.message || 'Error al consultar la biblioteca' },
          { status: 500 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (ninoIds.length === 0) {
      return NextResponse.json(
        { error: 'Selecciona al menos un nino antes de consultar.' },
        { status: 400 }
      );
    }

    // -- Verificar rol y acceso --
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    const rol = perfil?.rol || 'voluntario';

    // Voluntarios: solo pueden consultar sobre sus ninos asignados
    if (rol === 'voluntario') {
      const { data: asignaciones } = await supabase
        .from('asignaciones')
        .select('nino_id')
        .eq('voluntario_id', user.id)
        .eq('activa', true)
        .in('nino_id', ninoIds);

      const idsAsignados = (asignaciones || []).map((a: any) => a.nino_id);
      const sinAcceso = ninoIds.filter(id => !idsAsignados.includes(id));
      if (sinAcceso.length > 0) {
        return NextResponse.json(
          { error: 'No tienes acceso a algunos de los ninos seleccionados.' },
          { status: 403 }
        );
      }
    }

    // -- Busqueda semantica en biblioteca (RAG) - comun para todos --
    let fragmentosBibliografia = 'No hay documentos cargados en la biblioteca aun.';
    let fuentesUsadas: { titulo: string; autor: string }[] = [];

    try {
      const queryEmbedding = await generarEmbedding(pregunta);
      const { data: chunks } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.60,
        match_count: 5,
        filter_documento_ids: null,
      });

      if (chunks && chunks.length > 0) {
        fragmentosBibliografia = chunks.map((chunk: any, i: number) =>
          `--- Fragmento ${i + 1} ---\nDocumento: ${chunk.documento.titulo}\nAutor: ${chunk.documento.autor}\n\n${chunk.texto}`
        ).join('\n\n');
        fuentesUsadas = chunks.map((c: any) => ({
          titulo: c.documento.titulo,
          autor: c.documento.autor,
        }));
      }
    } catch (embeddingError) {
      console.error('Error en busqueda RAG (no critico):', embeddingError);
      fragmentosBibliografia = 'No se pudo acceder a la biblioteca en este momento.';
    }

    // -- Un solo nino: comportamiento original --
    if (ninoIds.length === 1) {
      const ninoId = ninoIds[0];

      const { data: nino, error: ninoError } = await supabase
        .from('ninos')
        .select('id, alias, rango_etario, nivel_alfabetizacion, escolarizado')
        .eq('id', ninoId)
        .single();

      if (ninoError || !nino) {
        return NextResponse.json({ error: 'Nino no encontrado' }, { status: 404 });
      }

      const { data: sesiones } = await supabase
        .from('sesiones')
        .select('fecha, duracion_minutos, items, observaciones_libres')
        .eq('nino_id', ninoId)
        .order('fecha', { ascending: false })
        .limit(8);

      const { data: planes } = await supabase
        .from('planes_intervencion')
        .select('titulo, area, descripcion, objetivos, actividades_sugeridas, estado, prioridad, fecha_inicio, fecha_fin_estimada')
        .eq('nino_id', ninoId)
        .in('estado', ['activo', 'en_progreso'])
        .order('prioridad', { ascending: true });

      const perfilJson = JSON.stringify({
        alias: nino.alias,
        rango_etario: nino.rango_etario,
        nivel_alfabetizacion: nino.nivel_alfabetizacion || 'No especificado',
        escolarizado: nino.escolarizado ?? 'No especificado',
      }, null, 2);

      const sesionesJson = sesiones && sesiones.length > 0
        ? JSON.stringify(sesiones.map((s: any) => ({
            fecha: s.fecha,
            duracion_minutos: s.duracion_minutos,
            items: s.items,
            observaciones: s.observaciones_libres,
          })), null, 2)
        : 'No hay sesiones registradas aun.';

      const planesJson = planes && planes.length > 0
        ? JSON.stringify(planes.map((p: any) => ({
            titulo: p.titulo,
            area: p.area,
            descripcion: p.descripcion,
            objetivos: p.objetivos,
            actividades_sugeridas: p.actividades_sugeridas,
            estado: p.estado,
            prioridad: p.prioridad,
            fecha_inicio: p.fecha_inicio,
            fecha_fin_estimada: p.fecha_fin_estimada,
          })), null, 2)
        : 'No hay planes de intervencion activos.';

      const promptFinal = PROMPT_IA_CENTRALIZADO
        .replace('{perfil_json}', perfilJson)
        .replace('{sesiones_json}', sesionesJson)
        .replace('{planes_json}', planesJson)
        .replace('{fragmentos_rag}', fragmentosBibliografia)
        .replace('{pregunta}', pregunta.trim())
        .replace(/{alias}/g, nino.alias);

      const respuesta = await callGeminiWithKeyRotation(promptFinal);

      await supabase.from('historial_consultas_ia').insert({
        usuario_id: user.id,
        modo: 'analisis_nino',
        nino_id: ninoId,
        pregunta: pregunta.trim(),
        respuesta,
        fuentes: fuentesUsadas.length > 0 ? fuentesUsadas : null,
        tags_usados: null,
        tokens_aprox: Math.round((promptFinal.length + respuesta.length) / 4),
      });

      return NextResponse.json({
        respuesta,
        fuentes: fuentesUsadas,
        contexto: { nino: nino.alias, sesiones: sesiones?.length || 0, planes: planes?.length || 0 },
      });
    }

    // -- Multiples ninos: flujo grupal --
    const { data: ninos } = await supabase
      .from('ninos')
      .select('id, alias, rango_etario, nivel_alfabetizacion, escolarizado')
      .in('id', ninoIds);

    if (!ninos || ninos.length === 0) {
      return NextResponse.json({ error: 'No se encontraron los ninos seleccionados' }, { status: 404 });
    }

    const ninosConDatos = await Promise.all(
      ninos.map(async (nino: any) => {
        const [{ data: sesiones }, { data: planes }] = await Promise.all([
          supabase
            .from('sesiones')
            .select('fecha, duracion_minutos, items, observaciones_libres')
            .eq('nino_id', nino.id)
            .order('fecha', { ascending: false })
            .limit(5),
          supabase
            .from('planes_intervencion')
            .select('titulo, area, descripcion, objetivos, estado, prioridad')
            .eq('nino_id', nino.id)
            .in('estado', ['activo', 'en_progreso'])
            .order('prioridad', { ascending: true }),
        ]);
        return {
          alias: nino.alias,
          rango_etario: nino.rango_etario,
          nivel_alfabetizacion: nino.nivel_alfabetizacion || 'No especificado',
          escolarizado: nino.escolarizado ?? 'No especificado',
          sesiones_recientes: sesiones && sesiones.length > 0
            ? sesiones.map((s: any) => ({ fecha: s.fecha, duracion: s.duracion_minutos, items: s.items, observaciones: s.observaciones_libres }))
            : 'Sin sesiones registradas',
          planes_activos: planes && planes.length > 0
            ? planes.map((p: any) => ({ titulo: p.titulo, area: p.area, objetivos: p.objetivos, estado: p.estado }))
            : 'Sin planes activos',
        };
      })
    );

    const ninosJson = JSON.stringify(ninosConDatos, null, 2);
    const promptFinal = PROMPT_IA_GRUPAL
      .replace('{ninos_json}', ninosJson)
      .replace('{fragmentos_rag}', fragmentosBibliografia)
      .replace('{pregunta}', pregunta.trim());

    const respuesta = await callGeminiWithKeyRotation(promptFinal);
    const aliases = ninos.map((n: any) => n.alias);

    await supabase.from('historial_consultas_ia').insert({
      usuario_id: user.id,
      modo: 'analisis_grupal',
      nino_id: null,
      pregunta: pregunta.trim(),
      respuesta,
      fuentes: fuentesUsadas.length > 0 ? fuentesUsadas : null,
      tags_usados: aliases,
      tokens_aprox: Math.round((promptFinal.length + respuesta.length) / 4),
    });

    return NextResponse.json({
      respuesta,
      fuentes: fuentesUsadas,
      contexto: { ninos: aliases, total: ninos.length },
    });

  } catch (error: any) {
    console.error('âŒ Error en chat API:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    let errorMessage = 'Error al procesar la consulta';
    if (error.message?.includes('overloaded')) {
      errorMessage = 'El servicio de IA estÃ¡ temporalmente saturado. IntentÃ¡ de nuevo en unos segundos.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Error de configuraciÃ³n de la API. ContactÃ¡ al administrador.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Se alcanzÃ³ el lÃ­mite de uso de la API. IntentÃ¡ mÃ¡s tarde.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

