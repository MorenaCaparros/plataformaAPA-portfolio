/**
 * run-migrations.mjs
 * Ejecutar con: node scripts/run-migrations.mjs
 * Corre ALTER TABLE + seed de datos demo contra Supabase
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Leer .env.local manualmente
const envPath = path.join(__dirname, '../.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) env[k.trim()] = rest.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runSQL(description, ...statements) {
  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_raw', { sql }).catch(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
      // Fallback: use direct REST insert/upsert per table
      console.log(`  ⚠️  RPC no disponible para: "${description}" — usar SQL Editor manualmente`);
      return false;
    }
  }
  console.log(`  ✅ ${description}`);
  return true;
}

// ─── VERIFICAR COLUMNAS EXISTENTES ──────────────────────────
async function checkColumn(table, column) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .limit(1);
  return !error;
}

// ─── SEED ZONAS ─────────────────────────────────────────────
async function seedZonas() {
  const zonas = [
    { id: 'zona-001', nombre: 'Zona Norte', descripcion: 'Barrios norte de la ciudad', activa: true },
    { id: 'zona-002', nombre: 'Zona Sur',   descripcion: 'Barrios sur de la ciudad',   activa: true },
    { id: 'zona-003', nombre: 'Zona Centro',descripcion: 'Barrios céntricos',           activa: true },
  ];
  const { error } = await supabase.from('zonas').upsert(zonas, { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error('  ❌ zonas:', error.message); return false; }
  console.log(`  ✅ Zonas (${zonas.length})`);
  return true;
}

// ─── SEED PERFILES ──────────────────────────────────────────
async function seedPerfiles() {
  const perfiles = [
    { id: 'b1000000-0000-0000-0000-000000000001', email: 'admin@demo.apa',       nombre: 'Admin Demo',      rol: 'admin',       activo: true },
    { id: 'b1000000-0000-0000-0000-000000000002', email: 'equipo@demo.apa',      nombre: 'Equipo Demo',     rol: 'coordinador', zona_id: 'zona-001', activo: true },
    { id: 'b1000000-0000-0000-0000-000000000006', email: 'voluntario1@demo.apa', nombre: 'Valentina Ramos', rol: 'voluntario',  zona_id: 'zona-001', activo: true },
  ];
  const { error } = await supabase.from('perfiles').upsert(perfiles, { onConflict: 'id' });
  if (error) { console.error('  ❌ perfiles:', error.message); return false; }
  console.log(`  ✅ Perfiles (${perfiles.length})`);
  return true;
}

// ─── SEED NIÑOS ─────────────────────────────────────────────
async function seedNinos() {
  const ninos = [
    { id: 'nino-d01', alias: 'Tomás',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector',  escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d02', alias: 'Luna',     rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',     escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d03', alias: 'Marcos',   rango_etario: '10-12', nivel_alfabetizacion: 'intermedio',  escolarizado: false, zona_id: 'zona-002', activo: true },
    { id: 'nino-d04', alias: 'Sofía',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector',  escolarizado: true,  zona_id: 'zona-002', activo: true },
    { id: 'nino-d05', alias: 'Facundo',  rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',     escolarizado: true,  zona_id: 'zona-003', activo: true },
    { id: 'nino-d06', alias: 'Milagros', rango_etario: '10-12', nivel_alfabetizacion: 'avanzado',    escolarizado: true,  zona_id: 'zona-003', activo: true },
  ];
  // Insert only, ignore conflicts in case ninos table has different required fields
  const { error } = await supabase.from('ninos').upsert(ninos, { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error('  ❌ ninos:', error.message); return false; }
  console.log(`  ✅ Niños (${ninos.length})`);
  return true;
}

// ─── SEED ASIGNACIONES ──────────────────────────────────────
async function seedAsignaciones() {
  const asignaciones = [
    { id: 'asig-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d01', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-01' },
    { id: 'asig-d02', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d02', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-05' },
  ];
  const { error } = await supabase.from('asignaciones').upsert(asignaciones, { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error('  ❌ asignaciones:', error.message); return false; }
  console.log(`  ✅ Asignaciones (${asignaciones.length})`);
  return true;
}

// ─── SEED SESIONES ──────────────────────────────────────────
async function seedSesiones() {
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

  const items1 = [
    { id: 'conc-01', categoria: 'conciencia_fonologica', texto: 'Identifica rimas', valor: 3 },
    { id: 'lec-01',  categoria: 'lectura',               texto: 'Lee sílabas directas', valor: 2 },
  ];
  const items2 = [
    { id: 'conc-01', categoria: 'conciencia_fonologica', texto: 'Identifica rimas', valor: 4 },
    { id: 'lec-01',  categoria: 'lectura',               texto: 'Lee sílabas directas', valor: 3 },
  ];
  const items3 = [
    { id: 'conc-01', categoria: 'conciencia_fonologica', texto: 'Identifica rimas', valor: 4 },
    { id: 'lec-01',  categoria: 'lectura',               texto: 'Lee sílabas directas', valor: 4 },
  ];
  const items5 = [
    { id: 'conc-01', categoria: 'conciencia_fonologica', texto: 'Identifica rimas', valor: 5 },
    { id: 'lec-01',  categoria: 'lectura',               texto: 'Lee sílabas directas', valor: 5 },
  ];

  const sesiones = [
    {
      id: 'ses-d01', nino_id: 'nino-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006',
      fecha: daysAgo(21), duracion_minutos: 45, items: items1,
      observaciones_libres: 'Tomás estuvo muy atento. Le costó combinar consonantes pero identificó bien las vocales.',
      objetivo_sesion: 'Practicar sílabas directas MA, ME, MI, MO, MU',
      actividad_realizada: 'Leímos tarjetas con sílabas y armamos palabras con letras móviles.',
      tipo_sesion: 'individual', created_offline: false,
    },
    {
      id: 'ses-d02', nino_id: 'nino-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006',
      fecha: daysAgo(14), duracion_minutos: 50, items: items2,
      observaciones_libres: 'Mejoró notablemente en la lectura de sílabas. Se nota avance sostenido.',
      objetivo_sesion: 'Reforzar lectura de sílabas directas y comenzar con trabadas',
      actividad_realizada: 'Actividad con libro de cuentos cortos. Tomás leyó 3 frases solo.',
      tipo_sesion: 'individual', created_offline: false,
    },
    {
      id: 'ses-d03', nino_id: 'nino-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006',
      fecha: daysAgo(7), duracion_minutos: 40, items: items3,
      observaciones_libres: 'Excelente sesión. Tomás sorprendió con su nivel de atención y fluidez.',
      objetivo_sesion: 'Evaluación informal de progreso mensual',
      actividad_realizada: 'Dictado de 10 palabras simples y lectura de párrafo corto.',
      tipo_sesion: 'individual', created_offline: false,
    },
    {
      id: 'ses-d04', nino_id: 'nino-d02', voluntario_id: 'b1000000-0000-0000-0000-000000000006',
      fecha: daysAgo(10), duracion_minutos: 55, items: items5,
      observaciones_libres: 'Luna tiene un nivel excelente. Trabaja de forma muy autónoma.',
      objetivo_sesion: 'Avanzar hacia lectura comprensiva de textos cortos',
      actividad_realizada: 'Lectura de cuento y preguntas de comprensión oral.',
      tipo_sesion: 'individual', created_offline: false,
    },
    {
      id: 'ses-d05', nino_id: 'nino-d02', voluntario_id: 'b1000000-0000-0000-0000-000000000006',
      fecha: daysAgo(3), duracion_minutos: 45, items: items5,
      observaciones_libres: 'Luna leyó un texto completo de 5 oraciones con muy buena comprensión.',
      objetivo_sesion: 'Lectura comprensiva y escritura espontánea',
      actividad_realizada: 'Escribió 3 oraciones sobre su día favorito. Excelente ortografía.',
      tipo_sesion: 'individual', created_offline: false,
    },
  ];

  const { error } = await supabase.from('sesiones').upsert(sesiones, { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error('  ❌ sesiones:', error.message); return false; }
  console.log(`  ✅ Sesiones (${sesiones.length})`);
  return true;
}

// ─── VERIFICAR COLUMNAS ─────────────────────────────────────
async function checkAndReportColumns() {
  console.log('\n📋 Verificando columnas críticas...');
  const checks = [
    ['sesiones', 'objetivo_sesion'],
    ['sesiones', 'actividad_realizada'],
    ['sesiones', 'tipo_sesion'],
    ['sesiones', 'created_offline'],
  ];
  for (const [table, col] of checks) {
    const ok = await checkColumn(table, col);
    console.log(`  ${ok ? '✅' : '❌'} ${table}.${col}`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando migraciones y seed de datos demo...\n');
  console.log('⚠️  NOTA: Las columnas (ALTER TABLE) deben correrse manualmente en el SQL Editor de Supabase.');
  console.log('    Abrí scripts/fix-db-and-seed.sql y ejecutá las secciones 1 y 2 primero.\n');

  console.log('📦 Cargando datos demo...');
  await seedZonas();
  await seedPerfiles();
  await seedNinos();
  await seedAsignaciones();
  await seedSesiones();

  await checkAndReportColumns();

  console.log('\n✅ Proceso completado.');
  console.log('   Si sesiones.objetivo_sesion aparece ❌, corré el SQL de la sección 1 en el SQL Editor.');
}

main().catch(console.error);
