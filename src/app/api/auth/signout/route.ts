import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Retornar 200 en lugar de redirect:
  // El cliente ya navega a /login con window.location.href después de llamar
  // supabase.auth.signOut() directamente (que limpia document.cookie via el
  // cookie adapter custom). Un redirect 302 aquí hacía que fetch lo siguiera
  // y los Set-Cookie para limpiar la sesión se perdían.
  return NextResponse.json({ success: true });
}
