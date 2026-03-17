'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

// ─── Validación de contraseña ────────────────────────────────
interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordCheck[] = [
  { label: 'Mínimo 8 caracteres', test: (pw) => pw.length >= 8 },
  { label: 'Al menos una mayúscula', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Al menos una minúscula', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Al menos un número', test: (pw) => /\d/.test(pw) },
  { label: 'Al menos un carácter especial (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const results = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const pct = total > 0 ? (passedCount / total) * 100 : 0;

  const barColor =
    pct <= 40 ? 'bg-impulso-400' : pct <= 80 ? 'bg-sol-400' : 'bg-crecimiento-400';

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de progreso */}
      <div className="h-1.5 w-full bg-neutro-piedra/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Lista de requisitos */}
      <ul className="space-y-1">
        {results.map((r) => (
          <li
            key={r.label}
            className={`flex items-center gap-2 text-xs transition-colors ${
              r.passed ? 'text-crecimiento-600' : 'text-neutro-piedra'
            }`}
          >
            {r.passed ? (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRulesPassed = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(password)),
    [password]
  );

  // ── Registro con email / contraseña ────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (!allRulesPassed) {
      setError('La contraseña no cumple todos los requisitos de seguridad');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      if (authData.session) {
        window.location.href = '/dashboard';
      } else {
        setError(
          '¡Cuenta creada! Por favor, confirmá tu email para iniciar sesión. Si no ves el email, revisá la carpeta de spam.'
        );
      }
    } catch (error: any) {
      setError(error.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // ── Registro / Login con Google ─────────────────────────────
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background animado */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-neutro-lienzo" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sol-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-crecimiento-400/25 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sol-400/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
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
          <p className="text-base text-neutro-piedra">Crear nueva cuenta</p>
          <p className="text-sm text-neutro-piedra font-medium">
            GlobalIA × Asociación Civil Adelante
          </p>
        </div>

        {/* Card de Registro */}
        <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 shadow-glow-sol p-8">
          {/* ── Botón de Google ──────────────────────── */}
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
            Registrarse con Google
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

          {/* ── Formulario email/contraseña ────────── */}
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-impulso-50 border border-impulso-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-impulso-700 font-medium">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-neutro-carbon">
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

            {/* Contraseña */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-neutro-carbon">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-white/60 backdrop-blur-lg border border-neutro-piedra/20 rounded-2xl px-4 py-3 text-neutro-carbon placeholder:text-neutro-piedra/50 focus:border-crecimiento-400 focus:ring-4 focus:ring-crecimiento-400/10 focus:outline-none transition-all duration-200"
                placeholder="••••••••"
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutro-carbon">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-white/60 backdrop-blur-lg border border-neutro-piedra/20 rounded-2xl px-4 py-3 text-neutro-carbon placeholder:text-neutro-piedra/50 focus:border-crecimiento-400 focus:ring-4 focus:ring-crecimiento-400/10 focus:outline-none transition-all duration-200"
                placeholder="••••••••"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-impulso-400 flex items-center gap-1 mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !allRulesPassed}
              className="w-full bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-medium px-6 py-3 rounded-2xl shadow-glow-crecimiento hover:shadow-glow-crecimiento-lg hover:translate-y-[-1px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[48px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando cuenta...
                </span>
              ) : (
                'Registrarse'
              )}
            </button>
          </form>

          {/* Link a login */}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutro-piedra/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/60 backdrop-blur-lg px-3 py-1 rounded-full text-neutro-piedra">
                  ¿Ya tenés cuenta?
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="block w-full mt-4 bg-white/60 backdrop-blur-lg border border-crecimiento-400/30 text-crecimiento-700 font-medium px-6 py-3 rounded-2xl hover:bg-crecimiento-50/80 transition-all duration-200 min-h-[48px] flex items-center justify-center"
            >
              Iniciá sesión aquí
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
