/**
 * Tests para POST/DELETE /api/trabajo-social/audio
 * Subida y eliminación de audio de entrevistas (SSR cookie + Google Drive)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseChain } from '../helpers/api-helpers';

const mockSupabase: Record<string, any> = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

// Mock @supabase/ssr (this route uses createServerClient)
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
    set: vi.fn(),
  })),
}));

// Mock Google Drive functions
const mockUploadAudio = vi.fn().mockResolvedValue({
  url: 'https://drive.google.com/audio/test',
  fileId: 'audio-drive-id',
});
const mockDeleteAudioFromDrive = vi.fn().mockResolvedValue(undefined);
const mockExtractDriveFileId = vi.fn((path: string) => path || null);

vi.mock('@/lib/google/drive-storage', () => ({
  uploadAudio: (...args: unknown[]) => mockUploadAudio(...args),
  deleteAudioFromDrive: (...args: unknown[]) => mockDeleteAudioFromDrive(...args),
  extractDriveFileId: (path: string) => mockExtractDriveFileId(path),
}));

import { POST, DELETE } from '@/app/api/trabajo-social/audio/route';

function createAudioFormRequest(fields: Record<string, string>, audioContent = 'audio-data'): Request {
  const formData = new FormData();
  const blob = new Blob([audioContent], { type: 'audio/webm' });
  formData.append('audio', blob, 'recording.webm');
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, v);
  }
  return new Request('http://localhost:3000/api/trabajo-social/audio', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/trabajo-social/audio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'ts-1' } } },
    });
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ rol: 'trabajo_social' })
    );
  });

  it('retorna 401 si no hay sesión', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const req = createAudioFormRequest({ nino_id: 'nino-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 si rol no autorizado', async () => {
    mockSupabase.from.mockImplementation(() =>
      createSupabaseChain({ rol: 'voluntario' })
    );

    const req = createAudioFormRequest({ nino_id: 'nino-1' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 si no se provee audio', async () => {
    const formData = new FormData();
    formData.append('nino_id', 'nino-1');
    const req = new Request('http://localhost:3000/api/trabajo-social/audio', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('audio');
  });

  it('retorna 400 si falta nino_id', async () => {
    const formData = new FormData();
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    formData.append('audio', blob, 'test.webm');
    const req = new Request('http://localhost:3000/api/trabajo-social/audio', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('niño');
  });

  it('sube audio exitosamente a Google Drive', async () => {
    const req = createAudioFormRequest({ nino_id: 'nino-1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.audio_url).toBe('https://drive.google.com/audio/test');
    expect(json.fileId).toBe('audio-drive-id');
  });
});

describe('DELETE /api/trabajo-social/audio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'ts-1' } } },
    });
  });

  it('retorna 401 si no hay sesión', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const req = new Request('http://localhost:3000/api/trabajo-social/audio?fileId=abc', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 si falta fileId', async () => {
    mockExtractDriveFileId.mockReturnValue(null);

    const req = new Request('http://localhost:3000/api/trabajo-social/audio', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('fileId');
  });

  it('elimina audio exitosamente', async () => {
    const req = new Request('http://localhost:3000/api/trabajo-social/audio?fileId=drive-123', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDeleteAudioFromDrive).toHaveBeenCalledWith('drive-123');
  });
});
