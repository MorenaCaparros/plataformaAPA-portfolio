/**
 * GET /api/health
 *
 * Endpoint público que verifica que el servidor y Supabase están vivos.
 * Usado por el workflow .github/workflows/supabase-keepalive.yml para
 * prevenir que el proyecto de Supabase free se pause por inactividad
 * (Supabase pausa proyectos free tras 7 días sin actividad).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay Supabase configurado, responder igual — la app puede correr sin él
  if (!url || !key) {
    return NextResponse.json(
      { status: 'ok', db: 'not_configured', ts: new Date().toISOString() },
      { status: 200 }
    );
  }

  try {
    // Query mínima: solo pide el count de zonas (tabla pequeña, sin RLS complejo)
    const supabase = createClient(url, key);
    const { error } = await supabase
      .from('zonas')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json(
      { status: 'ok', db: 'connected', ts: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', message: err.message, ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
