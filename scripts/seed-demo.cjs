/**
 * seed-demo.cjs - Run with: node scripts/seed-demo.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

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
  console.log('ERROR: Missing SUPABASE env vars');
  process.exit(1);
}

const HOST = SUPABASE_URL.replace('https://', '');

function supabaseRequest(method, table, body) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: HOST,
      path: `/rest/v1/${table}`,
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function upsert(table, rows) {
  // Use POST with Prefer: resolution=ignore-duplicates
  const res = await supabaseRequest('POST', table, rows);
  const ok = res.status >= 200 && res.status < 300;
  console.log((ok ? 'OK   ' : 'FAIL ') + table + ' (' + rows.length + ' rows) [HTTP ' + res.status + ']');
  if (!ok) console.log('     ' + res.body.slice(0, 200));
  return ok;
}

async function checkCol(table, col) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      path: `/rest/v1/${table}?select=${col}&limit=1`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ok = res.statusCode < 400;
        console.log('COL  ' + table + '.' + col + ' -> ' + (ok ? 'OK' : 'MISSING [HTTP ' + res.statusCode + ']'));
        if (!ok) console.log('     ' + data.slice(0, 150));
        resolve(ok);
      });
    });
    req.on('error', e => { console.log('COL  ERROR: ' + e.message); resolve(false); });
    req.end();
  });
}

async function main() {
  console.log('Starting seed...');

  await upsert('zonas', [
    { id: 'zona-001', nombre: 'Zona Norte',  descripcion: 'Barrios norte', activa: true },
    { id: 'zona-002', nombre: 'Zona Sur',    descripcion: 'Barrios sur',   activa: true },
    { id: 'zona-003', nombre: 'Zona Centro', descripcion: 'Barrios centro',activa: true },
  ]);

  await upsert('perfiles', [
    { id: 'b1000000-0000-0000-0000-000000000001', email: 'admin@demo.apa',       nombre: 'Admin Demo',      rol: 'admin',       activo: true },
    { id: 'b1000000-0000-0000-0000-000000000002', email: 'equipo@demo.apa',      nombre: 'Equipo Demo',     rol: 'coordinador', zona_id: 'zona-001', activo: true },
    { id: 'b1000000-0000-0000-0000-000000000006', email: 'voluntario1@demo.apa', nombre: 'Valentina Ramos', rol: 'voluntario',  zona_id: 'zona-001', activo: true },
  ]);

  await upsert('ninos', [
    { id: 'nino-d01', alias: 'Tomas',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector', escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d02', alias: 'Luna',     rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',    escolarizado: true,  zona_id: 'zona-001', activo: true },
    { id: 'nino-d03', alias: 'Marcos',   rango_etario: '10-12', nivel_alfabetizacion: 'intermedio', escolarizado: false, zona_id: 'zona-002', activo: true },
    { id: 'nino-d04', alias: 'Sofia',    rango_etario: '6-8',   nivel_alfabetizacion: 'pre-lector', escolarizado: true,  zona_id: 'zona-002', activo: true },
    { id: 'nino-d05', alias: 'Facundo',  rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',    escolarizado: true,  zona_id: 'zona-003', activo: true },
    { id: 'nino-d06', alias: 'Milagros', rango_etario: '10-12', nivel_alfabetizacion: 'avanzado',   escolarizado: true,  zona_id: 'zona-003', activo: true },
  ]);

  await upsert('asignaciones', [
    { id: 'asig-d01', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d01', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-01' },
    { id: 'asig-d02', voluntario_id: 'b1000000-0000-0000-0000-000000000006', nino_id: 'nino-d02', zona_id: 'zona-001', activa: true, fecha_inicio: '2025-03-05' },
  ]);

  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
  const VOL = 'b1000000-0000-0000-0000-000000000006';
  const items_basic = [{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 3 }];
  const items_good  = [{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 4 }];
  const items_great = [{ id: 'lec-01', categoria: 'lectura', texto: 'Lee silabas directas', valor: 5 }];

  await upsert('sesiones', [
    { id: 'ses-d01', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(21), duracion_minutos: 45,
      items: items_basic, observaciones_libres: 'Primera sesion. Reconoce vocales.',
      objetivo_sesion: 'Practicar silabas directas', actividad_realizada: 'Tarjetas de silabas.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d02', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(14), duracion_minutos: 50,
      items: items_good, observaciones_libres: 'Mejoro notablemente.',
      objetivo_sesion: 'Reforzar lectura y comenzar trabadas', actividad_realizada: 'Libro de cuentos. Leyo 3 frases solo.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d03', nino_id: 'nino-d01', voluntario_id: VOL, fecha: daysAgo(7), duracion_minutos: 40,
      items: items_good, observaciones_libres: 'Excelente sesion.',
      objetivo_sesion: 'Evaluacion de progreso mensual', actividad_realizada: 'Dictado de 10 palabras.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d04', nino_id: 'nino-d02', voluntario_id: VOL, fecha: daysAgo(10), duracion_minutos: 55,
      items: items_great, observaciones_libres: 'Luna nivel excelente. Muy autonoma.',
      objetivo_sesion: 'Lectura comprensiva', actividad_realizada: 'Cuento y preguntas de comprension.',
      tipo_sesion: 'individual', created_offline: false },
    { id: 'ses-d05', nino_id: 'nino-d02', voluntario_id: VOL, fecha: daysAgo(3), duracion_minutos: 45,
      items: items_great, observaciones_libres: 'Leyo texto completo con buena comprension.',
      objetivo_sesion: 'Lectura comprensiva y escritura', actividad_realizada: 'Escribio 3 oraciones.',
      tipo_sesion: 'individual', created_offline: false },
  ]);

  console.log('\nChecking columns...');
  await checkCol('sesiones', 'objetivo_sesion');
  await checkCol('sesiones', 'actividad_realizada');
  await checkCol('sesiones', 'tipo_sesion');
  await checkCol('sesiones', 'created_offline');

  console.log('\nDone.');
}

main().catch(e => { console.log('FATAL: ' + e.message); process.exit(1); });
