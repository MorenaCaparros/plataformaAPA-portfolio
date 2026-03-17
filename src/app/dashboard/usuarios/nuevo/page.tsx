'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle, AlertTriangle, UserPlus, Copy, Eye, EyeOff } from 'lucide-react';

interface Zona {
  id: string;
  nombre: string;
}

export default function NuevoUsuarioPage() {
  const { user, perfil, loading: authLoading } = useAuth();
  const router = useRouter();

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [passwordGenerada, setPasswordGenerada] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    apellido: '',
    rol: 'voluntario',
    zona_id: '',
    telefono: '',
    password: '',
  });

  const rolesPermitidos = ['director', 'admin'];

  useEffect(() => {
    if (!authLoading && user) {
      if (!rolesPermitidos.includes(perfil?.rol || '')) {
        router.push('/dashboard');
        return;
      }
      cargarZonas();
    }
  }, [authLoading, user, perfil]);

  const cargarZonas = async () => {
    const { data } = await supabase.from('zonas').select('id, nombre').order('nombre');
    if (data) setZonas(data);
  };

  const copiarCredenciales = async () => {
    const texto = `Email: ${formData.email}\nContraseña: ${passwordGenerada}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.nombre || !formData.rol) {
      setMensaje({ tipo: 'error', texto: 'Email, nombre y rol son obligatorios' });
      return;
    }

    try {
      setSaving(true);
      setMensaje(null);
      setPasswordGenerada(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMensaje({ tipo: 'error', texto: 'Sesión expirada, volvé a iniciar sesión' });
        return;
      }

      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          rol: formData.rol,
          zona_id: formData.zona_id || null,
          telefono: formData.telefono.trim(),
          password: formData.password || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      // Si se generó password temporal, mostrarla
      if (result.password_temporal) {
        setPasswordGenerada(result.password_temporal);
      }

      setMensaje({
        tipo: 'exito',
        texto: `✅ Usuario "${formData.nombre}" creado correctamente`,
      });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al crear usuario' });
    } finally {
      setSaving(false);
    }
  };

  const handleCrearOtro = () => {
    setFormData({
      email: '',
      nombre: '',
      apellido: '',
      rol: 'voluntario',
      zona_id: '',
      telefono: '',
      password: '',
    });
    setMensaje(null);
    setPasswordGenerada(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/usuarios" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Usuarios</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Agregar Usuario
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
            mensaje.tipo === 'exito'
              ? 'bg-crecimiento-50 border border-crecimiento-200 text-crecimiento-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {mensaje.tipo === 'exito'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            }
            <span className="font-outfit text-sm">{mensaje.texto}</span>
          </div>
        )}

        {/* Password temporal generada */}
        {passwordGenerada && (
          <div className="mb-6 p-5 rounded-2xl bg-sol-50 border border-sol-200">
            <h3 className="font-quicksand font-bold text-sol-900 mb-2 flex items-center gap-2">
              🔑 Credenciales del nuevo usuario
            </h3>
            <p className="text-sm text-sol-700 font-outfit mb-3">
              Guardá estas credenciales. La contraseña temporal no se podrá ver de nuevo.
            </p>
            <div className="bg-white rounded-xl p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutro-piedra">Email:</span>
                <span className="text-neutro-carbon font-semibold">{formData.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutro-piedra">Contraseña:</span>
                <div className="flex items-center gap-2">
                  <span className="text-neutro-carbon font-semibold">
                    {showPassword ? passwordGenerada : '••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-neutro-piedra hover:text-neutro-carbon transition-colors"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={copiarCredenciales}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-outfit font-medium text-sol-700 bg-white border border-sol-200 rounded-xl hover:bg-sol-50 transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
              {copiado ? '¡Copiado!' : 'Copiar credenciales'}
            </button>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCrearOtro}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit text-sm active:scale-95"
              >
                Crear otro usuario
              </button>
              <Link
                href="/dashboard/usuarios"
                className="flex-1 text-center px-4 py-2.5 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:bg-white transition-all font-medium font-outfit text-sm active:scale-95"
              >
                Volver a usuarios
              </Link>
            </div>
          </div>
        )}

        {/* Formulario */}
        {!passwordGenerada && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos personales */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
              <h3 className="text-lg font-bold text-neutro-carbon mb-5 font-quicksand">📋 Datos personales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Juan"
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Apellido</label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    placeholder="Pérez"
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="usuario@apa.org"
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+54 11 1234-5678"
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Contraseña
                    <span className="text-neutro-piedra/60 font-normal ml-1">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Se genera automáticamente si se deja vacío"
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  />
                  <p className="text-xs text-neutro-piedra/70 mt-1 font-outfit">
                    Mínimo 6 caracteres. Si no se ingresa, se genera una contraseña temporal.
                  </p>
                </div>
              </div>
            </div>

            {/* Rol y equipo */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
              <h3 className="text-lg font-bold text-neutro-carbon mb-5 font-quicksand">🏷️ Rol y equipo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Rol *</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  >
                    <option value="voluntario">Voluntario</option>
                    <option value="equipo_profesional">Equipo Profesional</option>
                    <option value="director">Director</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Equipo/Zona
                    <span className="text-neutro-piedra/60 font-normal ml-1">(opcional)</span>
                  </label>
                  <select
                    value={formData.zona_id}
                    onChange={(e) => setFormData({ ...formData, zona_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  >
                    <option value="">Sin equipo</option>
                    {zonas.map(zona => (
                      <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit min-h-[48px] shadow-[0_4px_16px_rgba(164,198,57,0.15)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear Usuario
                  </>
                )}
              </button>
              <Link
                href="/dashboard/usuarios"
                className="flex-1 text-center px-6 py-3 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:bg-white transition-all font-medium font-outfit min-h-[48px] active:scale-95 flex items-center justify-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
