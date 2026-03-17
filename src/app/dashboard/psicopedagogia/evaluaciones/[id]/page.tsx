'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Calendar,
  User,
  BookOpen,
  PenTool,
  Calculator,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface EvaluacionDetalle {
  id: string;
  nino_id: string;
  entrevistador_id: string;
  tipo: string;
  fecha: string;
  observaciones: string | null;
  conclusiones: string | null;
  acciones_sugeridas: string | null;
  created_at: string;
  nino: {
    id: string;
    alias: string;
    fecha_nacimiento: string | null;
    rango_etario: string | null;
    nivel_alfabetizacion: string | null;
    zona: { nombre: string } | null;
  } | null;
  entrevistador: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
  } | null;
}

interface EvaluacionData {
  lenguaje?: {
    comprension_ordenes?: number;
    identificacion_objetos?: number;
    formacion_oraciones?: number;
    pronunciacion?: number;
    notas?: string;
  };
  grafismo?: {
    agarre_lapiz?: string;
    tipo_trazo?: string;
    representacion_figuras?: number;
    notas?: string;
  };
  lectoescritura?: {
    reconocimiento_vocales?: number;
    reconocimiento_consonantes?: number;
    identificacion_silabas?: number;
    lectura_palabras?: number;
    lectura_textos?: number;
    escritura_nombre?: number;
    escritura_palabras?: number;
    escritura_oraciones?: number;
    comprension_lectora?: number;
    notas?: string;
  };
  matematicas?: {
    conteo?: number;
    reconocimiento_numeros?: number;
    suma_basica?: number;
    resta_basica?: number;
    razonamiento_logico?: number;
    notas?: string;
  };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function ScoreBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return <span className="text-gray-400">—</span>;
  const colors = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
  const labels = ['', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${colors[value] || 'bg-gray-100 text-gray-600'}`}>
      <span className="font-bold">{value}</span>
      <span className="text-xs opacity-75">/ 5 · {labels[value]}</span>
    </span>
  );
}

function ScoreBar({ value }: { value?: number }) {
  if (!value) return null;
  const pct = (value / 5) * 100;
  const color = value <= 1 ? 'bg-red-400' : value <= 2 ? 'bg-orange-400' : value <= 3 ? 'bg-yellow-400' : value <= 4 ? 'bg-blue-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  color,
  children,
  avgScore,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  avgScore?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${color}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {avgScore !== undefined && (
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Promedio: {avgScore.toFixed(1)} / 5
          </span>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-56 text-sm text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
      <ScoreBar value={value} />
      <ScoreBadge value={value} />
    </div>
  );
}

function avg(...values: (number | undefined)[]) {
  const nums = values.filter((v): v is number => v !== undefined && v !== null);
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function EvaluacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
  const [parsedData, setParsedData] = useState<EvaluacionData | null>(null);
  const [conclusionLines, setConclusionLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvaluacion();
  }, [id]);

  async function fetchEvaluacion() {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/psicopedagogia/evaluaciones/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const json = await res.json();
      const ev: EvaluacionDetalle = json.evaluacion;
      setEvaluacion(ev);

      // Parse structured scoring data from observaciones field
      if (ev.observaciones) {
        const jsonMatch = ev.observaciones.match(/Datos de evaluación: ({[\s\S]*})/);
        if (jsonMatch) {
          try {
            setParsedData(JSON.parse(jsonMatch[1]));
          } catch {
            // Not parseable — show raw text
          }
        }
      }

      // Parse conclusiones into lines
      if (ev.conclusiones) {
        setConclusionLines(ev.conclusiones.split('\n').filter(Boolean));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar evaluación');
    } finally {
      setLoading(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crecimiento-500" />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !evaluacion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No se pudo cargar la evaluación
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-crecimiento-500 hover:bg-crecimiento-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { lenguaje, grafismo, lectoescritura, matematicas } = parsedData || {};
  const ninoAlias = evaluacion.nino?.alias ?? 'Sin alias';
  const evaluadorNombre = evaluacion.entrevistador
    ? `${evaluacion.entrevistador.nombre} ${evaluacion.entrevistador.apellido}`.trim()
    : 'Desconocido';

  // Extract observaciones_generales (text after the JSON block)
  const rawObs = evaluacion.observaciones || '';
  const generalNotes = rawObs.replace(/Datos de evaluación:[\s\S]*$/, '').trim();

  // Extract nivel de alfabetización from conclusiones first line
  const nivelLinea = conclusionLines.find(l => l.startsWith('Nivel de alfabetización:'));
  const nivelAlfa = evaluacion.nino?.nivel_alfabetizacion
    || nivelLinea?.replace('Nivel de alfabetización:', '').trim()
    || '—';

  // Dificultades and fortalezas from conclusiones
  const diffStart = conclusionLines.findIndex(l => l === 'Dificultades identificadas:');
  const fortStart = conclusionLines.findIndex(l => l === 'Fortalezas:');

  const dificultades = diffStart >= 0
    ? conclusionLines.slice(diffStart + 1, fortStart > diffStart ? fortStart : undefined).filter(l => l.startsWith('- ')).map(l => l.slice(2))
    : [];
  const fortalezas = fortStart >= 0
    ? conclusionLines.slice(fortStart + 1).filter(l => l.startsWith('- ')).map(l => l.slice(2))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sol-50 via-neutro-lienzo to-crecimiento-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Back + Header ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <nav className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-0.5">
              <Link href="/dashboard/psicopedagogia/evaluaciones" className="hover:text-crecimiento-600">
                Evaluaciones
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 dark:text-gray-200 font-medium">{ninoAlias}</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Evaluación Inicial · {ninoAlias}
            </h1>
          </div>
        </div>

        {/* ── Summary Card ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Niño info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-crecimiento-100 dark:bg-crecimiento-900/30 flex items-center justify-center text-2xl font-bold text-crecimiento-600 dark:text-crecimiento-400">
                {ninoAlias.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ninoAlias}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {evaluacion.nino?.rango_etario && (
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {evaluacion.nino.rango_etario} años
                    </span>
                  )}
                  {evaluacion.nino?.zona?.nombre && (
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                      📍 {evaluacion.nino.zona.nombre}
                    </span>
                  )}
                  {nivelAlfa !== '—' && (
                    <span className="bg-crecimiento-100 dark:bg-crecimiento-900/30 text-crecimiento-700 dark:text-crecimiento-400 px-2 py-0.5 rounded-full text-xs font-medium">
                      📚 {nivelAlfa}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300 md:text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {new Date(evaluacion.fecha).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <User className="w-4 h-4 text-gray-400" />
                <span>{evaluadorNombre}</span>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <ClipboardList className="w-4 h-4 text-gray-400" />
                <span className="px-2 py-0.5 bg-crecimiento-100 dark:bg-crecimiento-900/30 text-crecimiento-700 dark:text-crecimiento-400 rounded-full text-xs font-medium">
                  Evaluación Inicial
                </span>
              </div>
            </div>
          </div>

          {/* Link to child profile */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Link
              href={`/dashboard/ninos/${evaluacion.nino_id}`}
              className="inline-flex items-center gap-2 text-sm text-crecimiento-600 hover:text-crecimiento-700 dark:text-crecimiento-400 font-medium"
            >
              Ver perfil completo del niño <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Scoring sections ── */}
        {parsedData ? (
          <>
            {/* 1. Lenguaje */}
            {lenguaje && (
              <SectionCard
                icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
                title="1. Lenguaje y Vocabulario"
                color="bg-blue-50 dark:bg-blue-900/10"
                avgScore={avg(lenguaje.comprension_ordenes, lenguaje.identificacion_objetos, lenguaje.formacion_oraciones, lenguaje.pronunciacion)}
              >
                <ScoreRow label="Comprensión de órdenes simples" value={lenguaje.comprension_ordenes} />
                <ScoreRow label="Identificación de objetos cotidianos" value={lenguaje.identificacion_objetos} />
                <ScoreRow label="Formación de oraciones" value={lenguaje.formacion_oraciones} />
                <ScoreRow label="Pronunciación y articulación" value={lenguaje.pronunciacion} />
                {lenguaje.notas && (
                  <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Notas: </span>
                    {lenguaje.notas}
                  </div>
                )}
              </SectionCard>
            )}

            {/* 2. Grafismo */}
            {grafismo && (
              <SectionCard
                icon={<PenTool className="w-5 h-5 text-purple-600" />}
                title="2. Grafismo y Motricidad Fina"
                color="bg-purple-50 dark:bg-purple-900/10"
                avgScore={avg(grafismo.representacion_figuras)}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Agarre del lápiz</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      grafismo.agarre_lapiz === 'adecuado'
                        ? 'bg-green-100 text-green-700'
                        : grafismo.agarre_lapiz === 'en_desarrollo'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {grafismo.agarre_lapiz === 'adecuado' ? 'Adecuado'
                        : grafismo.agarre_lapiz === 'en_desarrollo' ? 'En desarrollo'
                        : 'Inadecuado'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de trazo</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      grafismo.tipo_trazo === 'firme'
                        ? 'bg-green-100 text-green-700'
                        : grafismo.tipo_trazo === 'irregular'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {grafismo.tipo_trazo === 'firme' ? 'Firme'
                        : grafismo.tipo_trazo === 'irregular' ? 'Irregular'
                        : 'Tembloroso'}
                    </span>
                  </div>
                </div>
                <ScoreRow label="Representación de figuras" value={grafismo.representacion_figuras} />
                {grafismo.notas && (
                  <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-purple-700 dark:text-purple-400">Notas: </span>
                    {grafismo.notas}
                  </div>
                )}
              </SectionCard>
            )}

            {/* 3. Lectoescritura */}
            {lectoescritura && (
              <SectionCard
                icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
                title="3. Lectura y Escritura"
                color="bg-emerald-50 dark:bg-emerald-900/10"
                avgScore={avg(
                  lectoescritura.reconocimiento_vocales,
                  lectoescritura.reconocimiento_consonantes,
                  lectoescritura.identificacion_silabas,
                  lectoescritura.lectura_palabras,
                  lectoescritura.lectura_textos,
                  lectoescritura.escritura_nombre,
                  lectoescritura.escritura_palabras,
                  lectoescritura.escritura_oraciones,
                  lectoescritura.comprension_lectora,
                )}
              >
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Lectura</p>
                    <ScoreRow label="Reconocimiento de vocales" value={lectoescritura.reconocimiento_vocales} />
                    <ScoreRow label="Reconocimiento de consonantes" value={lectoescritura.reconocimiento_consonantes} />
                    <ScoreRow label="Identificación de sílabas" value={lectoescritura.identificacion_silabas} />
                    <ScoreRow label="Lectura de palabras" value={lectoescritura.lectura_palabras} />
                    <ScoreRow label="Lectura de textos breves" value={lectoescritura.lectura_textos} />
                    <ScoreRow label="Comprensión lectora" value={lectoescritura.comprension_lectora} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Escritura</p>
                    <ScoreRow label="Escritura del nombre" value={lectoescritura.escritura_nombre} />
                    <ScoreRow label="Escritura de palabras" value={lectoescritura.escritura_palabras} />
                    <ScoreRow label="Escritura de oraciones" value={lectoescritura.escritura_oraciones} />
                  </div>
                </div>
                {lectoescritura.notas && (
                  <div className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Notas: </span>
                    {lectoescritura.notas}
                  </div>
                )}
              </SectionCard>
            )}

            {/* 4. Matemáticas */}
            {matematicas && (
              <SectionCard
                icon={<Calculator className="w-5 h-5 text-orange-600" />}
                title="4. Nociones Matemáticas"
                color="bg-orange-50 dark:bg-orange-900/10"
                avgScore={avg(
                  matematicas.conteo,
                  matematicas.reconocimiento_numeros,
                  matematicas.suma_basica,
                  matematicas.resta_basica,
                  matematicas.razonamiento_logico,
                )}
              >
                <ScoreRow label="Conteo" value={matematicas.conteo} />
                <ScoreRow label="Reconocimiento de números" value={matematicas.reconocimiento_numeros} />
                <ScoreRow label="Suma básica" value={matematicas.suma_basica} />
                <ScoreRow label="Resta básica" value={matematicas.resta_basica} />
                <ScoreRow label="Razonamiento lógico" value={matematicas.razonamiento_logico} />
                {matematicas.notas && (
                  <div className="mt-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-orange-700 dark:text-orange-400">Notas: </span>
                    {matematicas.notas}
                  </div>
                )}
              </SectionCard>
            )}
          </>
        ) : (
          /* Fallback: raw observaciones if not structured */
          rawObs && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-400" />
                Observaciones
              </h3>
              <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">{rawObs}</pre>
            </div>
          )
        )}

        {/* ── Conclusiones ── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Dificultades */}
          {dificultades.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Dificultades Identificadas
              </h3>
              <ul className="space-y-2">
                {dificultades.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fortalezas */}
          {fortalezas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Fortalezas Observadas
              </h3>
              <ul className="space-y-2">
                {fortalezas.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-1 w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Nivel de alfabetización destacado ── */}
        {nivelAlfa !== '—' && (
          <div className="bg-gradient-to-r from-crecimiento-500 to-crecimiento-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-crecimiento-100 text-sm font-medium">Nivel de alfabetización estimado</p>
                <p className="text-2xl font-bold">{nivelAlfa}</p>
              </div>
              <div className="ml-auto">
                <TrendingUp className="w-8 h-8 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* ── Observaciones generales ── */}
        {generalNotes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              Observaciones Generales
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {generalNotes}
            </p>
          </div>
        )}

        {/* ── Recomendaciones ── */}
        {evaluacion.acciones_sugeridas && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-crecimiento-500" />
              Recomendaciones
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {evaluacion.acciones_sugeridas}
            </p>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between pb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a evaluaciones
          </button>
          <Link
            href={`/dashboard/psicopedagogia/evaluaciones/nueva?ninoId=${evaluacion.nino_id}`}
            className="flex items-center gap-2 bg-crecimiento-500 hover:bg-crecimiento-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4" />
            Nueva evaluación para este niño
          </Link>
        </div>
      </div>
    </div>
  );
}
