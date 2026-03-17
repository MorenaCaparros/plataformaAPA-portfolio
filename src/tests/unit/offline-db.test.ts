/**
 * Tests para src/lib/db/offline-db.ts
 * Cubre tipos de interfaces, estructura de la DB y funciones helper.
 * Nota: Dexie requiere IndexedDB, lo cual no está disponible en jsdom.
 * Testeamos la lógica exportada y las interfaces del módulo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de Dexie para evitar dependencia de IndexedDB
const mockPut = vi.fn();
const mockGet = vi.fn();
const mockToArray = vi.fn();
const mockAdd = vi.fn().mockResolvedValue(1);
const mockUpdate = vi.fn();
const mockClear = vi.fn();
const mockDelete = vi.fn();
const mockCount = vi.fn().mockResolvedValue(0);
const mockWhere = vi.fn().mockReturnValue({
  equals: vi.fn().mockReturnValue({
    toArray: mockToArray,
    count: mockCount,
    and: vi.fn().mockReturnValue({
      delete: mockDelete,
    }),
  }),
});

vi.mock('dexie', () => {
  class MockDexie {
    ninos: Record<string, unknown>;
    sesiones_pendientes: Record<string, unknown>;
    sync_queue: Record<string, unknown>;

    constructor() {
      const table = {
        put: mockPut,
        get: mockGet,
        add: mockAdd,
        toArray: mockToArray,
        update: mockUpdate,
        clear: mockClear,
        delete: mockDelete,
        where: mockWhere,
        count: mockCount,
      };
      this.ninos = { ...table };
      this.sesiones_pendientes = { ...table };
      this.sync_queue = { ...table };
    }
    version() {
      return { stores: vi.fn() };
    }
  }
  return { default: MockDexie, Dexie: MockDexie };
});

describe('offline-db — tipos e interfaces', () => {
  it('exporta la interfaz NinoOffline con campos esperados', async () => {
    // Validamos que se puede importar y que el módulo exporta las funciones
    const mod = await import('@/lib/db/offline-db');
    expect(mod).toHaveProperty('saveNinoOffline');
    expect(mod).toHaveProperty('getNinosOffline');
    expect(mod).toHaveProperty('getNinoOffline');
    expect(typeof mod.saveNinoOffline).toBe('function');
  });

  it('exporta funciones de sesiones offline', async () => {
    const mod = await import('@/lib/db/offline-db');
    expect(mod).toHaveProperty('saveSesionOffline');
    expect(mod).toHaveProperty('getSesionesPendientes');
    expect(mod).toHaveProperty('getAllSesionesOffline');
    expect(mod).toHaveProperty('markSesionSincronizada');
    expect(mod).toHaveProperty('cleanOldSesiones');
  });

  it('exporta funciones de sincronización', async () => {
    const mod = await import('@/lib/db/offline-db');
    expect(mod).toHaveProperty('getSyncStats');
    expect(mod).toHaveProperty('clearAllData');
    expect(mod).toHaveProperty('syncQueueItem');
    expect(mod).toHaveProperty('processAllSyncQueue');
  });

  it('exporta instancia de la base de datos', async () => {
    const mod = await import('@/lib/db/offline-db');
    expect(mod).toHaveProperty('db');
    expect(mod.db).toBeDefined();
  });
});

describe('offline-db — saveNinoOffline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a db.ninos.put con datos correctos', async () => {
    const { saveNinoOffline } = await import('@/lib/db/offline-db');
    const nino = {
      id: 'nino-1',
      alias: 'Juanito',
      rango_etario: '5-7',
      nivel_alfabetizacion: 'inicial',
      escolarizado: true,
    };

    await saveNinoOffline(nino);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'nino-1',
        alias: 'Juanito',
        sincronizado: true,
        updated_at: expect.any(Date),
      })
    );
  });
});

describe('offline-db — getSyncStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(0);
  });

  it('retorna estadísticas con las 3 métricas', async () => {
    const { getSyncStats } = await import('@/lib/db/offline-db');
    const stats = await getSyncStats();

    expect(stats).toHaveProperty('sesiones_pendientes');
    expect(stats).toHaveProperty('total_sesiones');
    expect(stats).toHaveProperty('items_en_cola');
    expect(typeof stats.sesiones_pendientes).toBe('number');
  });
});

describe('offline-db — clearAllData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limpia las 3 tablas', async () => {
    const { clearAllData } = await import('@/lib/db/offline-db');
    await clearAllData();

    expect(mockClear).toHaveBeenCalledTimes(3);
  });
});
