/**
 * Tests para src/lib/contexts/AuthContext.tsx
 * Cubre AuthProvider y useAuth hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Desactivar el mock global del setup.ts para poder testear el módulo real
vi.unmock('@/lib/contexts/AuthContext');

// Mock de supabase/client — sobreescribe el global del setup para este test
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();
const mockFromSelect = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockFromSelect,
        })),
      })),
    })),
  },
}));

// Mock fetch and window.location
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('useAuth lanza error si se usa fuera del AuthProvider', async () => {
    const { useAuth } = await import('@/lib/contexts/AuthContext');

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe usarse dentro de AuthProvider');
  });

  it('provee loading=true inicialmente y luego false', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { AuthProvider, useAuth } = await import('@/lib/contexts/AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Eventualmente debe dejar de cargar
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.perfil).toBeNull();
  });

  it('carga usuario y perfil cuando hay sesión', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    const mockPerfil = { id: 'user-1', rol: 'voluntario', nombre: 'Juan' };

    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    mockFromSelect.mockResolvedValue({
      data: mockPerfil,
      error: null,
    });

    const { AuthProvider, useAuth } = await import('@/lib/contexts/AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.perfil).toEqual(mockPerfil);
  });

  it('se suscribe a cambios de autenticación y limpia al desmontar', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { AuthProvider, useAuth } = await import('@/lib/contexts/AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockOnAuthStateChange).toHaveBeenCalled();

    // Al desmontar, se debe llamar unsubscribe
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('signOut limpia usuario y perfil', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };

    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    mockFromSelect.mockResolvedValue({
      data: { id: 'user-1', rol: 'voluntario' },
      error: null,
    });

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    const { AuthProvider, useAuth } = await import('@/lib/contexts/AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Llamar signOut
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/signout', { method: 'POST' });
    expect(window.location.href).toBe('/login');

    // Restaurar
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
