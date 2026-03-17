/**
 * Registro y manejo del Service Worker
 */

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registrado:', registration.scope);

      // Manejar actualizaciones del SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              console.log('[PWA] Nueva versión disponible');
              
              // Mostrar notificación al usuario
              if (confirm('Hay una nueva versión disponible. ¿Actualizar ahora?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      // Recargar cuando el SW toma control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      return registration;
    } catch (error) {
      console.error('[PWA] Error registrando Service Worker:', error);
    }
  } else {
    console.warn('[PWA] Service Worker no soportado en este navegador');
  }
}

/**
 * Verificar si la app está instalada como PWA
 */
export function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Solicitar instalación de PWA
 */
export function promptInstallPWA() {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que Chrome muestre el prompt automáticamente
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar botón de instalación personalizado
    const installButton = document.getElementById('install-pwa-button');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          
          if (outcome === 'accepted') {
            console.log('[PWA] Usuario aceptó la instalación');
          } else {
            console.log('[PWA] Usuario rechazó la instalación');
          }
          
          deferredPrompt = null;
        }
      });
    }
  });
}

/**
 * Verificar si Background Sync está disponible
 */
export function isBackgroundSyncAvailable(): boolean {
  return 'serviceWorker' in navigator && 'sync' in (navigator as any).serviceWorker;
}

/**
 * Registrar sincronización en background
 */
export async function registerBackgroundSync(tag: string = 'sync-sesiones') {
  if (!isBackgroundSyncAvailable()) {
    console.warn('[PWA] Background Sync no disponible');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log('[PWA] Background Sync registrado:', tag);
    return true;
  } catch (error) {
    console.error('[PWA] Error registrando Background Sync:', error);
    return false;
  }
}

/**
 * Forzar sincronización manual
 */
export async function forceSyncNow(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };
      
      registration.active?.postMessage(
        { type: 'SYNC_NOW' },
        [messageChannel.port2]
      );
    });
  } catch (error) {
    console.error('[PWA] Error forzando sincronización:', error);
    return false;
  }
}

/**
 * Verificar estado del Service Worker
 */
export async function getServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return { installed: false, active: false, waiting: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  
  if (!registration) {
    return { installed: false, active: false, waiting: false };
  }

  return {
    installed: true,
    active: !!registration.active,
    waiting: !!registration.waiting,
    installing: !!registration.installing
  };
}
