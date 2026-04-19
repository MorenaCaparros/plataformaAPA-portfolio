#!/usr/bin/env python3
"""
Seed completo para Supabase demo.
Rangos validos descubiertos: 5-7, 8-10, 11-13
nivel_alfabetizacion: texto libre
"""
import urllib.request
import urllib.error
import json
import os
import sys

URL = "https://mxazuqmltvkreunukxrc.supabase.co"
SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw"

HEADERS = {
    "apikey": SVC,
    "Authorization": "Bearer " + SVC,
    "Content-Type": "application/json",
}

ADMIN_ID  = "b1000000-0000-0000-0000-000000000001"
EQUIPO_ID = "b1000000-0000-0000-0000-000000000004"
VOL_ID    = "b1000000-0000-0000-0000-000000000006"

ZONA_NORTE  = "92a4a261-48ef-4e94-8e8a-b6f7d6c2a1d3"
ZONA_SUR    = "57118cda-2b3c-4d5e-8f9a-1b2c3d4e5f6a"
ZONA_CENTRO = "92b1b944-5c6d-7e8f-9a0b-1c2d3e4f5a6b"

def req(method, path, body=None, extra_headers=None):
    url = URL + path
    data = json.dumps(body).encode() if body is not None else None
    h = dict(HEADERS)
    if extra_headers:
        h.update(extra_headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw) if raw else None

def post(path, body, prefer="return=representation"):
    return req("POST", path, body, {"Prefer": prefer})

def delete(path):
    return req("DELETE", path, None, {"Prefer": "return=minimal"})

def get(path):
    return req("GET", path)

def upsert(path, body):
    return req("POST", path, body, {
        "Prefer": "resolution=merge-duplicates,return=representation"
    })

print("=== LIMPIEZA DE REGISTROS TEST ===")
status, _ = delete("/rest/v1/ninos?alias=like.TEST_*")
print(f"DELETE TEST ninos: {status}")

print("\n=== VERIFICAR ZONAS ===")
status, zonas = get("/rest/v1/zonas?select=id,nombre")
print(f"Zonas existentes ({status}): {json.dumps(zonas)}")

zona_ids = {}
if isinstance(zonas, list):
    for z in zonas:
        n = z.get("nombre", "")
        if "Norte" in n or "norte" in n:
            zona_ids["norte"] = z["id"]
        elif "Sur" in n or "sur" in n:
            zona_ids["sur"] = z["id"]
        elif "Centro" in n or "centro" in n:
            zona_ids["centro"] = z["id"]

print(f"Zona IDs mapeados: {zona_ids}")

if not zona_ids.get("norte"):
    zona_ids["norte"] = ZONA_NORTE
if not zona_ids.get("sur"):
    zona_ids["sur"] = ZONA_SUR
if not zona_ids.get("centro"):
    zona_ids["centro"] = ZONA_CENTRO

print("\n=== SEED PERFILES ===")
perfiles = [
    {"id": ADMIN_ID,  "nombre": "Admin",     "apellido": "Demo",      "rol": "admin",              "activo": True},
    {"id": EQUIPO_ID, "nombre": "Equipo",    "apellido": "Profesional","rol": "equipo_profesional", "activo": True},
    {"id": VOL_ID,    "nombre": "Voluntario","apellido": "Demo",       "rol": "voluntario",         "activo": True},
]
for p in perfiles:
    status, resp = upsert("/rest/v1/perfiles", p)
    nombre = p["nombre"]
    if status in (200, 201):
        print(f"  OK perfil {nombre}: {status}")
    else:
        print(f"  ERROR perfil {nombre}: {status} => {resp}")

