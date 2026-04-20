#!/usr/bin/env node
// seed-capacitaciones.mjs
// Seed para capacitaciones (tipo=autoevaluacion) y voluntarios_capacitaciones
// Ejecutar en Terminal.app: node scripts/seed-capacitaciones.mjs

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

const ADMIN_ID  = "b1000000-0000-0000-0000-000000000001";
const EQUIPO_ID = "b1000000-0000-0000-0000-000000000002";
const VOL_ID    = "b1000000-0000-0000-0000-000000000006";

// IDs para capacitaciones
const CAP_ID_1 = "c1000000-0000-0000-0000-000000000001";
const CAP_ID_2 = "c1000000-0000-0000-0000-000000000002";

// IDs para preguntas
const PREG_IDS = [
  "e1000000-0000-0000-0000-000000000001",
  "e1000000-0000-0000-0000-000000000002",
  "e1000000-0000-0000-0000-000000000003",
  "e1000000-0000-0000-0000-000000000004",
  "e1000000-0000-0000-0000-000000000005",
  "e1000000-0000-0000-0000-000000000006",
];

// IDs para voluntarios_capacitaciones
const VC_ID_1 = "f1000000-0000-0000-0000-000000000001";
const VC_ID_2 = "f1000000-0000-0000-0000-000000000002";

