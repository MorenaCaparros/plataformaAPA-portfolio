import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos - datos "frescos"
      gcTime: 1000 * 60 * 10, // 10 minutos - mantener en caché (antes cacheTime)
      refetchOnWindowFocus: true, // Actualizar al volver a la pestaña
      retry: 1, // Reintentar 1 vez si falla
    },
  },
});
