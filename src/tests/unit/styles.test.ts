/**
 * Tests para src/lib/constants/styles.ts
 * Verifica que las constantes de estilos Tailwind se exportan correctamente
 * y contienen las clases esperadas.
 */
import { describe, it, expect } from 'vitest';
import {
  inputClass,
  inputClassLg,
  inputClassGlass,
  inputClassGlassSm,
  labelClass,
  labelClassMd,
  cardClass,
  cardClassLg,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from '@/lib/constants/styles';

describe('Constantes de estilos', () => {
  describe('Inputs', () => {
    it('inputClass incluye w-full, border, rounded-xl, font-outfit', () => {
      expect(inputClass).toContain('w-full');
      expect(inputClass).toContain('border');
      expect(inputClass).toContain('rounded-xl');
      expect(inputClass).toContain('font-outfit');
    });

    it('inputClassLg tiene texto más grande (text-base)', () => {
      expect(inputClassLg).toContain('text-base');
      expect(inputClassLg).toContain('py-3');
    });

    it('inputClassGlass tiene fondo translúcido y min-h-[48px]', () => {
      expect(inputClassGlass).toContain('bg-white/80');
      expect(inputClassGlass).toContain('min-h-[48px]');
      expect(inputClassGlass).toContain('rounded-2xl');
    });

    it('inputClassGlassSm tiene min-h-[44px] y text-sm', () => {
      expect(inputClassGlassSm).toContain('min-h-[44px]');
      expect(inputClassGlassSm).toContain('text-sm');
    });
  });

  describe('Labels', () => {
    it('labelClass es text-xs con font-outfit', () => {
      expect(labelClass).toContain('text-xs');
      expect(labelClass).toContain('font-outfit');
    });

    it('labelClassMd es text-sm', () => {
      expect(labelClassMd).toContain('text-sm');
      expect(labelClassMd).toContain('font-medium');
    });
  });

  describe('Cards', () => {
    it('cardClass tiene glassmorphism (bg-white/60 backdrop-blur)', () => {
      expect(cardClass).toContain('bg-white/60');
      expect(cardClass).toContain('backdrop-blur');
      expect(cardClass).toContain('rounded-2xl');
    });

    it('cardClassLg tiene rounded más grande (3xl)', () => {
      expect(cardClassLg).toContain('rounded-3xl');
      expect(cardClassLg).toContain('backdrop-blur');
    });
  });

  describe('Botones', () => {
    it('btnPrimary tiene gradiente crecimiento y min-h-[48px]', () => {
      expect(btnPrimary).toContain('bg-gradient-to-r');
      expect(btnPrimary).toContain('crecimiento');
      expect(btnPrimary).toContain('min-h-[48px]');
      expect(btnPrimary).toContain('text-white');
    });

    it('btnSecondary tiene fondo blanco translúcido y min-h-[44px]', () => {
      expect(btnSecondary).toContain('bg-white/80');
      expect(btnSecondary).toContain('min-h-[44px]');
    });

    it('btnDanger es rojo (impulso)', () => {
      expect(btnDanger).toContain('impulso-500');
      expect(btnDanger).toContain('text-white');
    });

    it('todos los botones tienen font-outfit y transition-all', () => {
      for (const btn of [btnPrimary, btnSecondary, btnDanger]) {
        expect(btn).toContain('font-outfit');
        expect(btn).toContain('transition-all');
      }
    });

    it('todos los botones tienen active:scale-95 (feedback táctil)', () => {
      for (const btn of [btnPrimary, btnSecondary, btnDanger]) {
        expect(btn).toContain('active:scale-95');
      }
    });
  });

  describe('Todas las constantes son strings no vacíos', () => {
    const allStyles = {
      inputClass,
      inputClassLg,
      inputClassGlass,
      inputClassGlassSm,
      labelClass,
      labelClassMd,
      cardClass,
      cardClassLg,
      btnPrimary,
      btnSecondary,
      btnDanger,
    };

    for (const [name, value] of Object.entries(allStyles)) {
      it(`${name} es un string no vacío`, () => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(10);
      });
    }
  });
});
