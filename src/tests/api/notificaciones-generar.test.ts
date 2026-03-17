/**
 * Tests para POST /api/notificaciones/generar
 * Genera recordatorio de capacitación si aplica (cookie-based)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseChain } from '../helpers/api-helpers';

// Build a mock Supabase client (cookie-based route uses createClient from server)
const mockSupabase: Record<string, any> = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { POST } from '@/app/api/notificaciones/generar/route';

describe('POST /api/notificaciones/generar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'vol-1' } },
      error: null,
    });
  });

  it('retorna 401 si no hay usuario autenticado', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No auth' },
    });

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('retorna created=false si notificaciones desactivadas', async () => {
    const configChain = createSupabaseChain([
      { clave: 'notificacion_capacitacion_activa', valor: 'false' },
    ]);
    mockSupabase.from.mockImplementation(() => configChain);

    const res = await POST();
    const json = await res.json();
    expect(json.created).toBe(false);
    expect(json.reason).toBe('notificaciones_desactivadas');
  });

  it('retorna created=false si no hay capacitaciones pendientes', async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      if (table === 'configuracion_sistema') {
        return createSupabaseChain([
          { clave: 'notificacion_capacitacion_activa', valor: 'true' },
          { clave: 'notificacion_capacitacion_intervalo_horas', valor: '48' },
        ]);
      }
      if (table === 'scores_voluntarios_por_area') {
        return createSupabaseChain([]);
      }
      return createSupabaseChain([]);
    });

    const res = await POST();
    const json = await res.json();
    expect(json.created).toBe(false);
    expect(json.reason).toBe('sin_capacitaciones_pendientes');
  });

  it('retorna created=false si intervalo no cumplido', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'configuracion_sistema') {
        return createSupabaseChain([
          { clave: 'notificacion_capacitacion_activa', valor: 'true' },
          { clave: 'notificacion_capacitacion_intervalo_horas', valor: '48' },
        ]);
      }
      if (table === 'scores_voluntarios_por_area') {
        return createSupabaseChain([{ area: 'lenguaje', necesita_capacitacion: true }]);
      }
      if (table === 'notificaciones') {
        // Last notif was 1 hour ago
        return createSupabaseChain([{ created_at: new Date().toISOString() }]);
      }
      return createSupabaseChain([]);
    });

    const res = await POST();
    const json = await res.json();
    expect(json.created).toBe(false);
    expect(json.reason).toBe('intervalo_no_cumplido');
    expect(json.nextIn).toBeGreaterThan(0);
  });

  it('crea notificación exitosamente cuando se cumplen condiciones', async () => {
    const insertChain = createSupabaseChain(null);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'configuracion_sistema') {
        return createSupabaseChain([
          { clave: 'notificacion_capacitacion_activa', valor: 'true' },
          { clave: 'notificacion_capacitacion_intervalo_horas', valor: '1' },
        ]);
      }
      if (table === 'scores_voluntarios_por_area') {
        return createSupabaseChain([{ area: 'lenguaje', necesita_capacitacion: true }]);
      }
      if (table === 'notificaciones') {
        // Alternate: first call → empty (no last notif), second call → insert
        return insertChain;
      }
      return createSupabaseChain([]);
    });

    const res = await POST();
    const json = await res.json();
    expect(json.created).toBe(true);
  });

  it('retorna 500 si falla la inserción de notificación', async () => {
    const errorInsertChain = createSupabaseChain(null, { message: 'Insert failed' });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'configuracion_sistema') {
        return createSupabaseChain([
          { clave: 'notificacion_capacitacion_activa', valor: 'true' },
          { clave: 'notificacion_capacitacion_intervalo_horas', valor: '1' },
        ]);
      }
      if (table === 'scores_voluntarios_por_area') {
        return createSupabaseChain([{ area: 'grafismo', necesita_capacitacion: true }]);
      }
      if (table === 'notificaciones') {
        return errorInsertChain;
      }
      return createSupabaseChain([]);
    });

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
