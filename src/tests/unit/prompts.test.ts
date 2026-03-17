/**
 * Tests para src/lib/ia/prompts.ts
 * Verifica que los prompts contienen las instrucciones y placeholders correctos.
 */
import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT_PSICOPEDAGOGIA,
  PROMPT_RESUMEN_SEMANAL,
  PROMPT_ANALISIS_SESION,
  PROMPT_CHAT_BIBLIOTECA,
  PROMPT_DETECCION_PATRONES,
} from '@/lib/ia/prompts';

describe('Prompts de IA', () => {
  const ALL_PROMPTS = {
    SYSTEM_PROMPT_PSICOPEDAGOGIA,
    PROMPT_RESUMEN_SEMANAL,
    PROMPT_ANALISIS_SESION,
    PROMPT_CHAT_BIBLIOTECA,
    PROMPT_DETECCION_PATRONES,
  };

  describe('Todos los prompts son válidos', () => {
    for (const [name, prompt] of Object.entries(ALL_PROMPTS)) {
      it(`${name} es un string no vacío (>100 chars)`, () => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
      });
    }
  });

  describe('SYSTEM_PROMPT_PSICOPEDAGOGIA', () => {
    it('incluye restricción de NO diagnósticos clínicos', () => {
      expect(SYSTEM_PROMPT_PSICOPEDAGOGIA).toMatch(/NUNCA.*diagnósticos?\s*clínicos?/i);
    });

    it('menciona alfabetización', () => {
      expect(SYSTEM_PROMPT_PSICOPEDAGOGIA).toContain('alfabetización');
    });

    it('requiere citar fuentes bibliográficas', () => {
      expect(SYSTEM_PROMPT_PSICOPEDAGOGIA).toMatch(/cita.*fuentes|fuentes.*cita/i);
    });

    it('tiene instrucciones de lenguaje empático', () => {
      expect(SYSTEM_PROMPT_PSICOPEDAGOGIA).toMatch(/empátic/i);
    });
  });

  describe('PROMPT_RESUMEN_SEMANAL', () => {
    it('tiene placeholders {perfil_json}, {sesiones_json}, {fragmentos_rag}', () => {
      expect(PROMPT_RESUMEN_SEMANAL).toContain('{perfil_json}');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('{sesiones_json}');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('{fragmentos_rag}');
    });

    it('pide 5 secciones: observaciones, patrones, fortalezas, áreas, sugerencias', () => {
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Observaciones Destacadas');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Patrones Identificados');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Fortalezas');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Áreas de Atención');
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Sugerencias');
    });

    it('requiere referencias: (Ref: [Título])', () => {
      expect(PROMPT_RESUMEN_SEMANAL).toContain('Ref:');
    });
  });

  describe('PROMPT_ANALISIS_SESION', () => {
    it('acepta {pregunta_especifica} del usuario', () => {
      expect(PROMPT_ANALISIS_SESION).toContain('{pregunta_especifica}');
    });

    it('tiene placeholders de contexto: perfil, sesiones, rag', () => {
      expect(PROMPT_ANALISIS_SESION).toContain('{perfil_json}');
      expect(PROMPT_ANALISIS_SESION).toContain('{sesiones_json}');
      expect(PROMPT_ANALISIS_SESION).toContain('{fragmentos_rag}');
    });

    it('NO permite diagnósticos clínicos', () => {
      expect(PROMPT_ANALISIS_SESION).toMatch(/NUNCA.*diagnósticos?\s*clínicos?/i);
    });
  });

  describe('PROMPT_CHAT_BIBLIOTECA', () => {
    it('define rol de asistente bibliográfico', () => {
      expect(PROMPT_CHAT_BIBLIOTECA).toContain('biblioteca');
    });

    it('requiere formato con referencias (Ref:)', () => {
      expect(PROMPT_CHAT_BIBLIOTECA).toMatch(/cita.*fuentes|Ref:/i);
    });

    it('tiene 5 capacidades numeradas', () => {
      expect(PROMPT_CHAT_BIBLIOTECA).toContain('1.');
      expect(PROMPT_CHAT_BIBLIOTECA).toContain('5.');
    });
  });

  describe('PROMPT_DETECCION_PATRONES', () => {
    it('tiene placeholder {todas_sesiones_json}', () => {
      expect(PROMPT_DETECCION_PATRONES).toContain('{todas_sesiones_json}');
    });

    it('identifica tendencias temporales, emocionales, fortalezas', () => {
      expect(PROMPT_DETECCION_PATRONES).toContain('Tendencias Temporales');
      expect(PROMPT_DETECCION_PATRONES).toContain('Patrones Emocionales');
      expect(PROMPT_DETECCION_PATRONES).toContain('Fortaleza');
    });

    it('incluye recomendaciones estratégicas', () => {
      expect(PROMPT_DETECCION_PATRONES).toContain('Recomendaciones Estratégicas');
    });
  });
});
