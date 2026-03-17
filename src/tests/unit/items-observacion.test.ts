import { describe, it, expect } from 'vitest';
import {
  ITEMS_OBSERVACION,
  CATEGORIAS_LABELS,
  VALOR_NO_COMPLETADO,
  calcularPromedioItems,
  contarItemsCompletados,
  type Categoria,
} from '@/lib/constants/items-observacion';

// ────────────────────────────────────────────────────────────────────────────
// calcularPromedioItems
// ────────────────────────────────────────────────────────────────────────────
describe('calcularPromedioItems', () => {
  it('retorna 0 si el array está vacío', () => {
    expect(calcularPromedioItems([])).toBe(0);
  });

  it('excluye ítems con valor N/C (0) del promedio', () => {
    const items = [
      { valor: 4 },
      { valor: VALOR_NO_COMPLETADO }, // N/C
      { valor: 2 },
    ];
    // Promedio de [4, 2] = 3.0
    expect(calcularPromedioItems(items)).toBe(3.0);
  });

  it('retorna 0 si todos los ítems son N/C', () => {
    const items = [
      { valor: VALOR_NO_COMPLETADO },
      { valor: VALOR_NO_COMPLETADO },
    ];
    expect(calcularPromedioItems(items)).toBe(0);
  });

  it('calcula el promedio correcto con valores normales 1-5', () => {
    const items = [{ valor: 1 }, { valor: 3 }, { valor: 5 }];
    // (1+3+5)/3 = 3.0
    expect(calcularPromedioItems(items)).toBe(3.0);
  });

  it('redondea el promedio a 1 decimal', () => {
    const items = [{ valor: 1 }, { valor: 2 }];
    // (1+2)/3 ≠ entero. (1+2)/2 = 1.5
    expect(calcularPromedioItems(items)).toBe(1.5);
  });

  it('redondea correctamente cuando el resultado no es exacto', () => {
    const items = [{ valor: 1 }, { valor: 2 }, { valor: 3 }];
    // (1+2+3)/3 = 2.0
    expect(calcularPromedioItems(items)).toBe(2.0);
  });

  it('maneja un solo ítem correctamente', () => {
    expect(calcularPromedioItems([{ valor: 4 }])).toBe(4.0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// contarItemsCompletados
// ────────────────────────────────────────────────────────────────────────────
describe('contarItemsCompletados', () => {
  it('retorna ceros para array vacío', () => {
    expect(contarItemsCompletados([])).toEqual({ completados: 0, noCompletados: 0, total: 0 });
  });

  it('cuenta correctamente en un array mixto', () => {
    const items = [
      { valor: 3 },
      { valor: VALOR_NO_COMPLETADO },
      { valor: 5 },
      { valor: VALOR_NO_COMPLETADO },
      { valor: 1 },
    ];
    expect(contarItemsCompletados(items)).toEqual({
      completados: 3,
      noCompletados: 2,
      total: 5,
    });
  });

  it('todos completados', () => {
    const items = [{ valor: 1 }, { valor: 3 }, { valor: 5 }];
    expect(contarItemsCompletados(items)).toEqual({ completados: 3, noCompletados: 0, total: 3 });
  });

  it('ninguno completado (todos N/C)', () => {
    const items = [{ valor: 0 }, { valor: 0 }];
    expect(contarItemsCompletados(items)).toEqual({ completados: 0, noCompletados: 2, total: 2 });
  });

  it('total siempre es completados + noCompletados', () => {
    const items = [{ valor: 2 }, { valor: 0 }, { valor: 4 }, { valor: 0 }, { valor: 0 }];
    const resultado = contarItemsCompletados(items);
    expect(resultado.completados + resultado.noCompletados).toBe(resultado.total);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ITEMS_OBSERVACION — validación de integridad del catálogo
// ────────────────────────────────────────────────────────────────────────────
describe('ITEMS_OBSERVACION — integridad del catálogo', () => {
  it('tiene exactamente 37 ítems', () => {
    expect(ITEMS_OBSERVACION).toHaveLength(37);
  });

  it('no tiene IDs duplicados', () => {
    const ids = ITEMS_OBSERVACION.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('todos los ítems tienen id, categoria y texto', () => {
    for (const item of ITEMS_OBSERVACION) {
      expect(item.id).toBeTruthy();
      expect(item.categoria).toBeTruthy();
      expect(item.texto).toBeTruthy();
    }
  });

  it('todas las categorías de los ítems están definidas en CATEGORIAS_LABELS', () => {
    const categoriesValidas = Object.keys(CATEGORIAS_LABELS) as Categoria[];
    for (const item of ITEMS_OBSERVACION) {
      expect(categoriesValidas).toContain(item.categoria);
    }
  });

  it('existen todas las 7 categorías esperadas', () => {
    const expected: Categoria[] = [
      'atencion_concentracion',
      'conducta_comportamiento',
      'respuesta_emocional',
      'lectura_escritura',
      'matematica_logica',
      'interaccion_voluntario',
      'contexto_observado',
    ];
    for (const cat of expected) {
      expect(Object.keys(CATEGORIAS_LABELS)).toContain(cat);
    }
  });

  it('cada categoría tiene al menos un ítem', () => {
    const categorias = Object.keys(CATEGORIAS_LABELS) as Categoria[];
    for (const cat of categorias) {
      const itemsDeCategoria = ITEMS_OBSERVACION.filter((i) => i.categoria === cat);
      expect(itemsDeCategoria.length).toBeGreaterThan(0);
    }
  });
});
