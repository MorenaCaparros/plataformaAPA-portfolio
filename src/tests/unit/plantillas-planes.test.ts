import { describe, it, expect } from 'vitest';
import {
  PLANTILLAS_PLANES,
  getPlantillasPorArea,
  getPlantillaById,
  type PlantillaPlan,
} from '@/lib/constants/plantillas-planes';

const AREAS_ESPERADAS = [
  'lenguaje_vocabulario',
  'grafismo_motricidad',
  'lectura_escritura',
  'nociones_matematicas',
  'socioemocional',
  'general',
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Integridad del catálogo
// ────────────────────────────────────────────────────────────────────────────
describe('PLANTILLAS_PLANES — integridad del catálogo', () => {
  it('tiene exactamente 12 plantillas', () => {
    expect(PLANTILLAS_PLANES).toHaveLength(12);
  });

  it('no tiene IDs duplicados', () => {
    const ids = PLANTILLAS_PLANES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre exactamente 6 áreas distintas', () => {
    const areas = [...new Set(PLANTILLAS_PLANES.map((p) => p.area))];
    expect(areas).toHaveLength(6);
  });

  it('cada área tiene exactamente 2 plantillas', () => {
    for (const area of AREAS_ESPERADAS) {
      const count = PLANTILLAS_PLANES.filter((p) => p.area === area).length;
      expect(count).toBe(2);
    }
  });

  it('todas las plantillas tienen campos obligatorios completos', () => {
    const camposRequeridos: (keyof PlantillaPlan)[] = [
      'id',
      'titulo',
      'descripcion',
      'area',
      'prioridad',
      'emoji',
      'indicado_para',
      'actividades_sugeridas',
    ];
    for (const plantilla of PLANTILLAS_PLANES) {
      for (const campo of camposRequeridos) {
        expect(plantilla[campo], `[${plantilla.id}] campo "${campo}" no debe estar vacío`).toBeTruthy();
      }
    }
  });

  it('todas las plantillas tienen al menos 3 objetivos', () => {
    for (const plantilla of PLANTILLAS_PLANES) {
      expect(
        plantilla.objetivos.length,
        `[${plantilla.id}] debe tener ≥3 objetivos`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('la prioridad solo puede ser baja, media o alta', () => {
    const valoresValidos = ['baja', 'media', 'alta'];
    for (const plantilla of PLANTILLAS_PLANES) {
      expect(valoresValidos).toContain(plantilla.prioridad);
    }
  });

  it('el área de cada plantilla está en el set de áreas válidas', () => {
    for (const plantilla of PLANTILLAS_PLANES) {
      expect(AREAS_ESPERADAS as readonly string[]).toContain(plantilla.area);
    }
  });

  it('ningún objetivo en ninguna plantilla está vacío', () => {
    for (const plantilla of PLANTILLAS_PLANES) {
      for (const objetivo of plantilla.objetivos) {
        expect(objetivo.trim(), `objetivo vacío en "${plantilla.id}"`).toBeTruthy();
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getPlantillasPorArea
// ────────────────────────────────────────────────────────────────────────────
describe('getPlantillasPorArea', () => {
  it('retorna un objeto con las 6 áreas como claves', () => {
    const porArea = getPlantillasPorArea();
    expect(Object.keys(porArea)).toHaveLength(6);
    for (const area of AREAS_ESPERADAS) {
      expect(porArea).toHaveProperty(area);
    }
  });

  it('cada área tiene exactamente 2 plantillas en el resultado', () => {
    const porArea = getPlantillasPorArea();
    for (const area of AREAS_ESPERADAS) {
      expect(porArea[area]).toHaveLength(2);
    }
  });

  it('la suma total de todas las plantillas agrupadas es 12', () => {
    const porArea = getPlantillasPorArea();
    const total = Object.values(porArea).reduce((acc, arr) => acc + arr.length, 0);
    expect(total).toBe(12);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getPlantillaById
// ────────────────────────────────────────────────────────────────────────────
describe('getPlantillaById', () => {
  it('retorna la plantilla correcta para un ID existente', () => {
    const plantilla = getPlantillaById('lenguaje_vocabulario_ampliacion');
    expect(plantilla).toBeDefined();
    expect(plantilla?.id).toBe('lenguaje_vocabulario_ampliacion');
    expect(plantilla?.area).toBe('lenguaje_vocabulario');
  });

  it('retorna undefined para un ID inexistente', () => {
    expect(getPlantillaById('id_que_no_existe')).toBeUndefined();
  });

  it('retorna undefined para string vacío', () => {
    expect(getPlantillaById('')).toBeUndefined();
  });

  it('cada plantilla del catálogo es recuperable por su ID', () => {
    for (const plantilla of PLANTILLAS_PLANES) {
      const encontrada = getPlantillaById(plantilla.id);
      expect(encontrada?.id).toBe(plantilla.id);
    }
  });
});
