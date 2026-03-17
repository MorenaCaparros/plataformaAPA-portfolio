'use client';

import { useState, useEffect } from 'react';
import { useSyncManager } from '@/lib/hooks/useSync';

export default function OnlineStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync, error, sync } = useSyncManager();
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Evitar hydration error: solo renderizar después del mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante SSR y antes del mount, no mostrar nada
  if (!mounted) {
    return null;
  }

  // Formatear fecha del último sync
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const handleManualSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  // Mostrar indicador cuando está sincronizando
  if (isSyncing) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-crecimiento-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse max-w-xs">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Sincronizando...</p>
          <p className="text-xs opacity-90">{pendingCount} items pendientes</p>
        </div>
      </div>
    );
  }

  // Mostrar advertencia cuando está offline
  if (!isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-xs">
        <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">📵</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sin Conexión</p>
              <p className="text-xs opacity-90">Modo offline activado</p>
            </div>
          </div>
          
          {pendingCount > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-600">
              <p className="text-xs">
                <span className="font-semibold">{pendingCount}</span> sesiones pendientes de sincronizar
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mostrar error si hubo problemas
  if (error) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-xs">
        <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Error de Sincronización</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
          
          <button
            onClick={handleManualSync}
            className="mt-2 w-full py-2 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mostrar indicador compacto cuando hay items pendientes
  if (pendingCount > 0) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div 
          className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-orange-600 transition"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span className="text-sm font-semibold">{pendingCount} pendientes</span>
          </div>
        </div>

        {showDetails && (
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-64 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-900 dark:text-white font-semibold mb-2">
              Sincronización
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Items pendientes:</span>
                <span className="font-semibold text-orange-600">{pendingCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Último sync:</span>
                <span className="font-semibold">{formatLastSync(lastSync)}</span>
              </div>
            </div>
            
            <button
              onClick={handleManualSync}
              className="mt-3 w-full py-2 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded text-xs font-semibold transition touch-manipulation"
              style={{ minHeight: '36px' }}
            >
              🔄 Sincronizar Ahora
            </button>
          </div>
        )}
      </div>
    );
  }

  // Indicador silencioso cuando está todo bien
  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-md cursor-pointer hover:bg-green-600 transition"
        onClick={() => setShowDetails(!showDetails)}
        title="Todo sincronizado"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">✓</span>
        </div>
      </div>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-64 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-900 dark:text-white font-semibold mb-2">
            ✅ Todo Sincronizado
          </p>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Estado:</span>
              <span className="font-semibold text-green-600">Online</span>
            </div>
            <div className="flex justify-between">
              <span>Último sync:</span>
              <span className="font-semibold">{formatLastSync(lastSync)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
