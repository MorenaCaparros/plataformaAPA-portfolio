/**
 * Tests para POST /api/storage/upload
 * Upload genérico de archivos (Bearer + Google Drive)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseChain } from '../helpers/api-helpers';
import { NextRequest } from 'next/server';

// vi.hoisted runs before vi.mock — safe for top-level module const
const mockAdmin = vi.hoisted(() => {
  const chainMethods = ['select','insert','update','delete','upsert','eq','neq','in','gte','lte','gt','lt','order','limit','range','is','not','or','ilike'];
  function makeChain(data: any = null, err: any = null) {
    const c: any = {};
    chainMethods.forEach(m => { c[m] = vi.fn().mockReturnValue(c); });
    c.single = vi.fn().mockResolvedValue({ data, error: err });
    c.maybeSingle = vi.fn().mockResolvedValue({ data, error: err });
    c.then = vi.fn((resolve: any) => resolve({ data, error: err }));
    return c;
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@test.com' } }, error: null }),
    },
    from: vi.fn((_table: string) => makeChain()),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdmin),
}));

// Mock Google Drive upload
vi.mock('@/lib/google/drive-storage', () => ({
  uploadGenericFile: vi.fn().mockResolvedValue({
    url: 'https://drive.google.com/file/test',
    fileId: 'drive-file-id',
  }),
}));

import { POST } from '@/app/api/storage/upload/route';

function createFormDataRequest(
  searchParams: Record<string, string>,
  file?: { name: string; type: string; content: string },
  token = 'test-token-123'
): NextRequest {
  const url = new URL('/api/storage/upload', 'http://localhost:3000');
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }

  const formData = new FormData();
  if (file) {
    const blob = new Blob([file.content], { type: file.type });
    formData.append('file', blob, file.name);
  }

  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: formData,
  } as never);
}

describe('POST /api/storage/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@test.com' } },
      error: null,
    });
  });

  it('retorna 401 sin token de autorización', async () => {
    const req = createFormDataRequest({ path: 'test/file.jpg' }, undefined, '');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 si falta parámetro path', async () => {
    const req = createFormDataRequest(
      {},
      { name: 'test.jpg', type: 'image/jpeg', content: 'data' }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('path');
  });

  it('retorna 400 si no se envía archivo', async () => {
    const req = createFormDataRequest({ path: 'test/file.jpg' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('archivo');
  });

  it('retorna 400 para tipo MIME no permitido', async () => {
    const req = createFormDataRequest(
      { path: 'test/file.exe', bucket: 'fotos-perfil' },
      { name: 'malware.exe', type: 'application/x-msdownload', content: 'data' }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('no permitido');
  });

  it('sube archivo exitosamente a Google Drive', async () => {
    const req = createFormDataRequest(
      { path: 'ninos/1/perfil.jpg', bucket: 'fotos-perfil' },
      { name: 'perfil.jpg', type: 'image/jpeg', content: 'imagedata' }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://drive.google.com/file/test');
    expect(json.fileId).toBe('drive-file-id');
  });

  it('actualiza tabla de DB si se provee table, id y column', async () => {
    const updateChain = createSupabaseChain(null);
    mockAdmin.from.mockReturnValue(updateChain);

    const req = createFormDataRequest(
      { path: 'ninos/1/perfil.jpg', table: 'ninos', id: 'nino-1', column: 'foto_perfil_url' },
      { name: 'perfil.jpg', type: 'image/jpeg', content: 'imagedata' }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith('ninos');
  });
});
