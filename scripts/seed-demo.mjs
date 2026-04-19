/**
 * seed-demo.mjs - Run with: node scripts/seed-demo.mjs
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  process.stdout.write('ERROR: Missing SUPABASE env vars\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function upsert(table, rows, conflict = 'id') {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict, ignoreDuplicates: true });
  if (error) {
    process.stdout.write('FAIL ' + table + ': ' + error.message + '\n');
    return false;
  }
  process.stdout.write('OK   ' + table + ' (' + rows.length + ' rows)\n');
  return true;
}

async function checkCol(table, col) {
  const { error } = await supabase.from(table).select(col).limit(1);
  const status = error ? 'MISSING' : 'OK';
  process.stdout.write('COL  ' + table + '.' + col + ' -> ' + status + '\n');
  if (error) process.stdout.write('     ' + error.message + '\n');
}

async function main() {
  process.stdout.write('Starting seed...\n');

  // 1. Zonas
  await upsert('zonas', [
    { id: 'zona-001', nombre: 'Zona Norte',  descripcion: 'Barrios norte', activa: true },
    { id: 'zona-002', nombre: 'Zona Sur',    descripcion: 'Barrios sur',   activa: true },
    { id: 'zona-003', nombre: 'Zona Centro', descripcion: 'Barrios centro',activa: true },
  ]);

  // 2. Perfiles
  await upsert('perfiles', [
    { id: 'b1000000-0000-0000-0000-000000000001', email: 'admin@demo.apa',       nombre: 'Admin Demo',      rol: 'admin',       activo: true },
    { id: 'b1000000-0000-0000-0000-000000000002', email: 'equipo@demo.apa',      nombre: 'Equipo Demo',     rol: 'coordinador', zona_id: 'zona-001', activo: true },
    { id: 'b1000000-0000-0000-0000-000000000006', email: 'voluntario1@demo.apa', nombre: 'Valentina Ramos', rol: 'voluntario',  zona_id: 'zona-001', activo: true },
  ]);

  // 3. Ninos
  await upsert('ninos', [
    { id: 'nino-d01', alias: 'Tomas',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector',  escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d02', alias: 'Luna',     rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',     escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d03', alias: 'Marcos',   rango_etario: '10-12', nivel_alfabetizacion: 'intermedio',  escolarizado: false, zona_id: 'zona-002', activo: true },
    { id: 'nino-d04', alias: 'Sofia',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector',  escolarizado: true,  zona_id: 'zona-002', activo: true },
    { id: 'nino-d05', alias: 'Facundo',  rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',     escolarizado: true,  zona_id: 'zona-003', activo: true },
    { id: 'nino-d06', alias: 'Milagros', rango_etario: '10-12', nivel_alfabetizacion: 'avanzado',    escolarizado: true,  zona_id: 'zona-003', activo: true },
  ]);

  // 4. Asignaciones
  await upsert('asignaciones', [
    { id: 'asig-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d01', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-01' },
    { id: 'asig-d02', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d02', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-05' },
  ]);

  // 5. Sesiones
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
  const VOL = 'b1000000-0000-0000-0000-000000000006';

  const items_basic  = JSON.stringify([{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 3 }]);
  const items_good   = JSON.stringify([{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 4 }]);
  const items_great  = JSON.stringify([{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 5 }]);

  await upsert('sesiones', [
    { id: 'ses-d01', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(21), duracion_minutos: 45, items: items_basic,
      observaciones_libres: 'Primera sesion. Reconoce vocales.',
      objetivo_sesion: 'Practicar silabas directas MA ME MI MO MU',
      actividad_realizada: 'Tarjetas de silabas y letras moviles.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d02', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(14), duracion_minutos: 50, items: items_good,
      observaciones_libres: 'Mejoro notablemente. Avance sostenido.',
      objetivo_sesion: 'Reforzar lectura de silabas y comenzar trabadas',
      actividad_realizada: 'Libro de cuentos cortos. Leyo 3 frases solo.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d03', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(7), duracion_minutos: 40, items: items_good,
      observaciones_libres: 'Excelente sesion. Muy atento y fluido.',
      objetivo_sesion: 'Evaluacion informal de progreso mensual',
      actividad_realizada: 'Dictado de 10 palabras simples.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d04', nino_id: 'nino-d02', voluntario_id: VOL, fecha: daysAgo(10), duracion_minutos: 55, items: items_great,
      observaciones_libres: 'Luna tiene nivel excelente. Muy autonoma.',
      objetivo_sesion: 'Lectura comprensiva de textos cortos',
      actividad_realizada: 'Cuento y preguntas de comprension oral.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d05', nino_id: 'nino-d02', voluntario_id: VOL, fecha: daysAgo(3), duracion_minutos: 45, items: items_great,
      observaciones_libres: 'Leyo texto completo de 5 oraciones con buena comprension.',
      objetivo_sesion: 'Lectura comprensiva y escritura espontanea',
      actividad_realizada: 'Escribio 3 oraciones sobre su dia favorito.',
      tipo_sesion: 'individual', created_offline: false },
  ]);

  // 6. Check critical columns
  process.stdout.write('\nChecking columns...\n');
  await checkCol('sesiones', 'objetivo_sesion');
  await checkCol('sesiones', 'actividad_realizada');
  await checkCol('sesiones', 'tipo_sesion');
  await checkCol('sesiones', 'created_offline');

  process.stdout.write('\nDone.\n');
}

main().catch(e => { process.stdout.write('FATAL: ' + e.message + '\n'); process.exit(1); });
