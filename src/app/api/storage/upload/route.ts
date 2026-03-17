import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadGenericFile } from '@/lib/google/drive-storage';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Allowed MIME types by category ──────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
const ALL_ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES];

// Bucket-specific config (kept for validation only — storage is now Drive)
const BUCKET_CONFIG: Record<string, { fileSizeLimit: number; allowedMimeTypes: string[]; isPublic: boolean }> = {
  'fotos-perfil':        { fileSizeLimit: 5 * 1024 * 1024,  allowedMimeTypes: IMAGE_TYPES, isPublic: true },
  'audios-entrevistas':  { fileSizeLimit: 50 * 1024 * 1024, allowedMimeTypes: AUDIO_TYPES, isPublic: false },
};

const DEFAULT_BUCKET_CONFIG = { fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ALL_ALLOWED_TYPES, isPublic: true };

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * POST /api/storage/upload
 * 
 * Generic upload endpoint — files go to Google Drive (NOT Supabase Storage).
 * Query params:
 *   bucket  - logical bucket name (maps to Drive folder), default: "fotos-perfil"
 *   path    - file path inside bucket, e.g. "ninos/{id}/perfil.jpg"
 *   table   - (optional) Supabase table to update with the URL
 *   id      - (optional) row id to update
 *   column  - (optional) column name for the URL (default: "foto_perfil_url")
 * 
 * Body: FormData with field "file"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get('bucket') || 'fotos-perfil';
    const filePath = searchParams.get('path');
    const table = searchParams.get('table');
    const rowId = searchParams.get('id');
    const column = searchParams.get('column') || 'foto_perfil_url';

    if (!filePath) {
      return NextResponse.json({ error: 'Falta parámetro "path"' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    // Validate using bucket-specific config
    const cfg = BUCKET_CONFIG[bucketName] || DEFAULT_BUCKET_CONFIG;

    if (!cfg.allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo "${file.type}" no permitido para bucket "${bucketName}". Tipos válidos: ${cfg.allowedMimeTypes.join(', ')}` },
        { status: 400 }
      );
    }
    if (file.size > cfg.fileSizeLimit) {
      const maxMB = Math.round(cfg.fileSizeLimit / (1024 * 1024));
      return NextResponse.json({ error: `El archivo excede ${maxMB}MB` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive (NOT Supabase Storage)
    const result = await uploadGenericFile(
      buffer,
      file.type,
      bucketName,
      filePath,
      cfg.isPublic // fotos → public, audios → private
    );

    const publicUrl = result.url;

    // Optionally update a DB record
    if (table && rowId) {
      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({ [column]: publicUrl })
        .eq('id', rowId);

      if (updateError) {
        console.error(`Error updating ${table}.${column}:`, updateError);
        // Don't fail — the file was uploaded successfully
      }
    }

    return NextResponse.json({ url: publicUrl, fileId: result.fileId });
  } catch (error: any) {
    console.error('Error en POST /api/storage/upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
