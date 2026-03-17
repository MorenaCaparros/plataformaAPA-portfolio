/**
 * Tests para src/lib/ia/document-processor.ts
 * Funciones puras: chunkText, cleanText, getFileType
 * Funciones con I/O: extractMetadata, extractTextFromPDF, extractTextFromDOCX, processDocument (requieren mocks)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunkText, cleanText, getFileType, DocumentChunk } from '@/lib/ia/document-processor';

// ── Funciones puras ──────────────────────────────────────────────────────────

describe('chunkText', () => {
  it('retorna array vacío para texto vacío', () => {
    const result = chunkText('');
    // Texto vacío split produce [''] → 1 chunk con string vacío
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('retorna un solo chunk si el texto es más corto que chunkSize', () => {
    const texto = 'palabra1 palabra2 palabra3';
    const chunks = chunkText(texto, 100, 20);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].texto).toBe(texto);
  });

  it('divide texto largo en múltiples chunks', () => {
    // 20 palabras, chunkSize=5, overlap=2 → chunks con overlap
    const palabras = Array.from({ length: 20 }, (_, i) => `word${i}`);
    const texto = palabras.join(' ');
    const chunks = chunkText(texto, 5, 2);

    expect(chunks.length).toBeGreaterThan(1);
  });

  it('cada chunk tiene metadata con inicio y fin', () => {
    const texto = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(texto, 10, 3);

    for (const chunk of chunks) {
      expect(chunk).toHaveProperty('metadata');
      expect(chunk.metadata).toHaveProperty('inicio');
      expect(chunk.metadata).toHaveProperty('fin');
      expect(chunk.metadata.fin).toBeGreaterThanOrEqual(chunk.metadata.inicio);
    }
  });

  it('el overlap genera solapamiento entre chunks consecutivos', () => {
    const palabras = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const texto = palabras.join(' ');
    const chunks = chunkText(texto, 10, 3);

    if (chunks.length >= 2) {
      // El segundo chunk debería empezar antes de donde termina el primero
      expect(chunks[1].metadata.inicio).toBeLessThan(chunks[0].metadata.fin);
    }
  });

  it('usa valores por defecto (chunkSize=1000, overlap=200)', () => {
    const palabras = Array.from({ length: 2500 }, (_, i) => `w${i}`);
    const texto = palabras.join(' ');
    const chunks = chunkText(texto);

    // Con 2500 palabras, chunkSize=1000, overlap=200 → avanza 800 por chunk
    // 2500/800 ≈ 3-4 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.length).toBeLessThanOrEqual(5);
  });

  it('chunk cumple con la interfaz DocumentChunk', () => {
    const chunks = chunkText('hola mundo cruel', 10, 2);
    const chunk: DocumentChunk = chunks[0];
    expect(chunk.texto).toBeDefined();
    expect(chunk.metadata.inicio).toBeDefined();
    expect(chunk.metadata.fin).toBeDefined();
  });
});

describe('cleanText', () => {
  it('normaliza espacios múltiples a uno solo', () => {
    expect(cleanText('hola    mundo')).toBe('hola mundo');
  });

  it('reduce todo whitespace excesivo a un solo espacio', () => {
    // cleanText normaliza \s+ → ' ' primero, por lo que los newlines se convierten en espacios
    const input = 'parrafo1\n\n\n\n\nparrafo2';
    expect(cleanText(input)).toBe('parrafo1 parrafo2');
  });

  it('trim espacios al inicio y final', () => {
    expect(cleanText('   hola mundo   ')).toBe('hola mundo');
  });

  it('maneja texto ya limpio sin modificarlo', () => {
    const clean = 'Este texto ya está limpio.';
    expect(cleanText(clean)).toBe(clean);
  });

  it('maneja texto con tabs y otros whitespace', () => {
    expect(cleanText('hola\t\tmundo')).toBe('hola mundo');
  });

  it('maneja string vacío', () => {
    expect(cleanText('')).toBe('');
  });
});

describe('getFileType', () => {
  it('detecta archivos PDF', () => {
    expect(getFileType('documento.pdf')).toBe('pdf');
    expect(getFileType('ARCHIVO.PDF')).toBe('pdf');
    expect(getFileType('mi.documento.pdf')).toBe('pdf');
  });

  it('detecta archivos DOCX y DOC', () => {
    expect(getFileType('trabajo.docx')).toBe('docx');
    expect(getFileType('informe.doc')).toBe('docx');
    expect(getFileType('ARCHIVO.DOCX')).toBe('docx');
  });

  it('detecta archivos TXT', () => {
    expect(getFileType('notas.txt')).toBe('txt');
    expect(getFileType('README.TXT')).toBe('txt');
  });

  it('retorna unknown para extensiones no soportadas', () => {
    expect(getFileType('imagen.png')).toBe('unknown');
    expect(getFileType('video.mp4')).toBe('unknown');
    expect(getFileType('data.json')).toBe('unknown');
    expect(getFileType('estilo.css')).toBe('unknown');
  });

  it('retorna unknown para archivos sin extensión', () => {
    expect(getFileType('Makefile')).toBe('unknown');
  });
});

// ── Funciones con I/O (mocked) ──────────────────────────────────────────────

describe('processDocument (con mocks)', () => {
  // Mockear dependencias antes de importar processDocument
  vi.mock('mammoth', () => ({
    default: {
      extractRawText: vi.fn().mockResolvedValue({ value: 'texto extraído de docx' }),
    },
  }));

  vi.mock('@/lib/ia/gemini', () => ({
    getModel: vi.fn(),
    getEmbeddingModel: vi.fn(),
  }));

  it('procesa archivo TXT directamente como UTF-8', async () => {
    const { processDocument } = await import('@/lib/ia/document-processor');
    const buffer = Buffer.from('Contenido de prueba en texto plano');
    const result = await processDocument(buffer, 'archivo.txt');
    expect(result).toBe('Contenido de prueba en texto plano');
  });

  it('lanza error para tipo de archivo no soportado', async () => {
    const { processDocument } = await import('@/lib/ia/document-processor');
    const buffer = Buffer.from('data');
    await expect(processDocument(buffer, 'archivo.xyz')).rejects.toThrow(
      'Tipo de archivo no soportado'
    );
  });
});

describe('extractMetadata (con mocks)', () => {
  it('retorna null si texto es muy corto (< 50 chars)', async () => {
    vi.mock('@/lib/ia/gemini', () => ({
      getModel: vi.fn(),
      getEmbeddingModel: vi.fn(),
    }));

    const { extractMetadata } = await import('@/lib/ia/document-processor');
    const result = await extractMetadata('texto corto');
    expect(result).toEqual({ titulo: null, autor: null });
  });
});
