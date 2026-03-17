'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, Camera, CheckCircle, AlertTriangle, Users, Clock } from 'lucide-react';

// Helper: convert any Drive URL to a thumbnail URL that works in <img> tags
function getDriveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('drive.google.com/thumbnail')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return `https://drive.google.com/thumbnail?id=${lh3Match[1]}&sz=w800`;
  return url;
}

interface PerfilCompleto {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  zona_id: string | null;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string;
  direccion: string | null;
  foto_perfil_url: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  notas: string | null;
  max_ninos_asignados: number | null;
  horas_disponibles: number | null;
  zonas: { id: string; nombre: string } | null;
}

export default function MiPerfilPage() {
  const { user, perfil, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [perfilCompleto, setPerfilCompleto] = useState<PerfilCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [maxNinos, setMaxNinos] = useState<number>(3);
  const [horasDisponibles, setHorasDisponibles] = useState<number>(4);

  useEffect(() => {
    if (!authLoading && user) {
      cargarPerfil();
    }
  }, [authLoading, user]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const response = await fetch('/api/perfil', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Error al cargar perfil');

      const { perfil: data } = await response.json();
      setPerfilCompleto(data);

      // Populate form
      setNombre(data.nombre || '');
      setApellido(data.apellido || '');
      setTelefono(data.telefono || '');
      setDireccion(data.direccion || '');
      setFechaNacimiento(data.fecha_nacimiento || '');
      if (data.max_ninos_asignados != null) setMaxNinos(data.max_ninos_asignados);
      if (data.horas_disponibles != null) setHorasDisponibles(data.horas_disponibles);
    } catch (error) {
      console.error('Error cargando perfil:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'El nombre es obligatorio' });
      return;
    }

    try {
      setSaving(true);
      setMensaje(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const response = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() || null,
          direccion: direccion.trim() || null,
          fecha_nacimiento: fechaNacimiento || null,
          ...(perfilCompleto?.rol === 'voluntario' ? {
            max_ninos_asignados: maxNinos,
            horas_disponibles: horasDisponibles,
          } : {}),
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar');
      }

      const { perfil: updated } = await response.json();
      setPerfilCompleto(prev => prev ? { ...prev, ...updated } : prev);
      setMensaje({ tipo: 'exito', texto: '✅ Perfil actualizado correctamente' });

      // Clear message after 4s
      setTimeout(() => setMensaje(null), 4000);
    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      setMensaje({ tipo: 'error', texto: error.message || 'Error al guardar el perfil' });
    } finally {
      setSaving(false);
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFoto(true);
      setMensaje(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const formData = new FormData();
      formData.append('foto', file);

      const response = await fetch('/api/perfil/foto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al subir foto');
      }

      const { url } = await response.json();
      setPerfilCompleto(prev => prev ? { ...prev, foto_perfil_url: url } : prev);
      setMensaje({ tipo: 'exito', texto: '📸 Foto actualizada correctamente' });
      setTimeout(() => setMensaje(null), 4000);
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      setMensaje({ tipo: 'error', texto: error.message || 'Error al subir la foto' });
    } finally {
      setUploadingFoto(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRolDisplay = (rol: string) => {
    const map: Record<string, string> = {
      voluntario: 'Voluntario/a',
      coordinador: 'Coordinador/a',
      psicopedagogia: 'Profesional',
      trabajadora_social: 'Trabajadora Social',
      trabajador_social: 'Trabajador/a Social',
      director: 'Director/a',
      admin: 'Administrador/a',
    };
    return map[rol] || rol;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando perfil...</p>
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
              <Link href="/dashboard" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                Mi Perfil
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Mensaje de feedback */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
            mensaje.tipo === 'exito'
              ? 'bg-crecimiento-50 border border-crecimiento-200 text-crecimiento-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {mensaje.tipo === 'exito'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            }
            <span className="font-outfit text-sm">{mensaje.texto}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card izquierda — Avatar y datos de solo lectura */}
          <div className="lg:col-span-1">
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)] text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                {perfilCompleto?.foto_perfil_url ? (
                  <img
                    src={getDriveImageUrl(perfilCompleto.foto_perfil_url) || perfilCompleto.foto_perfil_url}
                    alt="Foto de perfil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-white font-quicksand font-bold text-4xl">
                      {(perfilCompleto?.nombre?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Camera overlay button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  title="Cambiar foto"
                >
                  {uploadingFoto ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </div>

              <h2 className="text-xl font-bold text-neutro-carbon font-quicksand">
                {perfilCompleto?.nombre} {perfilCompleto?.apellido}
              </h2>

              <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-crecimiento-50 text-crecimiento-700 border border-crecimiento-200">
                {getRolDisplay(perfilCompleto?.rol || '')}
              </span>

              {perfilCompleto?.zonas && (
                <p className="mt-3 text-sm text-neutro-piedra font-outfit">
                  📍 {perfilCompleto.zonas.nombre}
                </p>
              )}

              {/* Info de solo lectura */}
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center justify-between py-2 border-b border-white/40">
                  <span className="text-xs text-neutro-piedra font-outfit">Email</span>
                  <span className="text-sm text-neutro-carbon font-outfit font-medium truncate ml-2 max-w-[180px]">
                    {perfilCompleto?.email || user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/40">
                  <span className="text-xs text-neutro-piedra font-outfit">Ingreso</span>
                  <span className="text-sm text-neutro-carbon font-outfit font-medium">
                    {perfilCompleto?.fecha_ingreso
                      ? new Date(perfilCompleto.fecha_ingreso).toLocaleDateString('es-AR')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-neutro-piedra font-outfit">Estado</span>
                  <span className={`text-sm font-outfit font-semibold ${perfilCompleto?.activo ? 'text-crecimiento-600' : 'text-red-500'}`}>
                    {perfilCompleto?.activo ? '🟢 Activo' : '🔴 Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card derecha — Formulario editable */}
          <div className="lg:col-span-2">
            <form onSubmit={handleGuardar} className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
              <h3 className="text-lg font-bold text-neutro-carbon mb-6 font-quicksand flex items-center gap-2">
                <User className="w-6 h-6 text-crecimiento-500" />
                Datos personales
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit transition-all min-h-[48px]"
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit transition-all min-h-[48px]"
                    placeholder="Tu apellido"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit transition-all min-h-[48px]"
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit transition-all min-h-[48px]"
                  />
                </div>

                {/* Dirección — full width */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit transition-all min-h-[48px]"
                    placeholder="Tu dirección"
                  />
                </div>

                {/* Email — solo lectura */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">
                    Email
                  </label>
                  <input
                    type="email"
                    value={perfilCompleto?.email || user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100/80 border border-white/60 rounded-2xl text-neutro-piedra font-outfit min-h-[48px] cursor-not-allowed"
                  />
                  <p className="text-xs text-neutro-piedra/70 mt-1 font-outfit">
                    El email no se puede modificar desde aquí. Contactá a un administrador.
                  </p>
                </div>
              </div>

              {/* Sección voluntario: Max niños y horas disponibles */}
              {perfilCompleto?.rol === 'voluntario' && (
                <div className="mt-8 pt-6 border-t border-white/40">
                  <h3 className="text-lg font-bold text-neutro-carbon mb-6 font-quicksand flex items-center gap-2">
                    <Users className="w-6 h-6 text-impulso-500" />
                    Disponibilidad
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Max niños */}
                    <div className="bg-impulso-50/40 backdrop-blur-sm border border-impulso-200/30 rounded-2xl p-5">
                      <label className="block text-sm font-medium text-neutro-piedra mb-1 font-outfit">
                        Máximo de niños que podés acompañar
                      </label>
                      <p className="text-xs text-neutro-piedra/70 mb-3 font-outfit">
                        Seleccioná entre 1 y 3
                      </p>
                      <div className="flex gap-3 justify-center">
                        {[1, 2, 3].map((valor) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setMaxNinos(valor)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold font-quicksand transition-all ${
                              maxNinos === valor
                                ? 'bg-gradient-to-br from-impulso-400 to-impulso-500 text-white shadow-lg scale-110'
                                : 'bg-white/80 hover:bg-neutro-carbon/5 text-neutro-piedra border border-white/60'
                            }`}
                          >
                            {valor}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Horas disponibles */}
                    <div className="bg-crecimiento-50/40 backdrop-blur-sm border border-crecimiento-200/30 rounded-2xl p-5">
                      <label className="block text-sm font-medium text-neutro-piedra mb-1 font-outfit">
                        Horas semanales disponibles
                      </label>
                      <p className="text-xs text-neutro-piedra/70 mb-3 font-outfit">
                        ¿Cuántas horas por semana podés dedicar?
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => setHorasDisponibles(Math.max(1, horasDisponibles - 1))}
                          className="w-11 h-11 rounded-xl bg-white/80 hover:bg-neutro-carbon/5 text-neutro-carbon font-bold transition-all flex items-center justify-center text-xl border border-white/60"
                        >
                          −
                        </button>
                        <div className="text-center min-w-[60px]">
                          <span className="text-3xl font-bold text-crecimiento-600 font-quicksand">
                            {horasDisponibles}
                          </span>
                          <p className="text-xs text-neutro-piedra font-outfit mt-0.5">
                            {horasDisponibles === 1 ? 'hora' : 'horas'} / semana
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHorasDisponibles(Math.min(40, horasDisponibles + 1))}
                          className="w-11 h-11 rounded-xl bg-white/80 hover:bg-neutro-carbon/5 text-neutro-carbon font-bold transition-all flex items-center justify-center text-xl border border-white/60"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón guardar */}
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit min-h-[48px] shadow-[0_4px_16px_rgba(164,198,57,0.15)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
