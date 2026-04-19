"""
inspect-db.py — Lee esquema real de todas las tablas
Uso: python3 scripts/inspect-db.py > /tmp/schema.log
"""
import json, urllib.request, urllib.error, os, sys

env = {}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../.env.local')) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'}

def api_get(path):
    req = urllib.request.Request(URL + path, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def api_post(path, data, prefer='return=representation'):
    body = json.dumps(data).encode()
    h = dict(HEADERS); h['Prefer'] = prefer
    req = urllib.request.Request(URL + path, data=body, headers=h, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read(); return e.code, (json.loads(raw) if raw else {})

# 1. Columnas de cada tabla via information_schema
tables = ['zonas', 'ninos', 'perfiles', 'sesiones', 'asignaciones',
          'evaluaciones_iniciales', 'autoevaluaciones', 'capacitaciones']

print("=== COLUMNAS POR TABLA ===")
for t in tables:
    # GET with a bad column to trigger error listing available ones
    s, d = api_get('/rest/v1/' + t + '?limit=0')
    print(t + ': HTTP ' + str(s))
    if s == 200:
        # Insert a dummy row to see the full error message with constraints
        pass

# 2. Try inserting a minimal nino to see exact constraint error
print("")
print("=== TEST INSERT ninos (para ver constraint) ===")
test_cases = [
    {'alias': 'Test', 'rango_etario': '6-8', 'nivel_alfabetizacion': 'pre-lector'},
    {'alias': 'Test', 'rango_etario': '6 a 8', 'nivel_alfabetizacion': 'inicial'},
    {'alias': 'Test', 'rango_etario': '6-8', 'nivel_alfabetizacion': 'inicial'},
    {'alias': 'Test'},
    {'alias': 'Test', 'rango_etario': '6-8'},
    {'alias': 'Test', 'edad': 7},
    {'alias': 'Test', 'rango_etario': '6-8', 'nivel_lector': 'inicial'},
]
for row in test_cases:
    s, r = api_post('/rest/v1/ninos', [row])
    if s in (200, 201):
        print("  SUCCESS with " + str(list(row.keys())) + " -> id=" + str(r[0].get('id','?') if isinstance(r,list) else '?'))
        # delete it
        tid = r[0].get('id') if isinstance(r,list) else None
        if tid:
            dreq = urllib.request.Request(URL + '/rest/v1/ninos?id=eq.' + tid,
                headers={**HEADERS,'Prefer':'return=minimal'}, method='DELETE')
            try: urllib.request.urlopen(dreq, timeout=10)
            except: pass
        break
    else:
        msg = r.get('message','?')[:120] if isinstance(r,dict) else str(r)[:120]
        print("  FAIL " + str(list(row.keys())) + ": " + msg)

# 3. Get full column list for ninos via a successful row or via schema introspection
print("")
print("=== COLUMNAS ninos via schema ===")
s, d = api_get('/rest/v1/ninos?select=*&limit=1')
print('ninos select * HTTP ' + str(s) + ': ' + str(d)[:300])

# 4. Check evaluaciones_iniciales and autoevaluaciones
print("")
print("=== TEST INSERT evaluaciones_iniciales ===")
s, d = api_get('/rest/v1/evaluaciones_iniciales?limit=1')
print('evaluaciones_iniciales: HTTP ' + str(s) + ' -> ' + str(d)[:200])

print("")
print("=== TEST INSERT autoevaluaciones ===")
s, d = api_get('/rest/v1/autoevaluaciones?limit=1')
print('autoevaluaciones: HTTP ' + str(s) + ' -> ' + str(d)[:200])

# 5. perfiles - check apellido column
print("")
print("=== PERFILES existentes ===")
s, d = api_get('/rest/v1/perfiles?select=id,email,nombre,apellido,rol&limit=10')
print('perfiles HTTP ' + str(s) + ': ' + str(d)[:500])
