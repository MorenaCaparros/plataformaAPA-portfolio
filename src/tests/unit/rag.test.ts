/**
 * Tests para src/lib/ia/rag.ts
 * Función pura: formatSearchResultsForPrompt
 */
import { describe, it, expect } from 'vitest';
import { formatSearchResultsForPrompt } from '@/lib/ia/rag';

describe('formatSearchResultsForPrompt', () => {
  it('retorna mensaje de "no encontrados" si results está vacío', () => {
    const result = formatSearchResultsForPrompt([]);
    expect(result).toContain('No se encontraron documentos relevantes');
  });

  it('formatea un solo resultado con título, autor y texto', () => {
    const results = [
      {
        texto: 'Contenido del fragmento aquí.',
        documento: { titulo: 'Guía de Alfabetización', autor: 'María López' },
      },
    ];
    const formatted = formatSearchResultsForPrompt(results);

    expect(formatted).toContain('Documento 1');
    expect(formatted).toContain('Guía de Alfabetización');
    expect(formatted).toContain('María López');
    expect(formatted).toContain('Contenido del fragmento aquí.');
  });

  it('formatea múltiples resultados con numeración consecutiva', () => {
    const results = [
      {
        texto: 'Fragmento 1',
        documento: { titulo: 'Doc A', autor: 'Autor A' },
      },
      {
        texto: 'Fragmento 2',
        documento: { titulo: 'Doc B', autor: 'Autor B' },
      },
      {
        texto: 'Fragmento 3',
        documento: { titulo: 'Doc C', autor: 'Autor C' },
      },
    ];
    const formatted = formatSearchResultsForPrompt(results);

    expect(formatted).toContain('Documento 1');
    expect(formatted).toContain('Documento 2');
    expect(formatted).toContain('Documento 3');
    expect(formatted).toContain('Doc A');
    expect(formatted).toContain('Doc B');
    expect(formatted).toContain('Doc C');
  });

  it('incluye separadores (---) entre resultados', () => {
    const results = [
      { texto: 'A', documento: { titulo: 'T1', autor: 'A1' } },
      { texto: 'B', documento: { titulo: 'T2', autor: 'A2' } },
    ];
    const formatted = formatSearchResultsForPrompt(results);
    expect(formatted).toContain('---');
  });

  it('el resultado es un string no vacío para cualquier entrada con datos', () => {
    const results = [
      { texto: 'x', documento: { titulo: 'y', autor: 'z' } },
    ];
    const formatted = formatSearchResultsForPrompt(results);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
