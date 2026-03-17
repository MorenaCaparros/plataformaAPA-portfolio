'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Verificar si hay un hash de reset en la URL
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidToken(true);
      } else {
        setValidToken(false);
      }
    };
    
    checkSession();
  }, []);

  const handleRestablecer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sol-50 to-crecimiento-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando...</p>
        </div>
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sol-50 to-crecimiento-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Link Inválido o Expirado
            </h3>
            
            <p className="text-gray-600 mb-6">
              Este link de recuperación no es válido o ya expiró. Solicitá uno nuevo.
            </p>

            <Link
              href="/recuperar-contrasena"
              className="inline-block w-full bg-crecimiento-500 hover:bg-crecimiento-600 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              Solicitar nuevo link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sol-50 to-crecimiento-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Nueva Contraseña
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Ingresá tu nueva contraseña
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                ¡Contraseña Actualizada!
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400">
                Tu contraseña se cambió correctamente. Serás redirigido al inicio de sesión...
              </p>
            </div>
          ) : (
            <form onSubmit={handleRestablecer} className="space-y-5 sm:space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Nueva Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent transition"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent transition"
                  placeholder="Repetí la contraseña"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-crecimiento-500 hover:bg-crecimiento-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 min-h-[48px] rounded-lg transition duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-500">
          GlobalIA × Asociación Civil Adelante
        </div>
      </div>
    </div>
  );
}
