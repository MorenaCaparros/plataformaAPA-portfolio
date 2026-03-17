'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react';

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

interface UsuarioEdit {
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  telefono: string;
  zona_id: string | null;
  direccion: string;
  fecha_nacimiento: string;
  activo: boolean;
  foto_perfil_url: string | null;
  notas: string;
}

interface Zona {
  id: string;
  nombre: string;
}

export default function EditarUsuarioPage() {
  const { user, perfil } = useAuth();
  const router = useRouter();
  const params = useParams();
  const usuarioId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [formData, setFormData] = useState<UsuarioEdit>({
    email: '',
    nombre: '',
    apellido: '',
    rol: 'voluntario',
    telefono: '',
    zona_id: null,
    direccion: '',
    fecha_nacimiento: '',
    activo: true,
    foto_perfil_url: null,
    notas: '',
  });

  const rolesPermitidos = ['director', 'admin'];

  useEffect(() => {
    if (!user || !rolesPermitidos.includes(perfil?.rol || '')) {
      router.push('/dashboard');
      return;
    }
    cargarUsuario();
    cargarZonas();
  }, [user, perfil]);

  const cargarZonas = async () => {
    const { data } = await supabase.from('zonas').select('id, nombre').order('nombre');
    if (data) setZonas(data);
  };

  const cargarUsuario = async () => {
    try {
      setLoading(true);

      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('nombre, apellido, rol, zona_id, telefono, direccion, fecha_nacimiento, activo, foto_perfil_url, notas')
        .eq('id', usuarioId)
        .single();

      if (perfilError) throw perfilError;

      // Get email from auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`/api/usuarios?id=${usuarioId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const { usuario } = await response.json();

      setFormData({
        email: usuario.email || '',
        nombre: perfilData.nombre || '',
        apellido: perfilData.apellido || '',
        rol: perfilData.rol || 'voluntario',
        telefono: perfilData.telefono || '',
        zona_id: perfilData.zona_id,
        direccion: perfilData.direccion || '',
        fecha_nacimiento: perfilData.fecha_nacimiento || '',
        activo: perfilData.activo ?? true,
        foto_perfil_url: perfilData.foto_perfil_url || null,
        notas: perfilData.notas || '',
      });
    } catch (error) {
      console.error('Error cargando usuario:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar el usuario' });
    } finally {
      setLoading(false);
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFoto(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body = new FormData();
      body.append('foto', file);

      const response = await fetch(`/api/perfil/foto?userId=${usuarioId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al subir foto');
      }

      const { url } = await response.json();
      setFormData(prev => ({ ...prev, foto_perfil_url: url }));
      setMensaje({ tipo: 'exito', texto: '📸 Foto subida. Guardá los cambios.' });
      setTimeout(() => setMensaje(null), 3000);
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      setMensaje({ tipo: 'error', texto: error.message || 'Error al subir foto' });
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.rol) {
      setMensaje({ tipo: 'error', texto: 'Nombre y rol son obligatorios' });
      return;
    }

    try {
      setSaving(true);
      setMensaje(null);

      const { error } = await supabase
        .from('perfiles')
        .update({
          rol: formData.rol,
          zona_id: formData.zona_id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono || null,
          direccion: formData.direccion || null,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          activo: formData.activo,
          foto_perfil_url: formData.foto_perfil_url,
          notas: formData.notas || null,
        })
        .eq('id', usuarioId);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '✅ Usuario actualizado correctamente' });
      setTimeout(() => router.push('/dashboard/usuarios'), 1500);
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      setMensaje({ tipo: 'error', texto: error.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando usuario...</p>
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
                Editar Usuario
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Mensaje */}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar section */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
            <div className="flex items-center gap-6">
              <div className="relative">
                {formData.foto_perfil_url ? (
                  <img src={getDriveImageUrl(formData.foto_perfil_url) || formData.foto_perfil_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-lg" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center border-2 border-white shadow-lg">
                    <span className="text-white font-quicksand font-bold text-2xl">{(formData.nombre?.[0] || '?').toUpperCase()}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-crecimiento-500 hover:bg-crecimiento-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {uploadingFoto ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
              </div>
              <div>
                <h2 className="font-quicksand font-bold text-lg text-neutro-carbon">
                  {formData.nombre} {formData.apellido}
                </h2>
                <p className="text-sm text-neutro-piedra font-outfit">{formData.email}</p>
              </div>
            </div>
          </div>

          {/* Datos personales */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
            <h3 className="text-lg font-bold text-neutro-carbon mb-5 font-quicksand">📋 Datos personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Nombre *</label>
                <input
                  type="text" value={formData.nombre} required
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Apellido</label>
                <input
                  type="text" value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Teléfono</label>
                <input
                  type="tel" value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Fecha de nacimiento</label>
                <input
                  type="date" value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Dirección</label>
                <input
                  type="text" value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                  placeholder="Dirección completa"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Email</label>
                <input
                  type="email" value={formData.email} disabled
                  className="w-full px-4 py-3 bg-gray-100/80 border border-white/60 rounded-2xl text-neutro-piedra font-outfit min-h-[48px] cursor-not-allowed"
                />
                <p className="text-xs text-neutro-piedra/70 mt-1 font-outfit">El email no se puede modificar</p>
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
                  value={formData.rol} required
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                >
                  <option value="voluntario">Voluntario</option>
                  <option value="equipo_profesional">Equipo Profesional</option>
                  <option value="director">Director</option>
                  <option value="coordinador">Coordinador (legacy)</option>
                  <option value="psicopedagogia">Profesional (legacy)</option>
                  <option value="trabajador_social">Trabajador Social (legacy)</option>
                  <option value="admin">Admin (legacy)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-piedra mb-1.5 font-outfit">Equipo/Zona</label>
                <select
                  value={formData.zona_id || ''}
                  onChange={(e) => setFormData({ ...formData, zona_id: e.target.value || null })}
                  className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px]"
                >
                  <option value="">Sin equipo</option>
                  {zonas.map(zona => (
                    <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutro-lienzo peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crecimiento-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutro-piedra/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crecimiento-400"></div>
                </label>
                <span className="text-sm font-medium text-neutro-carbon font-outfit">
                  Usuario {formData.activo ? 'activo' : 'inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
            <h3 className="text-lg font-bold text-neutro-carbon mb-5 font-quicksand">📝 Notas</h3>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit resize-none"
              placeholder="Notas internas sobre este usuario..."
            />
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
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/usuarios')}
              className="flex-1 px-6 py-3 bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:bg-white transition-all font-medium font-outfit min-h-[48px] active:scale-95"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
