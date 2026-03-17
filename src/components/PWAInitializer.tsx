'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/register-sw';

export default function PWAInitializer() {
  useEffect(() => {
    // Registrar Service Worker solo en producción
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }
  }, []);

  return null; // Este componente no renderiza nada
}
