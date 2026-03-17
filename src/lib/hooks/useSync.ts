'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  processAllSyncQueue, 
  getSyncStats, 
  saveSesionOffline,
  getNinosOffline,
  saveNinoOffline
} from '@/lib/db/offline-db';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

/**
 * Hook para manejar sincronización automática de datos offline
 */
export function useSyncManager() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null
  });

  // Actualizar estadísticas de items pendientes
  const updateStats = useCallback(async () => {
    try {
      const stats = await getSyncStats();
      setStatus(prev => ({
        ...prev,
        pendingCount: stats.sesiones_pendientes
      }));
    } catch (error) {
      console.error('Error updating sync stats:', error);
    }
  }, []);

  // Sincronizar datos pendientes
  const sync = useCallback(async () => {
    if (!status.isOnline || status.isSyncing) {
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await processAllSyncQueue();
      
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        pendingCount: 0
      }));

      await updateStats();

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [status.isOnline, status.isSyncing, updateStats]);

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      // Auto-sincronizar cuando vuelve la conexión
      setTimeout(() => sync(), 1000);
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actualizar stats iniciales
    updateStats();

    // Actualizar stats cada minuto
    const interval = setInterval(updateStats, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [sync, updateStats]);

  return {
    ...status,
    sync,
    updateStats
  };
}

/**
 * Hook para guardar y recuperar niños desde IndexedDB
 */
export function useOfflineNinos() {
  const [ninos, setNinos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNinos = useCallback(async () => {
    try {
      setLoading(true);
      const offlineNinos = await getNinosOffline();
      setNinos(offlineNinos);
    } catch (error) {
      console.error('Error loading offline niños:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveNino = useCallback(async (nino: any) => {
    try {
      await saveNinoOffline(nino);
      await loadNinos();
    } catch (error) {
      console.error('Error saving niño offline:', error);
      throw error;
    }
  }, [loadNinos]);

  useEffect(() => {
    loadNinos();
  }, [loadNinos]);

  return {
    ninos,
    loading,
    loadNinos,
    saveNino
  };
}

/**
 * Hook para guardar sesiones offline y sincronizarlas después
 */
export function useOfflineSesion() {
  const { sync, isOnline } = useSyncManager();

  const saveSesion = useCallback(async (sesionData: any) => {
    try {
      // Guardar en IndexedDB
      const localId = await saveSesionOffline(sesionData);

      // Si está online, intentar sincronizar inmediatamente
      if (isOnline) {
        setTimeout(() => sync(), 500);
      }

      return localId;
    } catch (error) {
      console.error('Error saving sesion offline:', error);
      throw error;
    }
  }, [sync, isOnline]);

  return {
    saveSesion,
    isOnline
  };
}
