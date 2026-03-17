'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Perfil = {
  id: string;
  rol: 'voluntario' | 'coordinador' | 'psicopedagogia' | 'trabajador_social' | 'director';
  zona_id: string | null;
  nombre: string;
  apellido: string;
  created_at: string;
  email?: string;
};

export default function UsuariosPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoRol, setNuevoRol] = useState<string>('');

  useEffect(() => {
    if (perfil && perfil.rol !== 'director') {
      router.push('/dashboard');
      return;
    }

    if (perfil?.rol === 'director') {
      fetchUsuarios();
    }
  }, [perfil, router]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los perfiles
      const { data: perfiles, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener emails de auth.users (requiere service role, por ahora simulamos)
      // En producción esto debería ser una API route
      setUsuarios(perfiles || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      setLoading(false);
    }
  };

  const handleCambiarRol = async (userId: string, rol: string) => {
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ rol: rol as any })
        .eq('id', userId);

      if (error) throw error;

      alert(`✅ Rol actualizado a: ${getRolLabel(rol)}`);
      setEditando(null);
      fetchUsuarios();
    } catch (error) {
      console.error('Error cambiando rol:', error);
      alert('❌ Error al cambiar rol');
    }
  };

  const getRolLabel = (rol: string) => {
    const labels: Record<string, string> = {
      voluntario: '🙋 Voluntario',
      coordinador: '👔 Coordinador',
      psicopedagogia: '🎓 Profesional',
      trabajador_social: '🏥 Trabajador Social',
      director: '⭐ Director',
    };
    return labels[rol] || rol;
  };

  const getRolColor = (rol: string) => {
    const colors: Record<string, string> = {
      voluntario: 'bg-sol-100 text-sol-700',
      coordinador: 'bg-green-100 text-green-800',
      psicopedagogia: 'bg-purple-100 text-purple-800',
      trabajador_social: 'bg-pink-100 text-pink-800',
      director: 'bg-yellow-100 text-yellow-800',
    };
    return colors[rol] || 'bg-gray-100 text-gray-800';
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
    const matchBusqueda = busqueda === '' || 
      u.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.nombre && u.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (u.apellido && u.apellido.toLowerCase().includes(busqueda.toLowerCase()));
    return matchRol && matchBusqueda;
  });

  if (!perfil || perfil.rol !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600 font-semibold mb-4">⚠️ Acceso denegado</p>
          <p className="text-gray-600 mb-4">Solo directores pueden acceder a esta página.</p>
          <Link href="/dashboard" className="text-crecimiento-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/dashboard/admin" className="text-gray-600 hover:text-gray-900">
              ← Volver
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600">
            Administrar roles, permisos y accesos del sistema
          </p>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar por ID o nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
              />
            </div>

            {/* Filtro por rol */}
            <div className="sm:w-48">
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent"
              >
                <option value="todos">Todos los roles</option>
                <option value="voluntario">Voluntarios</option>
                <option value="coordinador">Coordinadores</option>
                <option value="psicopedagogia">Profesionales</option>
                <option value="trabajador_social">Trabajadores Sociales</option>
                <option value="director">Directores</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total: <strong>{usuarios.length}</strong></span>
            <span>Filtrados: <strong>{usuariosFiltrados.length}</strong></span>
          </div>
        </div>

        {/* Lista de usuarios */}
        {usuariosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">No se encontraron usuarios.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zona
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {usuario.id.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editando === usuario.id ? (
                          <select
                            value={nuevoRol || usuario.rol}
                            onChange={(e) => setNuevoRol(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            <option value="voluntario">Voluntario</option>
                            <option value="coordinador">Coordinador</option>
                            <option value="psicopedagogia">Profesional</option>
                            <option value="trabajador_social">Trabajador Social</option>
                            <option value="director">Director</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRolColor(usuario.rol)}`}>
                            {getRolLabel(usuario.rol)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.zona_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(usuario.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editando === usuario.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCambiarRol(usuario.id, nuevoRol || usuario.rol)}
                              className="text-green-600 hover:text-green-900"
                            >
                              ✓ Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditando(null);
                                setNuevoRol('');
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              ✕ Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditando(usuario.id);
                                setNuevoRol(usuario.rol);
                              }}
                              className="text-crecimiento-600 hover:text-crecimiento-800"
                            >
                              ✏️ Editar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ayuda */}
        <div className="mt-6 bg-sol-50 border-l-4 border-sol-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-sol-800">
                Sobre los Roles
              </h3>
              <div className="text-sm text-sol-700 mt-2 space-y-1">
                <p><strong>Voluntario:</strong> Registra sesiones, ve solo sus niños asignados</p>
                <p><strong>Coordinador:</strong> Gestiona su equipo/barrio, asigna voluntarios</p>
                <p><strong>Profesional:</strong> Acceso completo a evaluaciones, planificación, IA</p>
                <p><strong>Trabajador Social:</strong> Entrevistas familiares, intervenciones sociales</p>
                <p><strong>Director:</strong> Acceso total, gestión del sistema, reportes institucionales</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