async function api(method, path, body, extraHeaders = {}) {
  const headers = {
    apikey: SVC,
    Authorization: "Bearer " + SVC,
    "Content-Type": "application/json",
    Prefer: "return=representation",
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
  return { status: res.status, json, text };
}

const get    = (path) => api("GET", path);
const del_   = (path) => api("DELETE", path, null, { Prefer: "return=minimal" });
const upsert = (path, body) => api("POST", path, body, {
  Prefer: "resolution=merge-duplicates,return=representation"
});

async function main() {
  console.log("=== VERIFICAR SCHEMA capacitaciones ===");
  const schemaR = await get("/rest/v1/capacitaciones?limit=0&select=*");
  console.log("Status:", schemaR.status);
  // Try to get column names from existing row if any
  const existR = await get("/rest/v1/capacitaciones?limit=3&select=*");
  console.log("Existing rows:", JSON.stringify(existR.json, null, 2));

  console.log("\n=== VERIFICAR SCHEMA preguntas_capacitacion ===");
  const pregR = await get("/rest/v1/preguntas_capacitacion?limit=3&select=*");
  console.log("Preguntas existing:", JSON.stringify(pregR.json, null, 2));

  console.log("\n=== VERIFICAR SCHEMA voluntarios_capacitaciones ===");
  const vcR = await get("/rest/v1/voluntarios_capacitaciones?limit=3&select=*");
  console.log("VC existing:", JSON.stringify(vcR.json, null, 2));

  // -------------------------------------------------------------------
  // SEED capacitaciones (tipo=autoevaluacion)
  // -------------------------------------------------------------------
  console.log("\n=== SEED CAPACITACIONES ===");

  // Try with 'activo' first (from summary), fallback handled manually
  const caps = [
    {
      id: CAP_ID_1,
      titulo: "Autoevaluación de Lenguaje",
      descripcion: "Evaluación de habilidades de lenguaje oral y comprensión",
      area: "lenguaje",
      tipo: "autoevaluacion",
      activo: true,
      puntaje_otorgado: 5,
      duracion_estimada: 20,
      creado_por: ADMIN_ID,
    },
    {
      id: CAP_ID_2,
      titulo: "Autoevaluación de Lectura y Escritura",
      descripcion: "Evaluación de habilidades de lectura y escritura emergente",
      area: "lectura_escritura",
      tipo: "autoevaluacion",
      activo: true,
      puntaje_otorgado: 5,
      duracion_estimada: 25,
      creado_por: ADMIN_ID,
    },
  ];

  for (const cap of caps) {
    const r = await upsert("/rest/v1/capacitaciones", cap);
    console.log(`  cap "${cap.titulo}": ${r.status}`, r.status >= 400 ? r.text : "OK");
  }

  // If 'activo' failed, try 'activa'
  // (check will be done after)

  // -------------------------------------------------------------------
  // SEED preguntas_capacitacion
  // -------------------------------------------------------------------
  console.log("\n=== SEED PREGUNTAS_CAPACITACION ===");
  const preguntas = [
    // Cap 1 - Lenguaje (3 preguntas)
    {
      id: PREG_IDS[0],
      capacitacion_id: CAP_ID_1,
      orden: 1,
      pregunta: "¿Cómo evalúas tu comprensión del vocabulario básico de lenguaje?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
    {
      id: PREG_IDS[1],
      capacitacion_id: CAP_ID_1,
      orden: 2,
      pregunta: "¿Puedes aplicar estrategias de comunicación con los niños?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
    {
      id: PREG_IDS[2],
      capacitacion_id: CAP_ID_1,
      orden: 3,
      pregunta: "¿Reconoces las etapas del desarrollo del lenguaje?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
    // Cap 2 - Lectura/Escritura (3 preguntas)
    {
      id: PREG_IDS[3],
      capacitacion_id: CAP_ID_2,
      orden: 1,
      pregunta: "¿Conoces las etapas del proceso lecto-escritor?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
    {
      id: PREG_IDS[4],
      capacitacion_id: CAP_ID_2,
      orden: 2,
      pregunta: "¿Puedes identificar el nivel de lectura de un niño?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
    {
      id: PREG_IDS[5],
      capacitacion_id: CAP_ID_2,
      orden: 3,
      pregunta: "¿Aplicas actividades de conciencia fonológica en las sesiones?",
      tipo_pregunta: "escala",
      puntaje: 10,
    },
  ];

  for (const preg of preguntas) {
    const r = await upsert("/rest/v1/preguntas_capacitacion", preg);
    console.log(`  pregunta ${preg.orden} (cap ${preg.capacitacion_id.slice(-4)}): ${r.status}`, r.status >= 400 ? r.text : "OK");
  }

  // -------------------------------------------------------------------
  // SEED voluntarios_capacitaciones
  // -------------------------------------------------------------------
  console.log("\n=== SEED VOLUNTARIOS_CAPACITACIONES ===");
  const vcs = [
    {
      id: VC_ID_1,
      voluntario_id: VOL_ID,
      capacitacion_id: CAP_ID_1,
      estado: "completada",
      fecha_asignacion: "2025-05-01T10:00:00Z",
      fecha_inicio: "2025-05-05T10:00:00Z",
      fecha_completada: "2025-05-05T11:00:00Z",
      puntaje_obtenido: 8,
      notas: "Buena comprensión general del módulo.",
      evaluador_id: EQUIPO_ID,
    },
    {
      id: VC_ID_2,
      voluntario_id: VOL_ID,
      capacitacion_id: CAP_ID_2,
      estado: "aprobada",
      fecha_asignacion: "2025-05-10T10:00:00Z",
      fecha_inicio: "2025-05-15T10:00:00Z",
      fecha_completada: null,
      puntaje_obtenido: null,
      notas: null,
      evaluador_id: null,
    },
  ];

  for (const vc of vcs) {
    const r = await upsert("/rest/v1/voluntarios_capacitaciones", vc);
    console.log(`  vc ${vc.id.slice(-4)} (${vc.estado}): ${r.status}`, r.status >= 400 ? r.text : "OK");
  }

  // -------------------------------------------------------------------
  // VERIFICACIÓN FINAL
  // -------------------------------------------------------------------
  console.log("\n=== VERIFICACIÓN FINAL ===");
  const finalCaps = await get("/rest/v1/capacitaciones?tipo=eq.autoevaluacion&select=id,titulo,area,tipo,activo");
  console.log("Capacitaciones autoevaluacion:", JSON.stringify(finalCaps.json));

  const finalVCs = await get("/rest/v1/voluntarios_capacitaciones?voluntario_id=eq." + VOL_ID + "&select=*");
  console.log("Voluntarios_capacitaciones:", JSON.stringify(finalVCs.json, null, 2));

  console.log("\n=== DONE ===");
}

main().catch(console.error);
