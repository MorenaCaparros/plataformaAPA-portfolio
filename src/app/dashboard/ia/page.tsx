'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  Brain,
  BookOpen,
  User,
  Send,
  History,
  X,
  Clock,
  MessageSquare,
  Lightbulb,
  Search,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface Nino {
  id: string;
  alias: string;
  rango_etario: string;
  nivel_alfabetizacion: string | null;
  zona_id?: string | null;
}

interface Mensaje {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  fuentes?: { titulo: string; autor: string }[];
  timestamp: Date;
}

interface EntradaHistorial {
  id: string;
  modo: string;
  pregunta: string;
  respuesta: string;
  created_at: string;
  ninos?: { alias: string; rango_etario: string } | null;
  fuentes?: { titulo: string; autor: string }[] | null;
}

// ─── Sugerencias por defecto ──────────────────────────────────────────────
const SUGERENCIAS_GENERALES = [
  '¿Cómo evolucionó en las últimas sesiones?',
  '¿Qué patrones de dificultad se observan?',
  'Generá un resumen de su progreso',
  '¿En qué áreas muestra más fortalezas?',
  '¿Qué estrategias recomendás para mejorar su atención?',
  '¿Está alineado con sus planes de intervención?',
];

// ─── Componente principal ──────────────────────────────────────────────────
export default function ModuloIAPage() {
  const { user, perfil } = useAuth();

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);

  // Niños - multi-selección
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [ninosSeleccionados, setNinosSeleccionados] = useState<Nino[]>([]);
  const [busquedaNino, setBusquedaNino] = useState('');
  const [mostrarDropdownNino, setMostrarDropdownNino] = useState(false);
  const [cargandoNinos, setCargandoNinos] = useState(true);
  const [zonas, setZonas] = useState<{ id: string; nombre: string }[]>([]);
  const [zonaActiva, setZonaActiva] = useState<string | null>(null);

  // Historial
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [totalHistorial, setTotalHistorial] = useState(0);

  const mensajesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Efectos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      cargarNinos();
      cargarHistorial();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, perfil?.rol]);

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdownNino(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Carga de niños según rol ──────────────────────────────────────────────
  const cargarNinos = async () => {
    if (!user) return;
    setCargandoNinos(true);
    try {
      const rol = perfil?.rol;
      if (rol === 'voluntario') {
        const { data } = await supabase
          .from('asignaciones')
          .select('nino:ninos ( id, alias, rango_etario, nivel_alfabetizacion )')
          .eq('voluntario_id', user.id)
          .eq('activa', true);
        const ninosAsignados = ((data || []) as any[])
          .map((a) => a.nino)
          .filter(Boolean) as Nino[];
        setNinos(ninosAsignados);
      } else {
        const { data } = await supabase
          .from('ninos')
          .select('id, alias, rango_etario, nivel_alfabetizacion, zona_id')
          .order('alias', { ascending: true });
        setNinos((data || []) as Nino[]);
        // Cargar zonas
        const { data: zonasData } = await supabase
          .from('zonas')
          .select('id, nombre')
          .order('nombre');
        setZonas((zonasData || []) as { id: string; nombre: string }[]);
      }
    } finally {
      setCargandoNinos(false);
    }
  };

  // ── Historial ──────────────────────────────────────────────────────────
  const cargarHistorial = async (offset = 0) => {
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/ia/historial?limite=10&offset=${offset}`);
      if (!res.ok) return;
      const json = await res.json();
      if (offset === 0) {
        setHistorial(json.historial || []);
      } else {
        setHistorial(prev => [...prev, ...(json.historial || [])]);
      }
      setTotalHistorial(json.total || 0);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // ── Enviar consulta ──────────────────────────────────────────────────────
  const enviarConsulta = async (preguntaTexto?: string) => {
    const texto = preguntaTexto || input.trim();
    if (!texto || cargando) return;
    if (ninosSeleccionados.length === 0) {
      alert('Seleccioná al menos un niño para consultar');
      return;
    }

    const msgUsuario: Mensaje = {
      id: Date.now().toString(),
      rol: 'usuario',
      contenido: texto,
      timestamp: new Date(),
    };
    setMensajes(prev => [...prev, msgUsuario]);
    setInput('');
    setCargando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto, ninoIds: ninosSeleccionados.map(n => n.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la consulta');

      setMensajes(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          rol: 'asistente',
          contenido: data.respuesta || '',
          fuentes: data.fuentes || [],
          timestamp: new Date(),
        },
      ]);
      cargarHistorial(0);
    } catch (error: any) {
      setMensajes(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          rol: 'asistente',
          contenido: `❌ ${error.message || 'Error al procesar la consulta'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  // ── Cargar consulta del historial ────────────────────────────────────────
  const cargarDesdeHistorial = (entrada: EntradaHistorial) => {
    if (entrada.ninos) {
      const ninoEncontrado = ninos.find(n => n.alias === (entrada.ninos as any).alias);
      if (ninoEncontrado) setNinosSeleccionados([ninoEncontrado]);
    } else if ((entrada as any).tags_usados?.length > 0) {
      const aliasesHistorial: string[] = (entrada as any).tags_usados || [];
      const ninosEncontrados = ninos.filter(n => aliasesHistorial.includes(n.alias));
      if (ninosEncontrados.length > 0) setNinosSeleccionados(ninosEncontrados);
    }
    setMensajes([
      { id: `hist-u-${entrada.id}`, rol: 'usuario', contenido: entrada.pregunta, timestamp: new Date(entrada.created_at) },
      { id: `hist-a-${entrada.id}`, rol: 'asistente', contenido: entrada.respuesta, fuentes: (entrada.fuentes as any) || [], timestamp: new Date(entrada.created_at) },
    ]);
    setMostrarHistorial(false);
  };

  const ninosFiltrados = ninos.filter(n =>
    n.alias.toLowerCase().includes(busquedaNino.toLowerCase())
  );

  const agregarNino = (n: Nino) => {
    if (!ninosSeleccionados.find(x => x.id === n.id)) {
      setNinosSeleccionados(prev => [...prev, n]);
      setMensajes([]);
    }
    setBusquedaNino('');
    setMostrarDropdownNino(false);
  };

  const quitarNino = (id: string) => {
    setNinosSeleccionados(prev => prev.filter(n => n.id !== id));
    setMensajes([]);
  };

  const seleccionarTodos = () => {
    setNinosSeleccionados([...ninos]);
    setZonaActiva(null);
    setMensajes([]);
    setBusquedaNino('');
  };

  const seleccionarPorZona = (zonaId: string) => {
    const ninosDeZona = ninos.filter(n => n.zona_id === zonaId);
    setNinosSeleccionados(ninosDeZona);
    setZonaActiva(zonaId);
    setMensajes([]);
    setBusquedaNino('');
  };

  const limpiarChat = () => {
    setMensajes([]);
    setNinosSeleccionados([]);
    setBusquedaNino('');
    setZonaActiva(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-crecimiento-500 flex items-center justify-center shadow-md">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Módulo IA</h1>
                <p className="text-xs text-gray-500">Análisis psicopedagógico por niño</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mensajes.length > 0 && (
                <button onClick={limpiarChat} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Nueva consulta</span>
                </button>
              )}
              <button
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${mostrarHistorial ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Historial</span>
                {totalHistorial > 0 && (
                  <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalHistorial > 99 ? '99+' : totalHistorial}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">

        {/* PANEL HISTORIAL */}
        {mostrarHistorial && (
          <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-500" />
                  Historial de consultas
                </h2>
                <button onClick={() => setMostrarHistorial(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {cargandoHistorial ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />)}</div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay consultas anteriores</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map(entrada => (
                    <button key={entrada.id} onClick={() => cargarDesdeHistorial(entrada)}
                      className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {entrada.ninos ? (
                          <span className="text-xs bg-crecimiento-100 text-crecimiento-700 px-1.5 py-0.5 rounded">
                            👤 {(entrada.ninos as any).alias}
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Consulta</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entrada.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium line-clamp-2 group-hover:text-purple-800">{entrada.pregunta}</p>
                    </button>
                  ))}
                  {historial.length < totalHistorial && (
                    <button onClick={() => cargarHistorial(historial.length)} className="w-full py-2 text-sm text-purple-600 hover:text-purple-800 font-medium">
                      Cargar más ({totalHistorial - historial.length} restantes)
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ÁREA PRINCIPAL */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* SELECTOR DE NIÑOS - multi-selección */}
          <div className="bg-white border-b border-gray-100 px-4 py-3">
            <div ref={dropdownRef} className="relative max-w-2xl">

              {/* Fila de controles */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 flex-1 min-w-0">
                  <User className="w-3.5 h-3.5 text-crecimiento-500 flex-shrink-0" />
                  Niños a consultar
                  <span className="text-red-400 ml-0.5">*</span>
                </label>
                {perfil?.rol !== 'voluntario' && ninos.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={seleccionarTodos}
                      className="text-xs px-2.5 py-1 rounded-lg bg-crecimiento-50 text-crecimiento-700 hover:bg-crecimiento-100 border border-crecimiento-200 transition-colors whitespace-nowrap"
                    >
                      Todos ({ninos.length})
                    </button>
                    {zonas.length > 0 && (
                      <select
                        value={zonaActiva || ''}
                        onChange={e => e.target.value ? seleccionarPorZona(e.target.value) : (setNinosSeleccionados([]), setZonaActiva(null), setMensajes([]))}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors"
                      >
                        <option value="">Por zona...</option>
                        {zonas.map(z => (
                          <option key={z.id} value={z.id}>{z.nombre}</option>
                        ))}
                      </select>
                    )}
                    {ninosSeleccionados.length > 0 && (
                      <button
                        onClick={() => { setNinosSeleccionados([]); setZonaActiva(null); setMensajes([]); }}
                        className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Chips de niños seleccionados */}
              {ninosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ninosSeleccionados.length <= 6 ? (
                    ninosSeleccionados.map(n => (
                      <span key={n.id} className="flex items-center gap-1 text-xs bg-crecimiento-100 text-crecimiento-800 px-2 py-1 rounded-full border border-crecimiento-200">
                        {n.alias}
                        <button onClick={() => quitarNino(n.id)} className="ml-0.5 text-crecimiento-500 hover:text-crecimiento-800">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs bg-crecimiento-100 text-crecimiento-800 px-3 py-1.5 rounded-full border border-crecimiento-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {ninosSeleccionados.length} niños seleccionados
                      <button onClick={() => { setNinosSeleccionados([]); setZonaActiva(null); setMensajes([]); }} className="ml-1 text-crecimiento-500 hover:text-crecimiento-800">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Input de búsqueda para agregar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={busquedaNino}
                  onChange={e => { setBusquedaNino(e.target.value); setMostrarDropdownNino(true); }}
                  onFocus={() => setMostrarDropdownNino(true)}
                  placeholder={cargandoNinos ? 'Cargando...' : ninosSeleccionados.length > 0 ? 'Agregar otro niño...' : perfil?.rol === 'voluntario' ? 'Buscar entre tus niños asignados...' : 'Buscar y agregar niños...'}
                  disabled={cargandoNinos}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent disabled:bg-gray-50"
                />
              </div>

              {/* Dropdown */}
              {mostrarDropdownNino && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {ninos.length === 0 && !cargandoNinos ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      {perfil?.rol === 'voluntario' ? 'No tenés niños asignados actualmente' : 'No hay niños registrados'}
                    </div>
                  ) : ninosFiltrados.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Sin resultados para &quot;{busquedaNino}&quot;</div>
                  ) : (
                    ninosFiltrados.map(n => {
                      const yaSeleccionado = ninosSeleccionados.some(x => x.id === n.id);
                      return (
                        <button key={n.id}
                          onClick={() => yaSeleccionado ? quitarNino(n.id) : agregarNino(n)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${yaSeleccionado ? 'bg-crecimiento-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${yaSeleccionado ? 'bg-crecimiento-500 text-white' : 'bg-crecimiento-100 text-crecimiento-700'}`}>
                            {yaSeleccionado ? <CheckCircle2 className="w-4 h-4" /> : n.alias[0].toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-800">{n.alias}</p>
                            <p className="text-xs text-gray-500">{n.rango_etario}{n.nivel_alfabetizacion ? ` · ${n.nivel_alfabetizacion}` : ''}</p>
                          </div>
                          {yaSeleccionado && <span className="text-xs text-crecimiento-600 font-medium flex-shrink-0">✓ Seleccionado</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MENSAJES */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {mensajes.length === 0 && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-purple-500 to-crecimiento-500 rounded-2xl p-5 text-white mb-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-7 h-7" />
                    <h2 className="text-xl font-bold">Análisis con IA</h2>
                  </div>
                  <p className="text-white/80 text-sm">
                    Combiná sesiones registradas, planes de intervención y bibliografía psicopedagógica para analizar el progreso de uno o varios niños.
                  </p>
                  {ninosSeleccionados.length === 0 && <p className="mt-2 text-white/90 text-sm font-medium">↑ Seleccioná uno o más niños arriba para comenzar</p>}
                </div>

                {ninosSeleccionados.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-sol-500" />
                      Preguntas sugeridas {ninosSeleccionados.length === 1 ? `para ${ninosSeleccionados[0].alias}` : `para el grupo (${ninosSeleccionados.length} niños)`}
                    </h3>
                    <div className="space-y-2">
                      {SUGERENCIAS_GENERALES.map((sug, i) => (
                        <button key={i} onClick={() => enviarConsulta(sug)}
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2 group"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-400">
                    <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Seleccioná uno o más niños para ver las sugerencias de consulta</p>
                  </div>
                )}
              </div>
            )}

            {mensajes.map(msg => (
              <div key={msg.id} className={`flex ${msg.rol === 'usuario' ? 'justify-end' : 'justify-start'} max-w-4xl mx-auto w-full`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.rol === 'usuario' ? 'bg-gradient-to-br from-crecimiento-500 to-crecimiento-600 text-white shadow-md' : 'bg-white border border-gray-200 shadow-sm'}`}>
                  {msg.rol === 'asistente' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-400 to-crecimiento-500 flex items-center justify-center">
                        <Brain className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 font-medium">Asistente IA</span>
                      {ninosSeleccionados.length > 0 && (
                        <span className="text-xs bg-crecimiento-100 text-crecimiento-700 px-2 py-0.5 rounded-full">
                          {ninosSeleccionados.length === 1 ? ninosSeleccionados[0].alias : `${ninosSeleccionados.length} niños`}
                        </span>
                      )}
                    </div>
                  )}

                  {msg.rol === 'usuario' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.contenido}</p>
                  ) : (
                    <div className="space-y-1 text-sm text-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        h2: ({ children }) => (
                          <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0 pb-1.5 border-b border-gray-100">
                            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-crecimiento-400 to-crecimiento-600 flex-shrink-0" />
                            <h2 className="font-quicksand font-bold text-base text-gray-900">{children}</h2>
                          </div>
                        ),
                        h3: ({ children }) => <h3 className="font-quicksand font-semibold text-sm text-gray-800 mt-3 mb-1.5 first:mt-0">{children}</h3>,
                        p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed my-1.5">{children}</p>,
                        ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
                        ol: ({ children }) => <ol className="space-y-1 my-2 ml-1 list-decimal list-inside">{children}</ol>,
                        li: ({ children }) => (
                          <li className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-crecimiento-400 flex-shrink-0 mt-1.5" />
                            <span className="flex-1">{children}</span>
                          </li>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-sol-400 pl-3 py-0.5 my-2 bg-sol-50/60 rounded-r-lg text-gray-700 italic text-sm">{children}</blockquote>
                        ),
                        code: ({ children }) => <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                        hr: () => <hr className="my-3 border-t border-gray-100" />,
                      }}>
                        {msg.contenido}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.fuentes && msg.fuentes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Bibliografía consultada:
                      </p>
                      <div className="space-y-1">
                        {msg.fuentes.map((f, i) => (
                          <p key={i} className="text-xs text-gray-600">📄 <strong>{f.titulo}</strong>{f.autor ? ` — ${f.autor}` : ''}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className={`text-xs mt-2 ${msg.rol === 'usuario' ? 'text-crecimiento-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex justify-start max-w-4xl mx-auto w-full">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-400 to-crecimiento-500 flex items-center justify-center animate-pulse">
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span className="text-xs text-gray-500">
                      Analizando{ninosSeleccionados.length === 1 ? ` a ${ninosSeleccionados[0].alias}` : ninosSeleccionados.length > 1 ? ` ${ninosSeleccionados.length} niños` : ''}...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={mensajesEndRef} />
          </div>

          {/* INPUT */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            {ninosSeleccionados.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {ninosSeleccionados.length <= 3 ? (
                  ninosSeleccionados.map(n => (
                    <span key={n.id} className="text-xs bg-crecimiento-50 text-crecimiento-700 border border-crecimiento-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {n.alias}
                    </span>
                  ))
                ) : (
                  <span className="text-xs bg-crecimiento-50 text-crecimiento-700 border border-crecimiento-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    {ninosSeleccionados.length} niños seleccionados
                  </span>
                )}
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); enviarConsulta(); }} className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarConsulta(); } }}
                placeholder={ninosSeleccionados.length === 0 ? 'Seleccioná al menos un niño arriba para consultar...' : ninosSeleccionados.length === 1 ? `Preguntá sobre ${ninosSeleccionados[0].alias}... (Enter para enviar)` : `Preguntá sobre el grupo de ${ninosSeleccionados.length} niños... (Enter para enviar)`}
                rows={2}
                disabled={cargando || ninosSeleccionados.length === 0}
                className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={cargando || !input.trim() || ninosSeleccionados.length === 0}
                className="p-3 bg-gradient-to-br from-purple-500 to-crecimiento-500 text-white rounded-xl hover:from-purple-600 hover:to-crecimiento-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 flex-shrink-0"
              >
                {cargando ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-1.5 hidden sm:block">
              💡 Shift+Enter para nueva línea · Enter para enviar · Las consultas se guardan en el historial
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
