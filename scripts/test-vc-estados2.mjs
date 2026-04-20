#!/usr/bin/env node
// Test valid estados for voluntarios_capacitaciones

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

const HEADERS = {
  apikey: SVC,
  Authorization: "Bearer " + SVC,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const VOL_ID = "00000000-0000-0000-0000-000000000002";
const CAP_ID = "c1000000-0000-0000-0000-000000000002";

async function req(method, path, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

const states = ["pendiente", "en_curso", "asignada", "inscripta", "aprobada", "activa"];

for (const estado of states) {
  // Delete first
  await req("DELETE", `voluntarios_capacitaciones?voluntario_id=eq.${VOL_ID}&capacitacion_id=eq.${CAP_ID}`, null);

  const r = await req("POST", "voluntarios_capacitaciones", {
    voluntario_id: VOL_ID,
    capacitacion_id: CAP_ID,
    estado,
    fecha_inscripcion: new Date().toISOString(),
  });
  const ok = r.status >= 200 && r.status < 300;
  console.log(`${estado}: ${ok ? "✅ OK" : "❌ " + r.status + " " + r.body.substring(0, 120)}`);
}

// Cleanup
await req("DELETE", `voluntarios_capacitaciones?voluntario_id=eq.${VOL_ID}&capacitacion_id=eq.${CAP_ID}`, null);

// Show existing rows
const existing = await req("GET", "voluntarios_capacitaciones?select=*&limit=10", null);
console.log("\nExisting rows:", existing.body);
