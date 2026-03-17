// Service Worker para Plataforma APA
// Versión: 1.0.0

const CACHE_NAME = 'apa-v1';
const OFFLINE_URL = '/offline.html';

// Assets críticos para cachear
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/dashboard/ninos',
  '/dashboard/sesiones',
  '/offline.html',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control inmediato
  return self.clients.claim();
});

// Estrategia de Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests no-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignorar requests de API externa
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // Estrategia Network-First para APIs
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuesta exitosa
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla, intentar desde caché
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Si no hay caché, mostrar offline
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Estrategia Cache-First para assets estáticos
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Actualizar caché en background
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        });
        return cached;
      }

      // Si no está en caché, fetch
      return fetch(request)
        .then((response) => {
          // Cachear la respuesta
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla todo, mostrar offline
          return caches.match(OFFLINE_URL);
        });
    })
  );
});

// Background Sync para sincronización de datos offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-sesiones') {
    event.waitUntil(syncSesiones());
  }
});

// Función para sincronizar sesiones
async function syncSesiones() {
  console.log('[SW] Syncing offline sessions...');
  
  try {
    // Obtener sesiones pendientes desde IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending_sesiones', 'readonly');
    const store = tx.objectStore('pending_sesiones');
    const sesiones = await store.getAll();
    
    console.log('[SW] Found', sesiones.length, 'pending sessions');
    
    // Enviar cada sesión al servidor
    for (const sesion of sesiones) {
      try {
        const response = await fetch('/api/sesiones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sesion.data)
        });
        
        if (response.ok) {
          // Eliminar de pendientes
          const deleteTx = db.transaction('pending_sesiones', 'readwrite');
          await deleteTx.objectStore('pending_sesiones').delete(sesion.id);
          console.log('[SW] Synced session:', sesion.id);
        }
      } catch (error) {
        console.error('[SW] Error syncing session:', sesion.id, error);
      }
    }
    
    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Re-throw para que se reintente
  }
}

// Helper para abrir IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('apa-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_sesiones')) {
        db.createObjectStore('pending_sesiones', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    // Forzar sincronización inmediata
    syncSesiones().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});
