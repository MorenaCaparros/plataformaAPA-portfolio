'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const DEMO_USERS = [
  { label: 'Admin / Director',   email: 'admin@demo.apa',       password: 'Demo1234!', emoji: '🛡️' },
  { label: 'Equipo Profesional', email: 'equipo@demo.apa',      password: 'Demo1234!', emoji: '🎓' },
  { label: 'Voluntario',         email: 'voluntario1@demo.apa', password: 'Demo1234!', emoji: '🙋' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('[Login] error completo:', error);
      const msg = error?.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('El email no está confirmado. Revisá tu casilla.');
      } else {
        setError(msg || 'Error al iniciar sesión. Abrí la consola para más detalle.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión con Google');
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string, label: string) => {
    setDemoLoading(label);
    setDemoError(null);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      console.log('[Demo Login] resultado:', { data, error });
      if (error) throw error;
      if (data.user) {
        console.log('[Demo Login] OK, redirigiendo al dashboard...');
        window.location.href = '/dashboard';
      } else {
        setDemoError('Login sin error pero sin usuario. Intentá de nuevo.');
      }
    } catch (error: any) {
      console.error('[Demo Login] error completo:', error);
      const msg = error?.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setDemoError('Credenciales incorrectas. Corré el SQL de reset de contraseñas en Supabase.');
      } else if (msg.includes('Email not confirmed')) {
        setDemoError('El email no está confirmado. Activá "Auto Confirm" en Supabase Authentication.');
      } else {
        setDemoError(`Error: ${msg || 'Desconocido. Abrí la consola para más detalle.'}`);
      }
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background animado */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-neutro-lienzo" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sol-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-crecimiento-400/25 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sol-400/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Logo y Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-sol-400 to-crecimiento-400 shadow-glow-sol mb-4">
            <span className="text-white font-quicksand font-bold text-4xl">A</span>
          </div>
          <h1 className="font-quicksand text-4xl md:text-5xl font-bold text-neutro-carbon">
            Plataforma APA
          </h1>
          <p className="text-sm font-semibold text-crecimiento-600 tracking-wide">
            Acompañar Para Aprender
          </p>
          <p className="text-base text-neutro-piedra">
            Sistema de seguimiento educativo
          </p>
          <p className="text-sm text-neutro-piedra font-medium">
            GlobalIA × Asociación Civil Adelante
          </p>
        </div>

        {/* Acceso rápido demo — DESTACADO ARRIBA */}
        <div className="bg-gradient-to-br from-sol-400/20 to-crecimiento-400/10 backdrop-blur-lg rounded-3xl border-2 border-sol-400/40 shadow-glow-sol p-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">🚀</span>
            <p className="text-center text-base font-bold text-neutro-carbon">Acceso rápido — modo demo</p>
          </div>
          <p className="text-center text-xs text-neutro-piedra mb-4">Sin registrarse, explorá cada rol</p>
          <div className="flex flex-col gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.label}
                type="button"
                disabled={!!demoLoading}
                onClick={() => handleDemoLogin(u.email, u.password, u.label)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-white/70 border border-sol-400/30 hover:bg-white hover:border-crecimiento-400/50 hover:shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px]"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-neutro-carbon">
                  <span className="text-base">{u.emoji}</span>
                  {u.label}
                </span>
                {demoLoading === u.label ? (
                  <svg className="animate-spin h-4 w-4 text-crecimiento-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span className="text-xs text-neutro-piedra font-mono bg-neutro-lienzo/80 px-2 py-0.5 rounded-lg">{u.email}</span>
                )}
              </button>
            ))}
          </div>
          {demoError && (
            <div className="mt-3 bg-impulso-50 border border-impulso-200 rounded-2xl p-3 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-impulso-700 font-medium text-center">{demoError}</p>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutro-piedra/20" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-neutro-lienzo px-3 py-1 rounded-full text-neutro-piedra font-medium">
              o iniciá sesión con tu cuenta
            </span>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 shadow-glow-sol p-8">
          {/* Botón de Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-neutro-piedra/20 text-neutro-carbon font-medium px-6 py-3 rounded-2xl hover:bg-neutro-lienzo hover:border-neutro-piedra/40 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          >
            {googleLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Iniciar sesión con Google
          </button>

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutro-piedra/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/60 backdrop-blur-lg px-3 py-1 rounded-full text-neutro-piedra">
                o con email y contraseña
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-impulso-50 border border-impulso-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-impulso-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutro-carbon"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                className="w-full bg-white/60 backdrop-blur-lg border border-neutro-piedra/20 rounded-2xl px-4 py-3 text-neutro-carbon placeholder:text-neutro-piedra/50 focus:border-crecimiento-400 focus:ring-4 focus:ring-crecimiento-400/10 focus:outline-none transition-all duration-200"
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutro-carbon"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white/60 backdrop-blur-lg border border-neutro-piedra/20 rounded-2xl px-4 py-3 text-neutro-carbon placeholder:text-neutro-piedra/50 focus:border-crecimiento-400 focus:ring-4 focus:ring-crecimiento-400/10 focus:outline-none transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-medium px-6 py-3 rounded-2xl shadow-glow-crecimiento hover:shadow-glow-crecimiento-lg hover:translate-y-[-1px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[48px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-4 text-center">
            <Link
              href="/recuperar-contrasena"
              className="block text-sm text-crecimiento-600 hover:text-crecimiento-700 font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutro-piedra/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/60 backdrop-blur-lg px-3 py-1 rounded-full text-neutro-piedra">
                  ¿No tenés cuenta?
                </span>
              </div>
            </div>

            <Link
              href="/registro"
              className="block w-full bg-white/60 backdrop-blur-lg border border-crecimiento-400/30 text-crecimiento-700 font-medium px-6 py-3 rounded-2xl hover:bg-crecimiento-50/80 transition-all duration-200 min-h-[48px] flex items-center justify-center"
            >
              Registrate aquí
            </Link>
          </div>
        </div>

        {/* Badge de desarrollo */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-400/20 text-sol-700 text-xs font-medium border border-sol-400/30">
            <span className="w-2 h-2 bg-crecimiento-400 rounded-full animate-pulse" />
            Sistema en desarrollo
          </span>
        </div>
      </div>
    </div>
  );
}
