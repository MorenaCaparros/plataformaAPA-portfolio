'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, X, Users, Baby, ChevronDown, ChevronUp, Check, Search, Pencil, Trash2 } from 'lucide-react';

interface Equipo {
  id: string;
  nombre: string;
  descripcion: string | null;
  total_ninos: number;
  total_voluntarios: number;
  coordinador: string | null;
}

interface Voluntario {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  zona_id: string | null;
}

const ROLES_PUEDEN_GESTIONAR = ['director', 'psicopedagogia', 'admin', 'coordinador'];

export default function EquiposPage() {
  const { user, perfil, loading: authLoading } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Modal Agregar Zona ────────────────────────────────────────────────────
  const [showAddZona, setShowAddZona] = useState(false);
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState('');
  const [nuevaZonaDesc, setNuevaZonaDesc] = useState('');
  const [guardandoZona, setGuardandoZona] = useState(false);
  const [errorZona, setErrorZona] = useState('');

  // ─── Modal Asignar Voluntarios ─────────────────────────────────────────────
  const [zonaAsignando, setZonaAsignando] = useState<Equipo | null>(null);
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [loadingVols, setLoadingVols] = useState(false);
  const [busquedaVol, setBusquedaVol] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [expandedZona, setExpandedZona] = useState<string | null>(null);

  // ─── Editar zona ─────────────────────────────────────────────────────────
  const [zonaEditando, setZonaEditando] = useState<Equipo | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  // ─── Eliminar zona ────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [guardandoDelete, setGuardandoDelete] = useState(false);

  // ─── Inline niños por zona ────────────────────────────────────────────────
  const [expandedNinos, setExpandedNinos] = useState<string | null>(null);
  const [ninosPorZona, setNinosPorZona] = useState<Record<string, {id: string; alias: string; rango_etario: string}[]>>({});
  const [cargandoNinosZona, setCargandoNinosZona] = useState<string | null>(null);

  // ─── Modal Asignar Niños ──────────────────────────────────────────────────
  const [zonaAsignandoNinos, setZonaAsignandoNinos] = useState<Equipo | null>(null);
  const [todosNinos, setTodosNinos] = useState<{id: string; alias: string; rango_etario: string; zona_id: string | null}[]>([]);
  const [loadingNinosModal, setLoadingNinosModal] = useState(false);
  const [busquedaNino, setBusquedaNino] = useState('');
  const [guardandoNinoAsign, setGuardandoNinoAsign] = useState(false);

  const puedeGestionar = perfil && ROLES_PUEDEN_GESTIONAR.includes(perfil.rol);

  const toggleNinosZona = async (zonaId: string) => {
    if (expandedNinos === zonaId) {
      setExpandedNinos(null);
      return;
    }
    setExpandedNinos(zonaId);
    if (ninosPorZona[zonaId] !== undefined) return; // ya en caché
    setCargandoNinosZona(zonaId);
    try {
      const { data } = await supabase
        .from('ninos')
        .select('id, alias, rango_etario')
        .eq('zona_id', zonaId)
        .eq('activo', true)
        .order('alias', { ascending: true });
      setNinosPorZona(prev => ({ ...prev, [zonaId]: data || [] }));
    } finally {
      setCargandoNinosZona(null);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchEquipos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchEquipos = async () => {
    try {
      setLoading(true);
      const { data: zonasData, error: zonasError } = await supabase
        .from('zonas')
        .select('id, nombre, descripcion')
        .order('nombre', { ascending: true });

      if (zonasError) throw zonasError;

      const equiposConStats = await Promise.all(
        (zonasData || []).map(async (zona: any) => {
          const { count: countNinos } = await supabase
            .from('ninos')
            .select('*', { count: 'exact', head: true })
            .eq('zona_id', zona.id);

          const { count: countVoluntarios } = await supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('zona_id', zona.id)
            .eq('rol', 'voluntario');

          const { data: coordinadores } = await supabase
            .from('perfiles')
            .select('nombre, apellido')
            .eq('zona_id', zona.id)
            .eq('rol', 'coordinador')
            .limit(1);

          return {
            id: zona.id,
            nombre: zona.nombre,
            descripcion: zona.descripcion,
            total_ninos: countNinos || 0,
            total_voluntarios: countVoluntarios || 0,
            coordinador: coordinadores?.[0]
              ? [coordinadores[0].nombre, coordinadores[0].apellido].filter(Boolean).join(' ')
              : null,
          };
        })
      );

      setEquipos(equiposConStats);
    } catch (error) {
      console.error('Error cargando equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Crear zona ────────────────────────────────────────────────────────────
  const handleCrearZona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaZonaNombre.trim()) return;
    setGuardandoZona(true);
    setErrorZona('');
    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaZonaNombre.trim(), descripcion: nuevaZonaDesc.trim() || null }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al crear la zona');
      setShowAddZona(false);
      setNuevaZonaNombre('');
      setNuevaZonaDesc('');
      await fetchEquipos();
    } catch (err: any) {
      setErrorZona(err.message || 'Error al crear la zona');
    } finally {
      setGuardandoZona(false);
    }
  };

  // ─── Editar zona ─────────────────────────────────────────────────────────
  const handleEditarZona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zonaEditando || !editNombre.trim()) return;
    setGuardandoEdit(true);
    setErrorEdit('');
    try {
      const res = await fetch('/api/equipos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zonaEditando.id, nombre: editNombre.trim(), descripcion: editDesc.trim() || null }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al guardar los cambios');
      setZonaEditando(null);
      await fetchEquipos();
    } catch (err: any) {
      setErrorEdit(err.message || 'Error al guardar los cambios');
    } finally {
      setGuardandoEdit(false);
    }
  };

  // ─── Eliminar zona ────────────────────────────────────────────────────────
  const handleEliminarZona = async () => {
    if (!confirmDeleteId) return;
    const zona = equipos.find(e => e.id === confirmDeleteId);
    if (zona && (zona.total_ninos > 0 || zona.total_voluntarios > 0)) {
      alert('No se puede eliminar una zona con niños o voluntarios asignados. Primero reasignálos.');
      setConfirmDeleteId(null);
      return;
    }
    setGuardandoDelete(true);
    try {
      const res = await fetch(`/api/equipos?id=${confirmDeleteId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al eliminar la zona');
      setConfirmDeleteId(null);
      await fetchEquipos();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la zona');
    } finally {
      setGuardandoDelete(false);
    }
  };

  // ─── Abrir modal asignación niños ─────────────────────────────────────────
  const openAsignacionNinos = useCallback(async (zona: Equipo) => {
    setZonaAsignandoNinos(zona);
    setBusquedaNino('');
    setLoadingNinosModal(true);
    try {
      const { data } = await supabase
        .from('ninos')
        .select('id, alias, rango_etario, zona_id')
        .eq('activo', true)
        .order('alias', { ascending: true });
      setTodosNinos(data || []);
    } catch (err) {
      console.error('Error cargando niños:', err);
    } finally {
      setLoadingNinosModal(false);
    }
  }, []);

  // ─── Toggle asignación zona (niño) ────────────────────────────────────────
  const toggleZonaNino = async (nino: {id: string; alias: string; rango_etario: string; zona_id: string | null}) => {
    if (!zonaAsignandoNinos) return;
    setGuardandoNinoAsign(true);
    try {
      const newZonaId = nino.zona_id === zonaAsignandoNinos.id ? null : zonaAsignandoNinos.id;
      const { error } = await supabase
        .from('ninos')
        .update({ zona_id: newZonaId })
        .eq('id', nino.id);
      if (error) throw error;
      setTodosNinos(prev =>
        prev.map(n => n.id === nino.id ? { ...n, zona_id: newZonaId } : n)
      );
      // Invalidar caché inline para refrescar al cerrar
      setNinosPorZona(prev => {
        const updated = { ...prev };
        if (newZonaId === zonaAsignandoNinos.id) {
          const entry = { id: nino.id, alias: nino.alias, rango_etario: nino.rango_etario };
          updated[zonaAsignandoNinos.id] = [
            ...(updated[zonaAsignandoNinos.id] || []).filter(n => n.id !== nino.id),
            entry,
          ].sort((a, b) => a.alias.localeCompare(b.alias));
        } else {
          if (updated[zonaAsignandoNinos.id]) {
            updated[zonaAsignandoNinos.id] = updated[zonaAsignandoNinos.id].filter(n => n.id !== nino.id);
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Error asignando zona al niño:', err);
    } finally {
      setGuardandoNinoAsign(false);
    }
  };

  // ─── Abrir modal asignación voluntarios ──────────────────────────────────
  const openAsignacion = useCallback(async (zona: Equipo) => {
    setZonaAsignando(zona);
    setBusquedaVol('');
    setLoadingVols(true);
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido, email, zona_id')
        .eq('rol', 'voluntario')
        .order('apellido', { ascending: true });
      if (error) throw error;
      setVoluntarios(data || []);
    } catch (err) {
      console.error('Error cargando voluntarios:', err);
    } finally {
      setLoadingVols(false);
    }
  }, []);

  // ─── Toggle asignación zona ────────────────────────────────────────────────
  const toggleZonaVoluntario = async (vol: Voluntario) => {
    if (!zonaAsignando) return;
    setGuardandoAsignacion(true);
    try {
      const newZonaId = vol.zona_id === zonaAsignando.id ? null : zonaAsignando.id;
      const { error } = await supabase
        .from('perfiles')
        .update({ zona_id: newZonaId })
        .eq('id', vol.id);
      if (error) throw error;
      setVoluntarios(prev =>
        prev.map(v => v.id === vol.id ? { ...v, zona_id: newZonaId } : v)
      );
    } catch (err) {
      console.error('Error asignando zona:', err);
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const volsFiltrados = voluntarios.filter(v => {
    const term = busquedaVol.toLowerCase();
    return (
      v.nombre?.toLowerCase().includes(term) ||
      v.apellido?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term)
    );
  });

  const volsEnEstaZona = volsFiltrados.filter(v => v.zona_id === zonaAsignando?.id);
  const volsOtros = volsFiltrados.filter(v => v.zona_id !== zonaAsignando?.id);

  const ninosFiltrados = todosNinos.filter(n => {
    const term = busquedaNino.toLowerCase();
    return n.alias.toLowerCase().includes(term);
  });
  const ninosEnEstaZona = ninosFiltrados.filter(n => n.zona_id === zonaAsignandoNinos?.id);
  const ninosOtros = ninosFiltrados.filter(n => n.zona_id !== zonaAsignandoNinos?.id);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(164,198,57,0.15)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto mb-4"></div>
          <p className="text-neutro-piedra font-outfit">Cargando equipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Modal Agregar Zona */}
      {showAddZona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-neutro-carbon font-quicksand text-lg">➕ Nueva Zona</h3>
              <button onClick={() => { setShowAddZona(false); setErrorZona(''); }} className="p-3 hover:bg-neutro-lienzo rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrearZona} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutro-carbon mb-1.5 font-outfit">
                  Nombre de la zona *
                </label>
                <input
                  type="text"
                  value={nuevaZonaNombre}
                  onChange={e => setNuevaZonaNombre(e.target.value)}
                  placeholder="ej: Barrio Norte, Villa San Pedro..."
                  className="w-full px-4 py-3 border border-neutro-piedra/20 rounded-2xl font-outfit text-sm focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-carbon mb-1.5 font-outfit">
                  Descripción <span className="text-neutro-piedra font-normal">(opcional)</span>
                </label>
                <textarea
                  value={nuevaZonaDesc}
                  onChange={e => setNuevaZonaDesc(e.target.value)}
                  rows={2}
                  placeholder="Descripción breve de la zona..."
                  className="w-full px-4 py-3 border border-neutro-piedra/20 rounded-2xl font-outfit text-sm focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 outline-none resize-none"
                />
              </div>
              {errorZona && (
                <p className="text-sm text-impulso-700 bg-impulso-50 px-3 py-2 rounded-xl font-outfit">
                  ❌ {errorZona}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAddZona(false); setErrorZona(''); }} disabled={guardandoZona}
                  className="flex-1 px-4 py-3 border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-lienzo transition-colors disabled:opacity-50 min-h-[48px]">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoZona || !nuevaZonaNombre.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]">
                  {guardandoZona ? '⏳ Guardando...' : '✓ Crear Zona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Niños */}
      {zonaAsignandoNinos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-neutro-carbon font-quicksand text-lg">
                  👶 Niños — {zonaAsignandoNinos.nombre}
                </h3>
                <p className="text-xs text-neutro-piedra font-outfit mt-0.5">
                  Tocá un niño para asignarlo o quitarlo de esta zona
                </p>
              </div>
              <button onClick={() => { setZonaAsignandoNinos(null); fetchEquipos(); }} className="p-2 hover:bg-neutro-lienzo rounded-xl transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutro-piedra" />
                <input
                  type="text"
                  value={busquedaNino}
                  onChange={e => setBusquedaNino(e.target.value)}
                  placeholder="Buscar niño..."
                  className="w-full pl-9 pr-4 py-2.5 border border-neutro-piedra/20 rounded-xl font-outfit text-sm focus:ring-2 focus:ring-impulso-300 focus:border-impulso-400 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0">
              {loadingNinosModal ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-impulso-200 border-t-impulso-400 mx-auto"></div>
                </div>
              ) : (
                <>
                  {ninosEnEstaZona.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-impulso-700 uppercase tracking-wide mb-2 font-outfit">
                        En esta zona ({ninosEnEstaZona.length})
                      </p>
                      <div className="space-y-2">
                        {ninosEnEstaZona.map(nino => (
                          <button key={nino.id} onClick={() => toggleZonaNino(nino)} disabled={guardandoNinoAsign}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-impulso-50 border border-impulso-200/60 rounded-2xl hover:bg-impulso-100 transition-all text-left disabled:opacity-60 min-h-[52px]">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-impulso-900 font-outfit text-sm truncate">{nino.alias}</p>
                              <p className="text-xs text-impulso-600 font-outfit">{nino.rango_etario} años</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-impulso-600 font-outfit font-medium">Asignado</span>
                              <div className="w-5 h-5 rounded-full bg-impulso-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ninosOtros.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutro-piedra uppercase tracking-wide mb-2 font-outfit">
                        Otros niños ({ninosOtros.length})
                      </p>
                      <div className="space-y-2">
                        {ninosOtros.map(nino => (
                          <button key={nino.id} onClick={() => toggleZonaNino(nino)} disabled={guardandoNinoAsign}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-neutro-piedra/15 rounded-2xl hover:bg-impulso-50 hover:border-impulso-200 transition-all text-left disabled:opacity-60 min-h-[52px]">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutro-carbon font-outfit text-sm truncate">{nino.alias}</p>
                              <p className="text-xs text-neutro-piedra font-outfit">
                                {nino.rango_etario} años
                                {nino.zona_id && nino.zona_id !== zonaAsignandoNinos?.id && (
                                  <span className="ml-2 text-sol-600">(otra zona)</span>
                                )}
                              </p>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-neutro-piedra/30 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ninosFiltrados.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-neutro-piedra font-outfit text-sm">No hay niños registrados</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-5 border-t flex-shrink-0">
              <button onClick={() => { setZonaAsignandoNinos(null); fetchEquipos(); }}
                className="w-full px-4 py-3 bg-gradient-to-r from-impulso-500 to-impulso-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(230,57,70,0.2)] transition-all min-h-[48px]">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Voluntarios */}
      {zonaAsignando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-neutro-carbon font-quicksand text-lg">
                  👥 Voluntarios — {zonaAsignando.nombre}
                </h3>
                <p className="text-xs text-neutro-piedra font-outfit mt-0.5">
                  Tocá un voluntario para asignarlo o quitarlo de esta zona
                </p>
              </div>
              <button onClick={() => { setZonaAsignando(null); fetchEquipos(); }} className="p-3 hover:bg-neutro-lienzo rounded-xl transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutro-piedra" />
                <input
                  type="text"
                  value={busquedaVol}
                  onChange={e => setBusquedaVol(e.target.value)}
                  placeholder="Buscar voluntario..."
                  className="w-full pl-9 pr-4 py-2.5 border border-neutro-piedra/20 rounded-xl font-outfit text-sm focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0">
              {loadingVols ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-crecimiento-200 border-t-crecimiento-400 mx-auto"></div>
                </div>
              ) : (
                <>
                  {volsEnEstaZona.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-crecimiento-700 uppercase tracking-wide mb-2 font-outfit">
                        En esta zona ({volsEnEstaZona.length})
                      </p>
                      <div className="space-y-2">
                        {volsEnEstaZona.map(vol => (
                          <button key={vol.id} onClick={() => toggleZonaVoluntario(vol)} disabled={guardandoAsignacion}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-crecimiento-50 border border-crecimiento-200/60 rounded-2xl hover:bg-crecimiento-100 transition-all text-left disabled:opacity-60 min-h-[52px]">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-crecimiento-900 font-outfit text-sm truncate">
                                {[vol.nombre, vol.apellido].filter(Boolean).join(' ') || '—'}
                              </p>
                              <p className="text-xs text-crecimiento-700 font-outfit truncate">{vol.email}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-crecimiento-600 font-outfit font-medium">Asignado</span>
                              <div className="w-5 h-5 rounded-full bg-crecimiento-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {volsOtros.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutro-piedra uppercase tracking-wide mb-2 font-outfit">
                        Disponibles ({volsOtros.length})
                      </p>
                      <div className="space-y-2">
                        {volsOtros.map(vol => (
                          <button key={vol.id} onClick={() => toggleZonaVoluntario(vol)} disabled={guardandoAsignacion}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-neutro-piedra/15 rounded-2xl hover:bg-crecimiento-50 hover:border-crecimiento-200 transition-all text-left disabled:opacity-60 min-h-[52px]">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutro-carbon font-outfit text-sm truncate">
                                {[vol.nombre, vol.apellido].filter(Boolean).join(' ') || '—'}
                              </p>
                              <p className="text-xs text-neutro-piedra font-outfit truncate">
                                {vol.email}
                                {vol.zona_id && vol.zona_id !== zonaAsignando?.id && (
                                  <span className="ml-2 text-sol-600">(otra zona)</span>
                                )}
                              </p>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-neutro-piedra/30 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {volsFiltrados.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-neutro-piedra font-outfit text-sm">No hay voluntarios registrados</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-5 border-t flex-shrink-0">
              <button onClick={() => { setZonaAsignando(null); fetchEquipos(); }}
                className="w-full px-4 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all min-h-[48px]">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Zona */}
      {zonaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-neutro-carbon font-quicksand text-lg">✏️ Editar Zona</h3>
              <button onClick={() => setZonaEditando(null)} className="p-3 hover:bg-neutro-lienzo rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditarZona} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutro-carbon mb-1.5 font-outfit">Nombre *</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full px-4 py-3 border border-neutro-piedra/20 rounded-2xl font-outfit text-sm focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutro-carbon mb-1.5 font-outfit">
                  Descripción <span className="text-neutro-piedra font-normal">(opcional)</span>
                </label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-neutro-piedra/20 rounded-2xl font-outfit text-sm focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 outline-none resize-none"
                />
              </div>
              {errorEdit && (
                <p className="text-sm text-impulso-700 bg-impulso-50 px-3 py-2 rounded-xl font-outfit">❌ {errorEdit}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setZonaEditando(null)} disabled={guardandoEdit}
                  className="flex-1 px-4 py-3 border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-lienzo transition-colors disabled:opacity-50 min-h-[48px]">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEdit || !editNombre.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]">
                  {guardandoEdit ? '⏳ Guardando...' : '✔ Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmDeleteId && (() => {
        const zona = equipos.find(e => e.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 bg-impulso-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-impulso-500" />
              </div>
              <h3 className="font-bold text-neutro-carbon font-quicksand text-lg mb-2">¿Eliminar zona?</h3>
              <p className="text-sm text-neutro-piedra font-outfit mb-1">
                <span className="font-semibold text-neutro-carbon">{zona?.nombre}</span>
              </p>
              {(zona?.total_ninos ?? 0) > 0 || (zona?.total_voluntarios ?? 0) > 0 ? (
                <p className="text-sm text-impulso-600 font-outfit bg-impulso-50 rounded-xl px-3 py-2 mt-2 mb-4">
                  ⚠️ Esta zona tiene {zona?.total_ninos} niño(s) y {zona?.total_voluntarios} voluntario(s).
                  Reasignálos antes de eliminarla.
                </p>
              ) : (
                <p className="text-sm text-neutro-piedra font-outfit mt-1 mb-4">Esta acción no se puede deshacer.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)} disabled={guardandoDelete}
                  className="flex-1 px-4 py-3 border border-neutro-piedra/20 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:bg-neutro-lienzo transition-colors disabled:opacity-50 min-h-[48px]">
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarZona}
                  disabled={guardandoDelete || (zona?.total_ninos ?? 0) > 0 || (zona?.total_voluntarios ?? 0) > 0}
                  className="flex-1 px-4 py-3 bg-impulso-500 text-white rounded-2xl font-outfit font-semibold text-sm hover:bg-impulso-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]">
                  {guardandoDelete ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Navbar flotante */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(164,198,57,0.1)] px-6 py-4">
            <div className="flex justify-between items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px] flex-shrink-0">
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-neutro-carbon font-quicksand flex items-center gap-2">
                <span>🏘️</span> Equipos / Zonas
              </h1>
              {puedeGestionar ? (
                <button onClick={() => setShowAddZona(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all min-h-[44px] flex-shrink-0">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Agregar zona</span>
                </button>
              ) : (
                <div className="w-16 sm:w-32" />
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <p className="text-neutro-piedra font-outfit mb-6 text-sm">
          Gestión de equipos de trabajo organizados por barrios/zonas
        </p>

        {equipos.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(164,198,57,0.1)] p-8 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-crecimiento-400/20 to-sol-400/20 flex items-center justify-center">
              <span className="text-4xl">🏘️</span>
            </div>
            <p className="text-neutro-carbon font-outfit text-lg mb-2">No hay zonas configuradas</p>
            {puedeGestionar && (
              <button onClick={() => setShowAddZona(true)}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all">
                <Plus className="w-4 h-4" />
                Agregar primera zona
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {equipos.map((equipo) => {
              const isExpanded = expandedZona === equipo.id;
              return (
                <div key={equipo.id}
                  className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_4px_16px_rgba(164,198,57,0.1)] hover:shadow-[0_8px_32px_rgba(164,198,57,0.15)] transition-all duration-300">

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-neutro-carbon font-quicksand mb-1 truncate">
                          {equipo.nombre}
                        </h3>
                        {equipo.descripcion && (
                          <p className="text-sm text-neutro-piedra font-outfit line-clamp-2">{equipo.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                        {puedeGestionar && (
                          <>
                            <button
                              onClick={() => { setZonaEditando(equipo); setEditNombre(equipo.nombre); setEditDesc(equipo.descripcion || ''); setErrorEdit(''); }}
                              className="p-2 rounded-xl hover:bg-sol-50 text-neutro-piedra hover:text-sol-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Editar zona"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(equipo.id)}
                              className="p-2 rounded-xl hover:bg-impulso-50 text-neutro-piedra hover:text-impulso-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Eliminar zona"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <span className="text-3xl ml-1">🏘️</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-impulso-50 rounded-xl border border-impulso-200/30">
                        <Baby className="w-4 h-4 text-impulso-500" />
                        <span className="font-bold text-impulso-700 font-quicksand">{equipo.total_ninos}</span>
                        <span className="text-xs text-impulso-600 font-outfit">niños</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-crecimiento-50 rounded-xl border border-crecimiento-200/30">
                        <Users className="w-4 h-4 text-crecimiento-500" />
                        <span className="font-bold text-crecimiento-700 font-quicksand">{equipo.total_voluntarios}</span>
                        <span className="text-xs text-crecimiento-600 font-outfit">voluntarios</span>
                      </div>
                    </div>

                    {equipo.coordinador && (
                      <p className="text-xs text-neutro-piedra font-outfit mb-4">
                        <span className="font-medium">Coordinador/a:</span>{' '}
                        <span className="text-crecimiento-700 font-medium">{equipo.coordinador}</span>
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleNinosZona(equipo.id)}
                        className="flex-1 text-center px-4 py-2.5 bg-gradient-to-r from-impulso-400 to-impulso-500 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(230,57,70,0.2)] transition-all font-outfit font-medium text-sm min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Baby className="w-4 h-4" />
                        {expandedNinos === equipo.id ? 'Ocultar' : 'Ver Niños'}
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedNinos === equipo.id ? 'rotate-180' : ''}`} />
                      </button>
                      {puedeGestionar ? (
                        <button onClick={() => openAsignacion(equipo)}
                          className="flex-1 text-center px-4 py-2.5 bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl hover:shadow-[0_8px_24px_rgba(164,198,57,0.3)] transition-all font-outfit font-medium text-sm min-h-[44px] flex items-center justify-center gap-1.5">
                          <Users className="w-4 h-4" /> Voluntarios
                        </button>
                      ) : (
                        <Link href={`/dashboard/usuarios?zona=${equipo.id}`}
                          className="flex-1 text-center px-4 py-2.5 bg-crecimiento-50 text-crecimiento-700 rounded-2xl hover:bg-crecimiento-100 transition-all font-outfit font-medium text-sm min-h-[44px] flex items-center justify-center gap-1.5 border border-crecimiento-200/40">
                          <Users className="w-4 h-4" /> Ver Equipo
                        </Link>
                      )}
                      <button onClick={() => setExpandedZona(isExpanded ? null : equipo.id)}
                        className="p-2.5 border border-neutro-piedra/15 rounded-2xl hover:bg-neutro-lienzo transition-colors text-neutro-piedra min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Ver accesos rápidos">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Inline niños de la zona */}
                  {expandedNinos === equipo.id && (
                    <div className="border-t border-white/60 px-6 py-4 bg-impulso-50/20">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-neutro-carbon font-quicksand">Niños en esta zona</p>
                        <Link
                          href={`/dashboard/ninos?zona=${equipo.id}`}
                          className="text-xs text-impulso-600 font-outfit hover:underline"
                        >
                          Lista completa →
                        </Link>
                      </div>
                      {puedeGestionar && (
                        <button
                          onClick={() => openAsignacionNinos(equipo)}
                          className="mb-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-impulso-50 border border-impulso-200/50 text-impulso-700 rounded-xl font-outfit text-xs font-medium hover:bg-impulso-100 transition-colors min-h-[36px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Asignar niños a esta zona
                        </button>
                      )}
                      {cargandoNinosZona === equipo.id ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin w-5 h-5 border-2 border-impulso-200 border-t-impulso-500 rounded-full" />
                        </div>
                      ) : (ninosPorZona[equipo.id] || []).length === 0 ? (
                        <p className="text-sm text-neutro-piedra text-center font-outfit py-2">Sin niños en esta zona</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(ninosPorZona[equipo.id] || []).map(nino => (
                            <Link
                              href={`/dashboard/ninos/${nino.id}`}
                              key={nino.id}
                              className="flex items-center justify-between px-3 py-2.5 bg-white/60 rounded-2xl text-sm hover:bg-white/90 transition-colors min-h-[44px] border border-white/60"
                            >
                              <span className="font-medium text-neutro-carbon font-outfit">{nino.alias}</span>
                              <span className="text-xs text-neutro-piedra font-outfit">{nino.rango_etario} años</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expandable quick links */}
                  {isExpanded && (
                    <div className="border-t border-white/60 px-6 py-4 bg-white/20 rounded-b-3xl">
                      <p className="text-sm font-medium text-neutro-carbon font-quicksand mb-3">Accesos rápidos</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link href={`/dashboard/sesiones?zona=${equipo.id}`}
                          className="px-3 py-2.5 bg-sol-50 text-sol-700 rounded-xl font-outfit text-xs font-medium hover:bg-sol-100 transition-colors text-center border border-sol-200/30 min-h-[40px] flex items-center justify-center">
                          📝 Ver Sesiones
                        </Link>
                        <Link href={`/dashboard/asistencia?zona=${equipo.id}`}
                          className="px-3 py-2.5 bg-crecimiento-50 text-crecimiento-700 rounded-xl font-outfit text-xs font-medium hover:bg-crecimiento-100 transition-colors text-center border border-crecimiento-200/30 min-h-[40px] flex items-center justify-center">
                          ✅ Asistencia
                        </Link>
                        <Link href={`/dashboard/metricas?zona=${equipo.id}`}
                          className="px-3 py-2.5 bg-impulso-50 text-impulso-700 rounded-xl font-outfit text-xs font-medium hover:bg-impulso-100 transition-colors text-center border border-impulso-200/30 min-h-[40px] flex items-center justify-center">
                          📊 Métricas
                        </Link>
                        <Link href={`/dashboard/usuarios?zona=${equipo.id}`}
                          className="px-3 py-2.5 bg-neutro-lienzo text-neutro-carbon rounded-xl font-outfit text-xs font-medium hover:bg-neutro-piedra/10 transition-colors text-center border border-neutro-piedra/10 min-h-[40px] flex items-center justify-center">
                          👤 Usuarios
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
