/**
 * Tests para src/lib/query-client.ts
 * Verifica la configuración del QueryClient (React Query).
 */
import { describe, it, expect } from 'vitest';
import { queryClient } from '@/lib/query-client';

describe('QueryClient — configuración', () => {
  it('es una instancia de QueryClient', () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.getQueryData).toBe('function');
    expect(typeof queryClient.invalidateQueries).toBe('function');
  });

  it('staleTime es 5 minutos (300_000 ms)', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5);
  });

  it('gcTime es 10 minutos (600_000 ms)', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(1000 * 60 * 10);
  });

  it('refetchOnWindowFocus está habilitado', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
  });

  it('retry es 1', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });
});
