import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadProfilePhoto } from '@/lib/google/drive-storage';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST /api/perfil/foto — Subir foto de perfil a Google Drive
// Query param ?userId=xxx allows admin to upload for another user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check if uploading for another user (admin feature)
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    let uploadForId = user.id;

    if (targetUserId && targetUserId !== user.id) {
      // Verify caller is admin/director
      const { data: callerPerfil } = await supabaseAdmin
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (callerPerfil?.rol !== 'director' && callerPerfil?.rol !== 'admin') {
        return NextResponse.json({ error: 'No autorizado para subir foto de otro usuario' }, { status: 403 });
      }
      uploadForId = targetUserId;
    }

    const formData = await request.formData();
    const file = formData.get('foto') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    // Validar tipo y tamaño
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF.' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo excede el límite de 5MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive (NOT Supabase Storage)
    const result = await uploadProfilePhoto(buffer, file.type, 'usuarios', uploadForId, ext);

    // Update perfil record with Drive direct image URL
    const { error: updateError } = await supabaseAdmin
      .from('perfiles')
      .update({ foto_perfil_url: result.url, updated_at: new Date().toISOString() })
      .eq('id', uploadForId);

    if (updateError) throw updateError;

    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error: any) {
    console.error('Error en POST /api/perfil/foto:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
