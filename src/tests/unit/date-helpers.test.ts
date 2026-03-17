import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcularEdad, formatearEdad } from '@/lib/utils/date-helpers';

// ────────────────────────────────────────────────────────────────────────────
// calcularEdad
// ────────────────────────────────────────────────────────────────────────────
describe('calcularEdad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null si la fecha de nacimiento es null', () => {
    expect(calcularEdad(null)).toBeNull();
  });

  it('calcula la edad correctamente cuando ya cumplió años', () => {
    // Fijar la fecha de "hoy" para que el test sea determinista
    vi.setSystemTime(new Date('2026-06-15'));

    // Nació el 10 de enero de 2015 → ya cumplió en 2026 → 11 años
    expect(calcularEdad('2015-01-10')).toBe(11);
  });

  it('no suma un año si aún no cumplió este año', () => {
    vi.setSystemTime(new Date('2026-03-01'));

    // Nació el 15 de octubre de 2016 → todavía no cumplió en 2026 → 9 años
    expect(calcularEdad('2016-10-15')).toBe(9);
  });

  it('el mismo día del cumpleaños cuenta como cumpleaños', () => {
    vi.setSystemTime(new Date('2026-05-20'));

    // Exactamente cumpleaños → 8 años
    expect(calcularEdad('2018-05-20')).toBe(8);
  });

  it('retorna 0 para un bebé de menos de un año', () => {
    vi.setSystemTime(new Date('2026-03-02'));

    expect(calcularEdad('2025-10-01')).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatearEdad
// ────────────────────────────────────────────────────────────────────────────
describe('formatearEdad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra "X años" cuando hay fecha de nacimiento', () => {
    // 2015-01-10 → 11 años en junio 2026
    expect(formatearEdad('2015-01-10', '11-13')).toBe('11 años');
  });

  it('usa el rango etario como fallback si no hay fecha', () => {
    expect(formatearEdad(null, '8-10')).toBe('8-10 años');
  });

  it('muestra "Edad no especificada" si no hay fecha ni rango', () => {
    expect(formatearEdad(null, null)).toBe('Edad no especificada');
  });

  it('prioriza la fecha de nacimiento sobre el rango etario', () => {
    // Si hay fecha, ignora el rango
    expect(formatearEdad('2014-01-01', '99-99')).not.toBe('99-99 años');
  });
});
