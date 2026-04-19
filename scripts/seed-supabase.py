"""
seed-supabase.py
Uso: python3 scripts/seed-supabase.py

IMPORTANTE: Antes de correr este script, ejecutar en Supabase SQL Editor:
  ALTER TABLE sesiones
    ADD COLUMN IF NOT EXISTS objetivo_sesion TEXT,
    ADD COLUMN IF NOT EXISTS actividad_realizada TEXT,
    ADD COLUMN IF NOT EXISTS tipo_sesion TEXT DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS created_offline BOOLEAN DEFAULT FALSE;

  ALTER TABLE ninos
    ADD COLUMN IF NOT EXISTS escolarizado BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
"""
import json
import urllib.request
import urllib.error
import os
import sys
from datetime import datetime, timedelta

# ── Leer .env.local ──
env = {}
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../.env.local')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
KEY = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not URL or not KEY:
    print("ERROR: Faltan variables de entorno en .env.local")
    sys.exit(1)

print("Supabase: " + URL)
print("Key len:  " + str(len(KEY)))
print("")

HEADERS = {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json',
}

def api_get(path):
    req = urllib.request.Request(URL + path, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def api_post(path, data, prefer='resolution=ignore-duplicates,return=minimal'):
    body = json.dumps(data).encode('utf-8')
    headers = dict(HEADERS)
    headers['Prefer'] = prefer
    req = urllib.request.Request(URL + path, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else {})

def upsert(table, rows):
    status, resp = api_post(
        '/rest/v1/' + table + '?on_conflict=id',
        rows,
        prefer='resolution=merge-duplicates,return=minimal'
    )
    if status in (200, 201, 204):
        print("  OK   " + table + " (" + str(len(rows)) + " rows)")
    else:
        print("  FAIL " + table + ": HTTP " + str(status) + " -> " + str(resp)[:200])
    return status < 300

def check_col(table, col):
    s, d = api_get('/rest/v1/' + table + '?select=' + col + '&limit=1')
    if s == 200:
        print("  OK   " + table + "." + col)
    else:
        msg = d.get('message', str(d))[:100] if isinstance(d, dict) else str(d)[:100]
        print("  MISS " + table + "." + col + " -> " + msg)
    return s == 200

# ── 1. Inspect tables ─────────────────────────────────────────
print("=== Inspeccionando tablas ===")
for t in ['zonas', 'ninos', 'perfiles', 'sesiones', 'asignaciones']:
    status, data = api_get('/rest/v1/' + t + '?limit=1')
    if status == 200:
        cols = list(data[0].keys()) if data else '(vacia)'
        print("  " + t + ": OK cols=" + str(cols))
    else:
        msg = data.get('message', '?')[:100] if isinstance(data, dict) else '?'
        print("  " + t + ": HTTP " + str(status) + " -> " + msg)
print("")

# ── 2. Zonas ─────────────────────────────────────────────────
print("=== Seed: Zonas ===")
upsert('zonas', [
    {'nombre': 'Zona Norte',  'descripcion': 'Barrios norte', 'activa': True},
    {'nombre': 'Zona Sur',    'descripcion': 'Barrios sur',   'activa': True},
    {'nombre': 'Zona Centro', 'descripcion': 'Barrios centro','activa': True},
])

_, zonas = api_get('/rest/v1/zonas?select=id,nombre&limit=10')
zona_map = {z['nombre']: z['id'] for z in zonas} if isinstance(zonas, list) else {}
print("  Zonas: " + str(zona_map))
zona_norte  = zona_map.get('Zona Norte')
zona_sur    = zona_map.get('Zona Sur')
zona_centro = zona_map.get('Zona Centro')
print("")

# ── 3. Perfiles ───────────────────────────────────────────────
print("=== Seed: Perfiles ===")
perfiles = [
    {'id': 'b1000000-0000-0000-0000-000000000001',
     'email': 'admin@demo.apa', 'nombre': 'Admin Demo', 'rol': 'admin', 'activo': True},
    {'id': 'b1000000-0000-0000-0000-000000000002',
     'email': 'equipo@demo.apa', 'nombre': 'Equipo Demo', 'rol': 'coordinador',
     'zona_id': zona_norte, 'activo': True},
    {'id': 'b1000000-0000-0000-0000-000000000006',
     'email': 'voluntario1@demo.apa', 'nombre': 'Valentina Ramos', 'rol': 'voluntario',
     'zona_id': zona_norte, 'activo': True},
]
perfiles = [{k: v for k, v in p.items() if v is not None} for p in perfiles]
upsert('perfiles', perfiles)
print("")

# ── 4. Ninos ─────────────────────────────────────────────────
print("=== Seed: Ninos ===")

# Detect available columns
test_nino = {'alias': 'TEST_DELETE_ME', 'rango_etario': '6-8', 'nivel_alfabetizacion': 'inicial'}
s_test, r_test = api_post('/rest/v1/ninos', [test_nino], prefer='return=representation')
print("  test insert: HTTP " + str(s_test))

available_cols = []
test_id = None
if s_test in (200, 201) and isinstance(r_test, list) and r_test:
    available_cols = list(r_test[0].keys())
    test_id = r_test[0].get('id')
    print("  cols: " + str(available_cols))
    if test_id:
        del_req = urllib.request.Request(
            URL + '/rest/v1/ninos?id=eq.' + test_id,
            headers={**HEADERS, 'Prefer': 'return=minimal'},
            method='DELETE'
        )
        try:
            urllib.request.urlopen(del_req, timeout=10)
        except Exception:
            pass

ninos_data = [
    {'alias': 'Tomas',    'rango_etario': '6-8',   'nivel_alfabetizacion': 'pre-lector',
     'zona_id': zona_norte,  'escolarizado': True,  'activo': True},
    {'alias': 'Luna',     'rango_etario': '8-10',  'nivel_alfabetizacion': 'inicial',
     'zona_id': zona_norte,  'escolarizado': True,  'activo': True},
    {'alias': 'Marcos',   'rango_etario': '10-12', 'nivel_alfabetizacion': 'intermedio',
     'zona_id': zona_sur,    'escolarizado': False, 'activo': True},
    {'alias': 'Sofia',    'rango_etario': '6-8',   'nivel_alfabetizacion': 'pre-lector',
     'zona_id': zona_sur,    'escolarizado': True,  'activo': True},
    {'alias': 'Facundo',  'rango_etario': '8-10',  'nivel_alfabetizacion': 'inicial',
     'zona_id': zona_centro, 'escolarizado': True,  'activo': True},
    {'alias': 'Milagros', 'rango_etario': '10-12', 'nivel_alfabetizacion': 'avanzado',
     'zona_id': zona_centro, 'escolarizado': True,  'activo': True},
]

# Filter to available cols
if available_cols:
    ninos_data = [{k: v for k, v in n.items()
                   if k in available_cols} for n in ninos_data]

ninos_data = [{k: v for k, v in n.items() if v is not None} for n in ninos_data]

s_n, r_n = api_post('/rest/v1/ninos', ninos_data, prefer='return=minimal')
if s_n in (200, 201, 204):
    print("  OK ninos (" + str(len(ninos_data)) + " rows)")
else:
    print("  FAIL: HTTP " + str(s_n) + " -> " + str(r_n)[:200])
    ninos_min = [{'alias': n['alias'], 'rango_etario': n['rango_etario'],
                  'nivel_alfabetizacion': n['nivel_alfabetizacion']} for n in ninos_data]
    s2, r2 = api_post('/rest/v1/ninos', ninos_min, prefer='return=minimal')
    print("  retry minimal: HTTP " + str(s2) + (" OK" if s2 in (200,201,204) else " -> " + str(r2)[:150]))
print("")

# ── 5. Get ninos IDs ─────────────────────────────────────────
_, ninos_db = api_get('/rest/v1/ninos?select=id,alias&limit=30')
nino_map = {n['alias']: n['id'] for n in ninos_db} if isinstance(ninos_db, list) else {}
print("Ninos en DB: " + str(nino_map))
print("")

VOL_ID = 'b1000000-0000-0000-0000-000000000006'
tomas_id = nino_map.get('Tomas')
luna_id  = nino_map.get('Luna')

# ── 6. Asignaciones ───────────────────────────────────────────
print("=== Seed: Asignaciones ===")
if tomas_id and luna_id:
    _, asig_sample = api_get('/rest/v1/asignaciones?limit=1')
    asig_cols = list(asig_sample[0].keys()) if isinstance(asig_sample, list) and asig_sample else []

    asig_rows = [
        {'voluntario_id': VOL_ID, 'nino_id': tomas_id, 'activa': True, 'fecha_inicio': '2025-03-01'},
        {'voluntario_id': VOL_ID, 'nino_id': luna_id,  'activa': True, 'fecha_inicio': '2025-03-05'},
    ]
    if 'zona_id' in asig_cols and zona_norte:
        for a in asig_rows:
            a['zona_id'] = zona_norte

    s_a, r_a = api_post('/rest/v1/asignaciones', asig_rows, prefer='return=minimal')
    if s_a in (200, 201, 204):
        print("  OK asignaciones (2 rows)")
    else:
        print("  FAIL: HTTP " + str(s_a) + " -> " + str(r_a)[:200])
else:
    print("  SKIP: ninos IDs not found (tomas=" + str(tomas_id) + " luna=" + str(luna_id) + ")")
print("")

# ── 7. Sesiones ───────────────────────────────────────────────
print("=== Seed: Sesiones ===")
now = datetime.utcnow()

def days_ago(d):
    return (now - timedelta(days=d)).strftime('%Y-%m-%dT%H:%M:%SZ')

items_basic = [{'id':'lec-01','categoria':'lectura','texto':'Lee silabas directas','valor':3}]
items_good  = [{'id':'lec-01','categoria':'lectura','texto':'Lee silabas directas','valor':4}]
items_great = [{'id':'lec-01','categoria':'lectura','texto':'Lee silabas directas','valor':5}]

if tomas_id and luna_id:
    sesiones = [
        {'nino_id': tomas_id, 'voluntario_id': VOL_ID, 'fecha': days_ago(21),
         'duracion_minutos': 45, 'items': items_basic,
         'observaciones_libres': 'Primera sesion. Reconoce vocales.',
         'objetivo_sesion': 'Practicar silabas directas MA ME MI MO MU',
         'actividad_realizada': 'Tarjetas de silabas y letras moviles.',
         'tipo_sesion': 'individual', 'created_offline': False},
        {'nino_id': tomas_id, 'voluntario_id': VOL_ID, 'fecha': days_ago(14),
         'duracion_minutos': 50, 'items': items_good,
         'observaciones_libres': 'Mejoro notablemente. Leyo 3 frases solo.',
         'objetivo_sesion': 'Reforzar lectura y comenzar trabadas',
         'actividad_realizada': 'Libro de cuentos cortos.',
         'tipo_sesion': 'individual', 'created_offline': False},
        {'nino_id': tomas_id, 'voluntario_id': VOL_ID, 'fecha': days_ago(7),
         'duracion_minutos': 40, 'items': items_good,
         'observaciones_libres': 'Excelente sesion. Muy atento.',
         'objetivo_sesion': 'Evaluacion de progreso mensual',
         'actividad_realizada': 'Dictado de 10 palabras simples.',
         'tipo_sesion': 'individual', 'created_offline': False},
        {'nino_id': luna_id, 'voluntario_id': VOL_ID, 'fecha': days_ago(10),
         'duracion_minutos': 55, 'items': items_great,
         'observaciones_libres': 'Luna nivel excelente. Muy autonoma.',
         'objetivo_sesion': 'Lectura comprensiva de textos cortos',
         'actividad_realizada': 'Cuento y preguntas de comprension.',
         'tipo_sesion': 'individual', 'created_offline': False},
        {'nino_id': luna_id, 'voluntario_id': VOL_ID, 'fecha': days_ago(3),
         'duracion_minutos': 45, 'items': items_great,
         'observaciones_libres': 'Leyo texto completo con buena comprension.',
         'objetivo_sesion': 'Lectura comprensiva y escritura',
         'actividad_realizada': 'Escribio 3 oraciones sobre su dia.',
         'tipo_sesion': 'individual', 'created_offline': False},
    ]

    s1, r1 = api_post('/rest/v1/sesiones', [sesiones[0]], prefer='return=minimal')
    print("  test insert sesion: HTTP " + str(s1))
    if s1 not in (200, 201, 204):
        print("  error: " + str(r1)[:200])
        print("  Reintentando sin columnas extra (ALTER TABLE pendiente)...")
        for ses in sesiones:
            row = {k: v for k, v in ses.items()
                   if k in ['nino_id','voluntario_id','fecha','duracion_minutos','items','observaciones_libres']}
            s2, r2 = api_post('/rest/v1/sesiones', [row], prefer='return=minimal')
            if s2 not in (200,201,204):
                print("    FAIL: " + str(r2)[:100])
        print("  OK sesiones sin columnas extra (correr ALTER TABLE despues)")
    else:
        for ses in sesiones[1:]:
            ss, rr = api_post('/rest/v1/sesiones', [ses], prefer='return=minimal')
            if ss not in (200, 201, 204):
                print("  WARN: " + str(rr)[:100])
        print("  OK sesiones (" + str(len(sesiones)) + " total)")
else:
    print("  SKIP: ninos IDs not available")
print("")

# ── 8. Verificacion final ─────────────────────────────────────
print("=== Verificacion final ===")
for t in ['zonas', 'ninos', 'perfiles', 'asignaciones', 'sesiones']:
    s, d = api_get('/rest/v1/' + t + '?limit=100')
    count = len(d) if isinstance(d, list) else ('ERROR: ' + str(d)[:60])
    print("  " + t + ": " + str(count) + " registros")
print("")

print("=== Columnas criticas en sesiones ===")
for col in ['objetivo_sesion', 'actividad_realizada', 'tipo_sesion', 'created_offline']:
    check_col('sesiones', col)
print("")

print("=== LISTO ===")
print("Si ves MISS para objetivo_sesion, correr en Supabase SQL Editor:")
print("  ALTER TABLE sesiones")
print("    ADD COLUMN IF NOT EXISTS objetivo_sesion TEXT,")
print("    ADD COLUMN IF NOT EXISTS actividad_realizada TEXT,")
print("    ADD COLUMN IF NOT EXISTS tipo_sesion TEXT DEFAULT 'individual';")
print("")
print("Luego volver a correr este script para cargar las sesiones completas.")
