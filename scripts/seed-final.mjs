#!/usr/bin/env node
// seed-final.mjs - Seed completo con rangos correctos
// Rangos validos: 5-7, 8-10, 11-13
// nivel_alfabetizacion: texto libre

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

const ADMIN_ID  = "b1000000-0000-0000-0000-000000000001";
const EQUIPO_ID = "b1000000-0000-0000-0000-000000000004";
const VOL_ID    = "b1000000-0000-0000-0000-000000000006";

async function api(method, path, body, extraHeaders = {}) {
  const headers = {
    apikey: SVC,
    Authorization: "Bearer " + SVC,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  const res = await fetch(URL_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}

const get    = (path)        => api("GET",    path);
const del_   = (path)        => api("DELETE", path, null, { Prefer: "return=minimal" });
const upsert = (path, body)  => api("POST",   path, body, { Prefer: "resolution=merge-duplicates,return=representation" });

async function main() {
  process.stdout.write("=== LIMPIEZA TEST ===\n");
  const delR = await del_("/rest/v1/ninos?alias=like.TEST_*");
  process.stdout.write("DELETE TEST ninos: " + delR.status + "\n");

  process.stdout.write("\n=== VERIFICAR ZONAS ===\n");
  const zonasR = await get("/rest/v1/zonas?select=id,nombre");
  process.stdout.write("Zonas (" + zonasR.status + "): " + JSON.stringify(zonasR.json) + "\n");

  const zonas = Array.isArray(zonasR.json) ? zonasR.json : [];
  const zonaMap = {};
  for (const z of zonas) {
    const n = z.nombre || "";
    if (n.toLowerCase().includes("norte")) zonaMap.norte = z.id;
    else if (n.toLowerCase().includes("sur")) zonaMap.sur = z.id;
    else if (n.toLowerCase().includes("centro")) zonaMap.centro = z.id;
  }
  process.stdout.write("Mapa zonas: " + JSON.stringify(zonaMap) + "\n");

  const zNorte  = zonaMap.norte  || "92a4a261-48ef-4e94-8e8a-b6f7d6c2a1d3";
  const zSur    = zonaMap.sur    || "57118cda-2b3c-4d5e-8f9a-1b2c3d4e5f6a";
  const zCentro = zonaMap.centro || "92b1b944-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

  process.stdout.write("\n=== SEED PERFILES ===\n");
  const perfiles = [
    { id: ADMIN_ID,  nombre: "Admin",      apellido: "Demo",        rol: "admin",               activo: true },
    { id: EQUIPO_ID, nombre: "Equipo",     apellido: "Profesional", rol: "equipo_profesional",  activo: true },
    { id: VOL_ID,    nombre: "Voluntario", apellido: "Demo",        rol: "voluntario",           activo: true },
  ];
  for (const p of perfiles) {
    const r = await upsert("/rest/v1/perfiles", p);
    process.stdout.write(`  perfil ${p.nombre}: ${r.status} ${r.status >= 400 ? JSON.stringify(r.json) : "OK"}\n`);
  }

  process.stdout.write("\n=== SEED NINOS ===\n");
  const ninos = [
    { id: "d1000000-0000-0000-0000-000000000001", alias: "Tomas",    rango_etario: "5-7",   nivel_alfabetizacion: "pre-lector",  escolarizado: true,  zona_id: zNorte,  activo: true },
    { id: "d1000000-0000-0000-0000-000000000002", alias: "Luna",     rango_etario: "8-10",  nivel_alfabetizacion: "inicial",     escolarizado: true,  zona_id: zNorte,  activo: true },
    { id: "d1000000-0000-0000-0000-000000000003", alias: "Marcos",   rango_etario: "11-13", nivel_alfabetizacion: "intermedio",  escolarizado: false, zona_id: zSur,    activo: true },
    { id: "d1000000-0000-0000-0000-000000000004", alias: "Sofia",    rango_etario: "5-7",   nivel_alfabetizacion: "pre-lector",  escolarizado: true,  zona_id: zSur,    activo: true },
    { id: "d1000000-0000-0000-0000-000000000005", alias: "Facundo",  rango_etario: "8-10",  nivel_alfabetizacion: "inicial",     escolarizado: true,  zona_id: zCentro, activo: true },
    { id: "d1000000-0000-0000-0000-000000000006", alias: "Milagros", rango_etario: "11-13", nivel_alfabetizacion: "avanzado",    escolarizado: true,  zona_id: zCentro, activo: true },
  ];
  for (const n of ninos) {
    const r = await upsert("/rest/v1/ninos", n);
    process.stdout.write(`  nino ${n.alias}: ${r.status} ${r.status >= 400 ? JSON.stringify(r.json) : "OK"}\n`);
  }

  process.stdout.write("\n=== SEED ASIGNACIONES ===\n");
  const asigs = [
    { id: "e1000000-0000-0000-0000-000000000001", voluntario_id: VOL_ID, nino_id: ninos[0].id, activa: true, fecha_inicio: "2024-03-01" },
    { id: "e1000000-0000-0000-0000-000000000002", voluntario_id: VOL_ID, nino_id: ninos[1].id, activa: true, fecha_inicio: "2024-03-01" },
    { id: "e1000000-0000-0000-0000-000000000003", voluntario_id: VOL_ID, nino_id: ninos[2].id, activa: true, fecha_inicio: "2024-03-15" },
  ];
  for (const a of asigs) {
    const r = await upsert("/rest/v1/asignaciones", a);
    process.stdout.write(`  asig ${a.id.slice(-4)}: ${r.status} ${r.status >= 400 ? JSON.stringify(r.json) : "OK"}\n`);
  }

  process.stdout.write("\n=== SEED SESIONES ===\n");
  const sesiones = [
    {
      id: "f1000000-0000-0000-0000-000000000001",
      voluntario_id: VOL_ID, nino_id: ninos[0].id,
      fecha: "2024-03-05", duracion_minutos: 60, asistio: true,
      objetivo_sesion: "Reconocimiento de letras",
      actividad_realizada: "Juego con letras del abecedario",
      tipo_sesion: "presencial",
      observaciones: "Excelente sesion, muy motivado",
      created_offline: false,
    },
    {
      id: "f1000000-0000-0000-0000-000000000002",
      voluntario_id: VOL_ID, nino_id: ninos[1].id,
      fecha: "2024-03-06", duracion_minutos: 45, asistio: true,
      objetivo_sesion: "Comprension lectora basica",
      actividad_realizada: "Lectura en voz alta de cuento corto",
      tipo_sesion: "presencial",
      observaciones: "Progreso notable en lectura",
      created_offline: false,
    },
    {
      id: "f1000000-0000-0000-0000-000000000003",
      voluntario_id: VOL_ID, nino_id: ninos[0].id,
      fecha: "2024-03-12", duracion_minutos: 60, asistio: false,
      objetivo_sesion: "Escritura de palabras simples",
      actividad_realizada: null,
      tipo_sesion: "presencial",
      observaciones: "No asistio por enfermedad",
      created_offline: false,
    },
    {
      id: "f1000000-0000-0000-0000-000000000004",
      voluntario_id: VOL_ID, nino_id: ninos[2].id,
      fecha: "2024-03-19", duracion_minutos: 60, asistio: true,
      objetivo_sesion: "Lectura comprensiva nivel 2",
      actividad_realizada: "Comprension de texto con preguntas",
      tipo_sesion: "presencial",
      observaciones: "Muy buena concentracion",
      created_offline: false,
    },
  ];
  for (const s of sesiones) {
    const r = await upsert("/rest/v1/sesiones", s);
    process.stdout.write(`  sesion ${s.fecha} (${s.nino_id.slice(-4)}): ${r.status} ${r.status >= 400 ? JSON.stringify(r.json) : "OK"}\n`);
  }

  process.stdout.write("\n=== VERIFICACION FINAL ===\n");
  for (const t of ["perfiles", "ninos", "asignaciones", "sesiones", "zonas"]) {
    const r = await get(`/rest/v1/${t}?select=id`);
    const count = Array.isArray(r.json) ? r.json.length : "?";
    process.stdout.write(`  ${t}: ${count} registros (${r.status})\n`);
  }

  process.stdout.write("\nSeed completado.\n");
}

main().catch(e => {
  process.stderr.write("ERROR: " + e.message + "\n");
  process.exit(1);
});
