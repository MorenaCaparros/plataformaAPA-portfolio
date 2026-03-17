/**
 * Configuración global de tests — se ejecuta antes de cada test file.
 * Inicializa matchers de jest-dom y configura mocks globales.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Mock de next/navigation ─────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
}));

// ── Mock de next/image ───────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    const { src, alt, ...rest } = props as { src: string; alt: string };
    return Object.assign(document.createElement('img'), { src, alt, ...rest });
  },
}));

// ── Mock global de supabase/client ───────────────────────────────────────────
// Cada test puede sobreescribir estas funciones con vi.mocked()
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// ── Mock del AuthContext ─────────────────────────────────────────────────────
vi.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    perfil: null,
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Suprimir warnings de consola esperados ───────────────────────────────────
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0]);
  // Ignorar warnings de React en tests
  if (msg.includes('Warning:') || msg.includes('act(')) return;
  originalConsoleError(...args);
};
