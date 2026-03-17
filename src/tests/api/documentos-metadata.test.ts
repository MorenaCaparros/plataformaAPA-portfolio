/**
 * Tests para POST /api/documentos/metadata
 * Extracción de metadata de documentos (cookie-based server)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSupabase: Record<string, any> = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock document processor
const mockProcessDocument = vi.fn();
const mockExtractMetadata = vi.fn();

vi.mock('@/lib/ia/document-processor', () => ({
  processDocument: (...args: unknown[]) => mockProcessDocument(...args),
  extractMetadata: (...args: unknown[]) => mockExtractMetadata(...args),
}));

import { POST } from '@/app/api/documentos/metadata/route';

function createMetadataRequest(file?: { name: string; type: string; content: string }): NextRequest {
  const formData = new FormData();
  if (file) {
    const blob = new Blob([file.content], { type: file.type });
    formData.append('file', blob, file.name);
  }

  return new NextRequest(new URL('/api/documentos/metadata', 'http://localhost:3000'), {
    method: 'POST',
    body: formData,
  } as never);
}

describe('POST /api/documentos/metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@test.com' } },
      error: null,
    });
  });

  it('retorna 401 si no hay usuario autenticado', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = createMetadataRequest({ name: 'doc.pdf', type: 'application/pdf', content: 'content' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 si no se envía archivo', async () => {
    const req = createMetadataRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('archivo');
  });

  it('retorna metadata null si texto es muy corto', async () => {
    mockProcessDocument.mockResolvedValue('ab'); // < 100 chars

    const req = createMetadataRequest({ name: 'short.pdf', type: 'application/pdf', content: 'x' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.metadata.titulo).toBeNull();
    expect(json.metadata.autor).toBeNull();
  });

  it('extrae metadata con IA exitosamente', async () => {
    mockProcessDocument.mockResolvedValue('A'.repeat(200));
    mockExtractMetadata.mockResolvedValue({
      titulo: 'Manual de Alfabetización',
      autor: 'Dr. García',
    });

    const req = createMetadataRequest({ name: 'manual.pdf', type: 'application/pdf', content: 'data' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.metadata.titulo).toBe('Manual de Alfabetización');
    expect(json.metadata.autor).toBe('Dr. García');
  });

  it('retorna metadata null si hay error en procesamiento', async () => {
    mockProcessDocument.mockRejectedValue(new Error('Processing failed'));

    const req = createMetadataRequest({ name: 'bad.pdf', type: 'application/pdf', content: 'data' });
    const res = await POST(req);
    // Route returns 200 with null metadata on error (never HTML)
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.metadata.titulo).toBeNull();
    expect(json.metadata.autor).toBeNull();
  });
});
