#!/usr/bin/env node
// check-usuarios.mjs - Diagnóstico de la página /dashboard/usuarios
// Ejecutar en Terminal.app: node scripts/check-usuarios.mjs

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

async function api(path) {
  const res = await fetch(URL_BASE + path, {
    headers: {
      apikey: SVC,
      Authorization: "Bearer " + SVC,
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}

async function main() {
  console.log("=== 1. PERFILES ===");
  const perfiles = await api("/rest/v1/perfiles?select=id,nombre,apellido,rol,activo,email&order=created_at.desc");
  console.log("Status:", perfiles.status);
  console.log("Count:", Array.isArray(perfiles.json) ? perfiles.json.length : "no array");
  console.log(JSON.stringify(perfiles.json, null, 2));

  console.log("\n=== 2. ZONAS (campo activo vs activa) ===");
  const zonas = await api("/rest/v1/zonas?select=*&limit=5");
  console.log("Status:", zonas.status);
  console.log(JSON.stringify(zonas.json, null, 2));

  console.log("\n=== 3. ZONAS con activa=true ===");
  const zonasActiva = await api("/rest/v1/zonas?activa=eq.true&select=id,nombre");
  console.log("activa=true:", zonasActiva.status, JSON.stringify(zonasActiva.json));

  console.log("\n=== 4. ZONAS con activo=true ===");
  const zonasActivo = await api("/rest/v1/zonas?activo=eq.true&select=id,nombre");
  console.log("activo=true:", zonasActivo.status, JSON.stringify(zonasActivo.json));

  console.log("\n=== 5. PERFILES JOIN ZONAS ===");
  const perfilesJoin = await api("/rest/v1/perfiles?select=id,nombre,rol,zonas(id,nombre)&limit=5");
  console.log("Status:", perfilesJoin.status, JSON.stringify(perfilesJoin.json, null, 2));

  console.log("\n=== 6. TEST API /api/usuarios vía endpoint interno ===");
  // No podemos testear el endpoint directamente sin token de usuario
  // pero podemos ver si perfiles tiene datos
  console.log("Si 'perfiles' tiene datos arriba, el problema está en:");
  console.log("  a) La zona en el join (nombre de columna activa/activo)");
  console.log("  b) El auth token del usuario logueado (RLS en modo user)");
  console.log("  c) supabaseAdmin no configurado en el server (SUPABASE_SERVICE_ROLE_KEY env var)");
}

main().catch(console.error);