print("\n=== SEED NINOS ===")
ninos_data = [
    {"id": "d1000000-0000-0000-0000-000000000001", "alias": "Tomas",    "rango_etario": "5-7",   "nivel_alfabetizacion": "pre-lector",  "escolarizado": True,  "zona_id": zona_ids["norte"],  "activo": True},
    {"id": "d1000000-0000-0000-0000-000000000002", "alias": "Luna",     "rango_etario": "8-10",  "nivel_alfabetizacion": "inicial",     "escolarizado": True,  "zona_id": zona_ids["norte"],  "activo": True},
    {"id": "d1000000-0000-0000-0000-000000000003", "alias": "Marcos",   "rango_etario": "11-13", "nivel_alfabetizacion": "intermedio",  "escolarizado": False, "zona_id": zona_ids["sur"],    "activo": True},
    {"id": "d1000000-0000-0000-0000-000000000004", "alias": "Sofia",    "rango_etario": "5-7",   "nivel_alfabetizacion": "pre-lector",  "escolarizado": True,  "zona_id": zona_ids["sur"],    "activo": True},
    {"id": "d1000000-0000-0000-0000-000000000005", "alias": "Facundo",  "rango_etario": "8-10",  "nivel_alfabetizacion": "inicial",     "escolarizado": True,  "zona_id": zona_ids["centro"], "activo": True},
    {"id": "d1000000-0000-0000-0000-000000000006", "alias": "Milagros", "rango_etario": "11-13", "nivel_alfabetizacion": "avanzado",    "escolarizado": True,  "zona_id": zona_ids["centro"], "activo": True},
]
nino_ids = []
for n in ninos_data:
    status, resp = upsert("/rest/v1/ninos", n)
    alias = n["alias"]
    if status in (200, 201):
        nid = resp[0]["id"] if isinstance(resp, list) and resp else n["id"]
        nino_ids.append(nid)
        print(f"  OK nino {alias}: {status} id={nid}")
    else:
        print(f"  ERROR nino {alias}: {status} => {resp}")
        nino_ids.append(n["id"])

print(f"\nNinos insertados: {len(nino_ids)}")

print("\n=== SEED ASIGNACIONES ===")
asignaciones = [
    {"id": "e1000000-0000-0000-0000-000000000001", "voluntario_id": VOL_ID, "nino_id": nino_ids[0], "activa": True, "fecha_inicio": "2024-03-01"},
    {"id": "e1000000-0000-0000-0000-000000000002", "voluntario_id": VOL_ID, "nino_id": nino_ids[1], "activa": True, "fecha_inicio": "2024-03-01"},
]
for a in asignaciones:
    status, resp = upsert("/rest/v1/asignaciones", a)
    if status in (200, 201):
        print(f"  OK asignacion vol->{a['nino_id'][:8]}: {status}")
    else:
        print(f"  ERROR asignacion: {status} => {resp}")

print("\n=== SEED SESIONES ===")
sesiones = [
    {
        "id": "f1000000-0000-0000-0000-000000000001",
        "voluntario_id": VOL_ID,
        "nino_id": nino_ids[0],
        "fecha": "2024-03-05",
        "duracion_minutos": 60,
        "asistio": True,
        "objetivo_sesion": "Reconocimiento de letras",
        "actividad_realizada": "Juego con letras del abecedario",
        "tipo_sesion": "presencial",
        "observaciones": "Excelente sesion, muy motivado",
        "created_offline": False,
    },
    {
        "id": "f1000000-0000-0000-0000-000000000002",
        "voluntario_id": VOL_ID,
        "nino_id": nino_ids[1],
        "fecha": "2024-03-06",
        "duracion_minutos": 45,
        "asistio": True,
        "objetivo_sesion": "Comprension lectora basica",
        "actividad_realizada": "Lectura en voz alta de cuento corto",
        "tipo_sesion": "presencial",
        "observaciones": "Progreso notable en lectura",
        "created_offline": False,
    },
    {
        "id": "f1000000-0000-0000-0000-000000000003",
        "voluntario_id": VOL_ID,
        "nino_id": nino_ids[0],
        "fecha": "2024-03-12",
        "duracion_minutos": 60,
        "asistio": False,
        "objetivo_sesion": "Escritura de palabras simples",
        "actividad_realizada": None,
        "tipo_sesion": "presencial",
        "observaciones": "No asistio por enfermedad",
        "created_offline": False,
    },
]
for s in sesiones:
    status, resp = upsert("/rest/v1/sesiones", s)
    if status in (200, 201):
        print(f"  OK sesion {s['fecha']} nino={s['nino_id'][:8]}: {status}")
    else:
        print(f"  ERROR sesion {s['fecha']}: {status} => {resp}")

print("\n=== VERIFICACION FINAL ===")
for tabla in ["perfiles", "ninos", "asignaciones", "sesiones", "zonas"]:
    s2, r2 = get(f"/rest/v1/{tabla}?select=id")
    count = len(r2) if isinstance(r2, list) else "?"
    print(f"  {tabla}: {count} registros ({s2})")

print("\nSeed completado.")
