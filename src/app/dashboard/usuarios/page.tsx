'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, Key, Search, LayoutGrid, List, Phone, Mail, MapPin, Eye, UserPlus } from 'lucide-react';

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

interface Usuario {
  id: string;
  email: string;
  rol: string;
  zona_id: string | null;
  zona_nombre: string | null;
  created_at: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion: string | null;
  foto_perfil_url: string | null;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  ultima_conexion: string | null;
  metadata: any;
}

function UsuariosPageContent() {
  const { user, perfil, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const zonaParam = searchParams.get('zona');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroZona, setFiltroZona] = useState<string>(zonaParam || 'todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroCapacitacion, setFiltroCapacitacion] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [vistaCards, setVistaCards] = useState(true);
  const [perfilExpandido, setPerfilExpandido] = useState<string | null>(null);
  const [zonas, setZonas] = useState<{id: string; nombre: string}[]>([]);
  // Map de voluntario_id → true si necesita capacitación
  const [capPendiente, setCapPendiente] = useState<Record<string, boolean>>({});

  const rolesPermitidos = ['director', 'admin', 'psicopedagogia', 'equipo_profesional'];

  useEffect(() => {
    if (!authLoading && user) {
      if (!rolesPermitidos.includes(perfil?.rol || '')) {
        router.push('/dashboard');
        return;
      }
      fetchUsuarios();
    }
  }, [authLoading, user, perfil]);

  useEffect(() => {
    if (zonaParam) setFiltroZona(zonaParam);
  }, [zonaParam]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const response = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');
      const { usuarios: usuariosData } = await response.json();
      setUsuarios(usuariosData);

      // Cargar todas las zonas disponibles
      supabase
        .from('zonas')
        .select('id, nombre')
        .order('nombre', { ascending: true })
        .then(({ data }: { data: {id: string; nombre: string}[] | null }) => { if (data) setZonas(data); });

      // Cargar estado de capacitaciones para voluntarios
      const voluntariosIds = (usuariosData as Usuario[]).filter(u => u.rol === 'voluntario').map(u => u.id);
      if (voluntariosIds.length > 0) {
        const { data: scores } = await supabase
          .from('scores_voluntarios_por_area')
          .select('voluntario_id, necesita_capacitacion')
          .in('voluntario_id', voluntariosIds);

        if (scores) {
          // Un voluntario necesita capacitación si AL MENOS UNA área la requiere
          const map: Record<string, boolean> = {};
          scores.forEach((s: any) => {
            if (s.necesita_capacitacion) map[s.voluntario_id] = true;
            else if (!(s.voluntario_id in map)) map[s.voluntario_id] = false;
          });
          setCapPendiente(map);
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetearPasswordIndividual = async (email: string) => {
    const password = prompt(`Nueva contraseña para ${email}:\n(Mínimo 6 caracteres)`);
    if (password === null) return;
    const passwordFinal = password.trim();
    if (!passwordFinal || passwordFinal.length < 6) { alert('Mínimo 6 caracteres'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Sesión expirada'); return; }
      const response = await fetch('/api/usuarios/resetear-password', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nuevaPassword: passwordFinal })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      alert(`✅ Contraseña actualizada para ${email}`);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
    if (filtroZona !== 'todas' && u.zona_id !== filtroZona) return false;
    if (filtroEstado === 'activo' && !u.activo) return false;
    if (filtroEstado === 'inactivo' && u.activo) return false;
    if (filtroCapacitacion === 'pendiente' && (u.rol !== 'voluntario' || !capPendiente[u.id])) return false;
    if (filtroCapacitacion === 'al_dia' && (u.rol !== 'voluntario' || capPendiente[u.id] !== false)) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
      const email = u.email.toLowerCase();
      const tel = (u.telefono || '').toLowerCase();
      if (!fullName.includes(q) && !email.includes(q) && !tel.includes(q)) return false;
    }
    return true;
  });

  const getRolBadgeColor = (rol: string) => {
    const map: Record<string, string> = {
      director: 'bg-red-100 text-red-700 border-red-200',
      admin: 'bg-red-100 text-red-700 border-red-200',
      equipo_profesional: 'bg-purple-100 text-purple-700 border-purple-200',
      psicopedagogia: 'bg-purple-100 text-purple-700 border-purple-200',
      coordinador: 'bg-sol-100 text-sol-700 border-sol-200',
      voluntario: 'bg-crecimiento-50 text-crecimiento-700 border-crecimiento-200',
      trabajador_social: 'bg-amber-100 text-amber-700 border-amber-200',
      trabajadora_social: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return map[rol] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getRolNombre = (rol: string) => {
    const map: Record<string, string> = {
      director: 'Director',
      admin: 'Admin',
      equipo_profesional: 'Equipo Profesional',
      psicopedagogia: 'Profesional',
      coordinador: 'Coordinador',
      voluntario: 'Voluntario',
      trabajador_social: 'Trabajador Social',
      trabajadora_social: 'Trabajadora Social',
    };
    return map[rol] || rol;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Volver</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">
                👥 Gestionar Perfiles
              </h1>
              <div className="w-16 sm:w-24"></div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Acciones rápidas */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/usuarios/nuevo"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all font-medium font-outfit shadow-sm active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Agregar usuario
            </Link>
            <Link
              href="/dashboard/usuarios/importar"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl hover:bg-white hover:shadow-sm transition-all font-medium font-outfit active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </Link>
          </div>

          {/* Toggle vista */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVistaCards(true)}
              className={`p-2.5 rounded-xl transition-all ${vistaCards ? 'bg-crecimiento-100 text-crecimiento-700' : 'bg-white/60 text-neutro-piedra hover:bg-white/80'}`}
              title="Vista tarjetas"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setVistaCards(false)}
              className={`p-2.5 rounded-xl transition-all ${!vistaCards ? 'bg-crecimiento-100 text-crecimiento-700' : 'bg-white/60 text-neutro-piedra hover:bg-white/80'}`}
              title="Vista tabla"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-4 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutro-piedra" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit text-sm min-h-[44px]"
              />
            </div>

            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="px-3 py-2.5 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 text-neutro-carbon font-outfit text-sm min-h-[44px]"
            >
              <option value="todos">Todos los roles</option>
              <option value="director">Directores</option>
              <option value="equipo_profesional">Equipo Profesional</option>
              <option value="voluntario">Voluntarios</option>
              <option value="admin">Admin</option>
              <option value="psicopedagogia">Profesionales (legacy)</option>
              <option value="coordinador">Coordinadores (legacy)</option>
              <option value="trabajador_social">Trabajadores Sociales (legacy)</option>
            </select>

            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="px-3 py-2.5 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 text-neutro-carbon font-outfit text-sm min-h-[44px]"
            >
              <option value="todas">Todos los equipos</option>
              {zonas.map(z => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2.5 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 text-neutro-carbon font-outfit text-sm min-h-[44px]"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>

            <select
              value={filtroCapacitacion}
              onChange={(e) => setFiltroCapacitacion(e.target.value)}
              className="px-3 py-2.5 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 text-neutro-carbon font-outfit text-sm min-h-[44px]"
            >
              <option value="todos">Capacitaciones: Todos</option>
              <option value="al_dia">✅ Al día</option>
              <option value="pendiente">⚠️ Pendiente</option>
            </select>
          </div>
        </div>

        {/* Contador */}
        <p className="mb-4 text-sm text-neutro-piedra font-outfit">
          Mostrando <span className="font-semibold text-neutro-carbon">{usuariosFiltrados.length}</span> de {usuarios.length} usuarios
        </p>

        {/* ===== VISTA CARDS ===== */}
        {vistaCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {usuariosFiltrados.map((u) => (
              <div
                key={u.id}
                className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-5 shadow-[0_4px_16px_rgba(242,201,76,0.1)] hover:shadow-[0_8px_32px_rgba(242,201,76,0.15)] transition-all"
              >
                {/* Header: Avatar + Name + Rol */}
                <div className="flex items-start gap-4 mb-4">
                  {u.foto_perfil_url ? (
                    <img
                      src={getDriveImageUrl(u.foto_perfil_url) || u.foto_perfil_url}
                      alt={`${u.nombre} ${u.apellido}`}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                      <span className="text-white font-quicksand font-bold text-xl">
                        {(u.nombre?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-quicksand font-bold text-neutro-carbon truncate">
                      {u.nombre || 'Sin nombre'} {u.apellido || ''}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRolBadgeColor(u.rol)}`}>
                        {getRolNombre(u.rol)}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-crecimiento-400' : 'bg-red-400'}`} title={u.activo ? 'Activo' : 'Inactivo'} />
                      {/* Badge de estado de capacitaciones para voluntarios */}
                      {u.rol === 'voluntario' && u.id in capPendiente && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          capPendiente[u.id]
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-crecimiento-50 text-crecimiento-700'
                        }`}>
                          {capPendiente[u.id] ? '⚠️ Cap.' : '✅ Cap.'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-2 text-sm font-outfit">
                  <div className="flex items-center gap-2 text-neutro-piedra">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.telefono && (
                    <div className="flex items-center gap-2 text-neutro-piedra">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{u.telefono}</span>
                    </div>
                  )}
                  {u.zona_nombre && u.zona_nombre !== 'Sin equipo' && (
                    <div className="flex items-center gap-2 text-neutro-piedra">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{u.zona_nombre}</span>
                    </div>
                  )}
                  {u.direccion && (
                    <div className="flex items-center gap-2 text-neutro-piedra">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-0" />
                      <span className="truncate text-xs">{u.direccion}</span>
                    </div>
                  )}
                </div>

                {/* Expanded detail */}
                {perfilExpandido === u.id && (
                  <div className="mt-3 pt-3 border-t border-white/40 space-y-1.5 text-xs font-outfit text-neutro-piedra">
                    {u.fecha_nacimiento && (
                      <div className="flex justify-between">
                        <span>Nacimiento:</span>
                        <span className="text-neutro-carbon">{new Date(u.fecha_nacimiento).toLocaleDateString('es-AR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Ingreso:</span>
                      <span className="text-neutro-carbon">{u.fecha_ingreso ? new Date(u.fecha_ingreso).toLocaleDateString('es-AR') : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Últ. conexión:</span>
                      <span className="text-neutro-carbon">
                        {u.ultima_conexion ? new Date(u.ultima_conexion).toLocaleDateString('es-AR') : 'Nunca'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Registrado:</span>
                      <span className="text-neutro-carbon">{new Date(u.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-white/40 flex items-center gap-2">
                  <Link
                    href={`/dashboard/usuarios/${u.id}/perfil`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-outfit font-medium text-neutro-piedra hover:text-neutro-carbon bg-white/60 rounded-xl hover:bg-white/80 transition-all active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Perfil
                  </Link>
                  <Link
                    href={`/dashboard/usuarios/${u.id}/editar`}
                    className="flex-1 text-center px-3 py-1.5 text-xs font-outfit font-medium text-crecimiento-700 bg-crecimiento-50 rounded-xl hover:bg-crecimiento-100 transition-all active:scale-95 border border-crecimiento-200"
                  >
                    Editar
                  </Link>
                  {(perfil?.rol === 'director' || perfil?.rol === 'admin') && (
                    <button
                      onClick={() => resetearPasswordIndividual(u.email)}
                      className="px-3 py-1.5 text-xs font-outfit font-medium text-orange-700 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all active:scale-95 border border-orange-200"
                      title="Resetear contraseña"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== VISTA TABLA ===== */
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/40">
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Equipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutro-piedra uppercase tracking-wider font-outfit">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30">
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-white/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.foto_perfil_url ? (
                            <img src={getDriveImageUrl(u.foto_perfil_url) || u.foto_perfil_url} alt="" className="w-9 h-9 rounded-xl object-cover border border-white shadow-sm" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center border border-white shadow-sm">
                              <span className="text-white font-bold text-sm">{(u.nombre?.[0] || '?').toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm text-neutro-carbon font-outfit">{u.nombre} {u.apellido}</div>
                            {u.direccion && <div className="text-xs text-neutro-piedra font-outfit truncate max-w-[200px]">{u.direccion}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutro-carbon font-outfit">{u.email}</div>
                        {u.telefono && <div className="text-xs text-neutro-piedra font-outfit">{u.telefono}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRolBadgeColor(u.rol)}`}>
                          {getRolNombre(u.rol)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutro-piedra font-outfit">{u.zona_nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium font-outfit ${u.activo ? 'text-crecimiento-600' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-crecimiento-400' : 'bg-red-400'}`} />
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/usuarios/${u.id}/perfil`}
                            className="text-xs text-neutro-piedra hover:text-neutro-carbon font-medium font-outfit"
                          >
                            Perfil
                          </Link>
                          <Link
                            href={`/dashboard/usuarios/${u.id}/editar`}
                            className="text-xs text-crecimiento-600 hover:text-crecimiento-700 font-medium font-outfit"
                          >
                            Editar
                          </Link>
                          {(perfil?.rol === 'director' || perfil?.rol === 'admin') && (
                            <button
                              onClick={() => resetearPasswordIndividual(u.email)}
                              className="text-xs text-orange-600 hover:text-orange-700 font-medium font-outfit"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {usuariosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-neutro-piedra font-outfit">No se encontraron usuarios con los filtros seleccionados.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando...</p>
        </div>
      </div>
    }>
      <UsuariosPageContent />
    </Suspense>
  );
}
