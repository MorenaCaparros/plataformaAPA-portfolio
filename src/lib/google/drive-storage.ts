/**
 * Google Drive Storage Helpers
 *
 * Reemplaza Supabase Storage para TODOS los archivos (fotos, audios, docs).
 * Los archivos se suben a carpetas de Drive configuradas por env vars.
 *
 * Para fotos de perfil: se hacen públicas y se devuelve URL directa de imagen.
 * Para audios: se mantienen privados y se devuelve webViewLink.
 */

import { Readable } from 'stream';
import { createDriveUploadClient } from './drive-auth';

// ─── Folder IDs from env ─────────────────────────────────────
function getFotosFolderId(): string {
  // Server-side env takes precedence, fallback to public
  const id =
    process.env.DRIVE_FOLDER_FOTOS ||
    process.env.NEXT_PUBLIC_DRIVE_FOLDER_FOTOS;
  if (!id) throw new Error('Falta DRIVE_FOLDER_FOTOS o NEXT_PUBLIC_DRIVE_FOLDER_FOTOS en .env.local');
  return id;
}

function getAudiosFolderId(): string {
  const id =
    process.env.DRIVE_FOLDER_AUDIOS ||
    process.env.NEXT_PUBLIC_DRIVE_FOLDER_AUDIOS;
  if (!id) throw new Error('Falta DRIVE_FOLDER_AUDIOS o NEXT_PUBLIC_DRIVE_FOLDER_AUDIOS en .env.local');
  return id;
}

// ─── Folder cache (avoid re-creating folders every upload) ────
const folderCache = new Map<string, string>();

/**
 * Get or create a sub-folder inside a parent folder.
 * Caches results in memory to avoid redundant API calls.
 */
