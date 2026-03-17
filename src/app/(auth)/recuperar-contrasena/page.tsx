'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    console.log('🔄 Iniciando recuperación para:', email);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });

      console.log('📧 Respuesta de Supabase:', { data, error });

      if (error) throw error;

      console.log('✅ Correo enviado exitosamente');
      setSuccess(true);
    } catch (error: any) {
      console.error('❌ Error completo:', error);
      setError(error.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sol-50 to-crecimiento-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Te enviaremos un link para restablecer tu contraseña
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
                ¡Correo Enviado!
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400">
                Te enviamos un correo a <strong>{email}</strong> con las instrucciones para restablecer tu contraseña.
              </p>
              
              <div className="bg-sol-50 dark:bg-sol-900/20 border border-sol-200 dark:border-sol-800 rounded-lg p-4">
                <p className="text-sm text-sol-700 dark:text-sol-300">
                  💡 Si no ves el correo, revisá tu carpeta de spam
                </p>
              </div>

              <Link
                href="/login"
                className="inline-block w-full bg-crecimiento-500 hover:bg-crecimiento-600 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRecuperar} className="space-y-5 sm:space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent transition"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-crecimiento-500 hover:bg-crecimiento-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 min-h-[48px] rounded-lg transition duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
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
