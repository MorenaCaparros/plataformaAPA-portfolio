import Dexie, { Table } from 'dexie';

// Tipos para las tablas
export interface NinoOffline {
  id: string;
  alias: string;
  rango_etario: string;
  nivel_alfabetizacion: string;
  escolarizado: boolean;
  zona_id?: string;
  escuela_id?: string;
  sincronizado: boolean;
  updated_at: Date;
}

export interface SesionOffline {
  id?: number; // Auto-increment local
  sesion_id?: string; // ID del servidor después de sincronizar
  nino_id: string;
  voluntario_id: string;
  fecha: string;
  duracion_minutos: number;
  items: any[];
  observaciones_libres: string;
  created_offline: boolean;
  sincronizado: boolean;
  created_at: Date;
  synced_at?: Date;
}

export interface SyncQueueItem {
  id?: number;
  type: 'sesion' | 'nino' | 'update';
  data: any;
  timestamp: Date;
  retries: number;
  error?: string;
}

// Clase de la base de datos
class APADatabase extends Dexie {
  ninos!: Table<NinoOffline, string>;
  sesiones_pendientes!: Table<SesionOffline, number>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('apa-offline');
    
    this.version(1).stores({
      ninos: 'id, alias, sincronizado, updated_at',
      sesiones_pendientes: '++id, nino_id, voluntario_id, sincronizado, created_at',
      sync_queue: '++id, type, timestamp, retries'
    });
  }
}

// Instancia única de la base de datos
export const db = new APADatabase();

// Funciones helper para operaciones comunes

/**
 * Guardar o actualizar un niño en la base de datos local
 */
export async function saveNinoOffline(nino: Omit<NinoOffline, 'sincronizado' | 'updated_at'>) {
  await db.ninos.put({
    ...nino,
    sincronizado: true,
    updated_at: new Date()
  });
}

/**
 * Obtener todos los niños guardados localmente
 */
export async function getNinosOffline(): Promise<NinoOffline[]> {
  return await db.ninos.toArray();
}

/**
 * Obtener un niño específico por ID
 */
export async function getNinoOffline(id: string): Promise<NinoOffline | undefined> {
  return await db.ninos.get(id);
}

/**
 * Guardar una sesión para sincronizar después
 */
export async function saveSesionOffline(sesion: Omit<SesionOffline, 'id' | 'created_offline' | 'sincronizado' | 'created_at'>) {
  const id = await db.sesiones_pendientes.add({
    ...sesion,
    created_offline: true,
    sincronizado: false,
    created_at: new Date()
  });

  // Agregar a la cola de sincronización
  await db.sync_queue.add({
    type: 'sesion',
    data: { ...sesion, local_id: id },
    timestamp: new Date(),
    retries: 0
  });

  // Registrar para Background Sync si está disponible
  if ('serviceWorker' in navigator && 'sync' in (navigator as any).serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-sesiones');
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }

  return id;
}

/**
 * Obtener sesiones pendientes de sincronización
 */
export async function getSesionesPendientes(): Promise<SesionOffline[]> {
  return await db.sesiones_pendientes
    .where('sincronizado')
    .equals(0)
    .toArray();
}

/**
 * Obtener todas las sesiones (incluyendo sincronizadas)
 */
export async function getAllSesionesOffline(): Promise<SesionOffline[]> {
  return await db.sesiones_pendientes.toArray();
}

/**
 * Marcar una sesión como sincronizada
 */
export async function markSesionSincronizada(localId: number, serverId: string) {
  await db.sesiones_pendientes.update(localId, {
    sesion_id: serverId,
    sincronizado: true,
    synced_at: new Date()
  });
}

/**
 * Eliminar sesiones antiguas ya sincronizadas (mantener últimos 30 días)
 */
export async function cleanOldSesiones() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await db.sesiones_pendientes
    .where('sincronizado')
    .equals(1)
    .and((sesion: any) => sesion.created_at < thirtyDaysAgo)
    .delete();
}

/**
 * Obtener estadísticas de sincronización
 */
export async function getSyncStats() {
  const [pendientes, total, queue] = await Promise.all([
    db.sesiones_pendientes.where('sincronizado').equals(0).count(),
    db.sesiones_pendientes.count(),
    db.sync_queue.count()
  ]);

  return {
    sesiones_pendientes: pendientes,
    total_sesiones: total,
    items_en_cola: queue
  };
}

/**
 * Limpiar toda la base de datos (útil para debug/testing)
 */
export async function clearAllData() {
  await db.ninos.clear();
  await db.sesiones_pendientes.clear();
  await db.sync_queue.clear();
}

/**
 * Sincronizar un item de la cola manualmente
 */
export async function syncQueueItem(item: SyncQueueItem): Promise<boolean> {
  try {
    if (item.type === 'sesion') {
      const response = await fetch('/api/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Marcar como sincronizada
        if (item.data.local_id) {
          await markSesionSincronizada(item.data.local_id, result.id);
        }

        // Eliminar de la cola
        if (item.id) {
          await db.sync_queue.delete(item.id);
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error syncing item:', error);
    
    // Incrementar retries
    if (item.id) {
      await db.sync_queue.update(item.id, {
        retries: (item.retries || 0) + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return false;
  }
}

/**
 * Procesar toda la cola de sincronización
 */
export async function processAllSyncQueue(): Promise<{ success: number; failed: number }> {
  const items = await db.sync_queue.toArray();
  let success = 0;
  let failed = 0;

  for (const item of items) {
    const result = await syncQueueItem(item);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// Inicializar limpieza periódica
if (typeof window !== 'undefined') {
  // Limpiar cada 24 horas
  setInterval(() => {
    cleanOldSesiones().catch(console.error);
  }, 24 * 60 * 60 * 1000);
}