async function getOrCreateFolder(
  drive: ReturnType<typeof createDriveUploadClient>,
  folderName: string,
  parentId: string
): Promise<string> {
  const cacheKey = `${parentId}/${folderName}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;

  // Search for existing folder
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    const id = res.data.files[0].id!;
    folderCache.set(cacheKey, id);
    return id;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  const id = folder.data.id!;
  folderCache.set(cacheKey, id);
  return id;
}

/**
 * Upload a file buffer to Google Drive.
 * Returns { fileId, webViewLink }.
 */
async function uploadToDrive(
  drive: ReturnType<typeof createDriveUploadClient>,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
  };
}

/**
 * Make a Drive file publicly readable (anyone with link can view).
 * Required for profile photos so they can be shown in <img> tags.
 */
async function makePublic(
  drive: ReturnType<typeof createDriveUploadClient>,
  fileId: string
): Promise<void> {
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });
}

/**
 * Get a direct image URL for a public Drive file.
 * This URL works inside <img src="..."> tags.
 * 
 * We use the /thumbnail endpoint with a large size which is the most
 * reliable way to serve Drive images in <img> tags without CORS issues.
 */
function getDirectImageUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}

/**
 * Delete a file from Drive by fileId.
 */
async function deleteFromDrive(
  drive: ReturnType<typeof createDriveUploadClient>,
  fileId: string
): Promise<void> {
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

/**
 * Find a file by name in a specific folder.
 * Returns fileId or null.
 */
async function findFileInFolder(
  drive: ReturnType<typeof createDriveUploadClient>,
  fileName: string,
  folderId: string
): Promise<string | null> {
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
  });
  return res.data.files?.[0]?.id || null;
}

// ─── Public API ──────────────────────────────────────────────

export interface DriveUploadResult {
  fileId: string;
  url: string;         // Direct image URL (for public files) or webViewLink
  webViewLink: string; // Always the Drive view link
}

/**
 * Upload a PROFILE PHOTO to Google Drive.
 * Structure: FOTOS / usuarios / {userId} / perfil.ext
 *            FOTOS / ninos / {entityId} / perfil.ext
 *
 * - Creates sub-folders as needed
 * - Deletes previous file if it exists (upsert behavior)
 * - Makes file public → returns direct image URL for <img> tags
 */
export async function uploadProfilePhoto(
  buffer: Buffer,
  mimeType: string,
  entityType: 'usuarios' | 'ninos',
  entityId: string,
  fileExtension: string
): Promise<DriveUploadResult> {
  const drive = createDriveUploadClient();
  const fotosFolderId = getFotosFolderId();

  // Create folder structure: FOTOS / {entityType} / {entityId}
  const typeFolderId = await getOrCreateFolder(drive, entityType, fotosFolderId);
  const entityFolderId = await getOrCreateFolder(drive, entityId, typeFolderId);

  const fileName = `perfil.${fileExtension}`;

  // Delete previous photo if exists (upsert)
  const existingFileId = await findFileInFolder(drive, fileName, entityFolderId);
  if (existingFileId) {
    try {
      await deleteFromDrive(drive, existingFileId);
    } catch (e) {
      // If deletion fails, we'll just upload alongside — not critical
      console.warn('Could not delete previous photo:', e);
    }
  }

  // Upload
  const { fileId, webViewLink } = await uploadToDrive(
    drive,
    buffer,
    fileName,
    mimeType,
    entityFolderId
  );

  // Make public so it can be displayed in <img> tags
  await makePublic(drive, fileId);

  return {
    fileId,
    url: getDirectImageUrl(fileId),
    webViewLink,
  };
}

/**
 * Upload an AUDIO file to Google Drive.
 * Structure: AUDIOS / entrevistas / {ninoId} / entrevista_{ninoId}_{timestamp}.webm
 *
 * Audio files stay PRIVATE — returns webViewLink for access.
 */
export async function uploadAudio(
  buffer: Buffer,
  mimeType: string,
  ninoId: string,
  fileName: string
): Promise<DriveUploadResult> {
  const drive = createDriveUploadClient();
  const audiosFolderId = getAudiosFolderId();

  // Create folder structure: AUDIOS / entrevistas / {ninoId}
  const entrevistasFolderId = await getOrCreateFolder(drive, 'entrevistas', audiosFolderId);
  const ninoFolderId = await getOrCreateFolder(drive, ninoId, entrevistasFolderId);

  const { fileId, webViewLink } = await uploadToDrive(
    drive,
    buffer,
    fileName,
    mimeType,
    ninoFolderId
  );

  // Audio stays private — no makePublic call

  return {
    fileId,
    url: webViewLink,
    webViewLink,
  };
}

/**
 * Upload a GENERIC file to Google Drive (for any bucket/path pattern).
 * Used by the generic /api/storage/upload endpoint.
 *
 * Maps the old Supabase bucket/path to Drive folder structure.
 */
export async function uploadGenericFile(
  buffer: Buffer,
  mimeType: string,
  bucket: string,
  path: string,
  makeFilePublic: boolean = true
): Promise<DriveUploadResult> {
  const drive = createDriveUploadClient();

  // Determine root folder based on old bucket name
  let rootFolderId: string;
  if (bucket === 'fotos-perfil') {
    rootFolderId = getFotosFolderId();
  } else if (bucket === 'audios-entrevistas') {
    rootFolderId = getAudiosFolderId();
  } else {
    // Fallback: use main Drive folder
    rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    if (!rootFolderId) throw new Error('Falta GOOGLE_DRIVE_FOLDER_ID en .env.local');
  }

  // Parse path segments to create folder structure
  // e.g. "ninos/{id}/perfil.jpg" → folders: ninos, {id}; file: perfil.jpg
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop()!;
  
  // Create nested folders
  let currentFolderId = rootFolderId;
  for (const segment of segments) {
    currentFolderId = await getOrCreateFolder(drive, segment, currentFolderId);
  }

  // Delete previous file with same name if exists (upsert)
  const existingFileId = await findFileInFolder(drive, fileName, currentFolderId);
  if (existingFileId) {
    try {
      await deleteFromDrive(drive, existingFileId);
    } catch (e) {
      console.warn('Could not delete previous file:', e);
    }
  }

  // Upload
  const { fileId, webViewLink } = await uploadToDrive(
    drive,
    buffer,
    fileName,
    mimeType,
    currentFolderId
  );

  if (makeFilePublic) {
    await makePublic(drive, fileId);
  }

  return {
    fileId,
    url: makeFilePublic ? getDirectImageUrl(fileId) : webViewLink,
    webViewLink,
  };
}

/**
 * Delete an audio file from Drive by fileId.
 */
export async function deleteAudioFromDrive(fileId: string): Promise<void> {
  const drive = createDriveUploadClient();
  await deleteFromDrive(drive, fileId);
}

/**
 * Extract Drive file ID from various URL formats:
 * - https://lh3.googleusercontent.com/d/FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - Plain FILE_ID string
 */
export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  // Direct image URL
  const lh3Match = urlOrId.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return lh3Match[1];

  // Drive file URL
  const driveMatch = urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return driveMatch[1];

  // URL with id param
  const idMatch = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // Already a plain ID (no slashes, no dots)
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && urlOrId.length > 10) return urlOrId;

  return null;
}
