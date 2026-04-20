#!/usr/bin/env node
// seed-sesiones-items.mjs
// Actualiza las sesiones existentes con items de observación demo
// Ejecutar: node scripts/seed-sesiones-items.mjs

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

const HEADERS = {
  apikey: SVC,
  Authorization: "Bearer " + SVC,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function req(method, path, body) {
  const res = await fetch(URL_BASE + path, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: null, text }; }
}

// Items de observación demo con valores realistas (escala 1-5)
// Sesión buena (niño avanzado)
const itemsBuena = [
  { id: "atencion_1", categoria: "atencion_concentracion", texto: "Mantiene atención en la actividad propuesta", valor: 4 },
  { id: "atencion_2", categoria: "atencion_concentracion", texto: "Se distrae fácilmente con estímulos externos", valor: 2 },
  { id: "atencion_4", categoria: "atencion_concentracion", texto: "Completa las actividades iniciadas", valor: 5 },
  { id: "conducta_2", categoria: "conducta_comportamiento", texto: "Sigue instrucciones verbales", valor: 4 },
  { id: "conducta_4", categoria: "conducta_comportamiento", texto: "Maneja la frustración ante dificultades", valor: 4 },
  { id: "conducta_5", categoria: "conducta_comportamiento", texto: "Muestra disposición para trabajar", valor: 5 },
  { id: "lectura_1", categoria: "lectura_escritura", texto: "Reconoce letras del abecedario", valor: 4 },
  { id: "lectura_2", categoria: "lectura_escritura", texto: "Lee sílabas simples", valor: 4 },
  { id: "lectura_3", categoria: "lectura_escritura", texto: "Lee palabras simples", valor: 3 },
  { id: "interaccion_1", categoria: "interaccion_voluntario", texto: "Responde preguntas del voluntario", valor: 5 },
  { id: "interaccion_2", categoria: "interaccion_voluntario", texto: "Pide ayuda cuando lo necesita", valor: 4 },
];

// Sesión media (progreso normal)
const itemsMedia = [
  { id: "atencion_1", categoria: "atencion_concentracion", texto: "Mantiene atención en la actividad propuesta", valor: 3 },
  { id: "atencion_2", categoria: "atencion_concentracion", texto: "Se distrae fácilmente con estímulos externos", valor: 3 },
  { id: "atencion_4", categoria: "atencion_concentracion", texto: "Completa las actividades iniciadas", valor: 3 },
  { id: "conducta_2", categoria: "conducta_comportamiento", texto: "Sigue instrucciones verbales", valor: 3 },
  { id: "conducta_4", categoria: "conducta_comportamiento", texto: "Maneja la frustración ante dificultades", valor: 2 },
  { id: "conducta_5", categoria: "conducta_comportamiento", texto: "Muestra disposición para trabajar", valor: 4 },
  { id: "lectura_1", categoria: "lectura_escritura", texto: "Reconoce letras del abecedario", valor: 3 },
  { id: "lectura_2", categoria: "lectura_escritura", texto: "Lee sílabas simples", valor: 2 },
  { id: "interaccion_1", categoria: "interaccion_voluntario", texto: "Responde preguntas del voluntario", valor: 3 },
  { id: "interaccion_2", categoria: "interaccion_voluntario", texto: "Pide ayuda cuando lo necesita", valor: 3 },
];

// Sesión excelente
const itemsExcelente = [
  { id: "atencion_1", categoria: "atencion_concentracion", texto: "Mantiene atención en la actividad propuesta", valor: 5 },
  { id: "atencion_2", categoria: "atencion_concentracion", texto: "Se distrae fácilmente con estímulos externos", valor: 1 },
  { id: "atencion_4", categoria: "atencion_concentracion", texto: "Completa las actividades iniciadas", valor: 5 },
  { id: "conducta_2", categoria: "conducta_comportamiento", texto: "Sigue instrucciones verbales", valor: 5 },
  { id: "conducta_4", categoria: "conducta_comportamiento", texto: "Maneja la frustración ante dificultades", valor: 5 },
  { id: "conducta_5", categoria: "conducta_comportamiento", texto: "Muestra disposición para trabajar", valor: 5 },
  { id: "lectura_1", categoria: "lectura_escritura", texto: "Reconoce letras del abecedario", valor: 5 },
  { id: "lectura_2", categoria: "lectura_escritura", texto: "Lee sílabas simples", valor: 5 },
  { id: "lectura_3", categoria: "lectura_escritura", texto: "Lee palabras simples", valor: 4 },
  { id: "lectura_4", categoria: "lectura_escritura", texto: "Comprende lo que lee", valor: 4 },
  { id: "interaccion_1", categoria: "interaccion_voluntario", texto: "Responde preguntas del voluntario", valor: 5 },
  { id: "interaccion_2", categoria: "interaccion_voluntario", texto: "Pide ayuda cuando lo necesita", valor: 5 },
];

// Sesión con dificultades
const itemsDificil = [
  { id: "atencion_1", categoria: "atencion_concentracion", texto: "Mantiene atención en la actividad propuesta", valor: 2 },
  { id: "atencion_2", categoria: "atencion_concentracion", texto: "Se distrae fácilmente con estímulos externos", valor: 4 },
  { id: "atencion_4", categoria: "atencion_concentracion", texto: "Completa las actividades iniciadas", valor: 2 },
  { id: "conducta_2", categoria: "conducta_comportamiento", texto: "Sigue instrucciones verbales", valor: 2 },
  { id: "conducta_4", categoria: "conducta_comportamiento", texto: "Maneja la frustración ante dificultades", valor: 1 },
  { id: "conducta_5", categoria: "conducta_comportamiento", texto: "Muestra disposición para trabajar", valor: 2 },
  { id: "lectura_1", categoria: "lectura_escritura", texto: "Reconoce letras del abecedario", valor: 2 },
  { id: "lectura_2", categoria: "lectura_escritura", texto: "Lee sílabas simples", valor: 1 },
  { id: "interaccion_1", categoria: "interaccion_voluntario", texto: "Responde preguntas del voluntario", valor: 2 },
  { id: "interaccion_2", categoria: "interaccion_voluntario", texto: "Pide ayuda cuando lo necesita", valor: 2 },
];

async function main() {
  console.log("=== OBTENER SESIONES EXISTENTES ===");
  const { json: sesiones } = await req("GET", "/rest/v1/sesiones?select=id,items,objetivo_sesion&order=created_at.asc");
  
  if (!sesiones || sesiones.length === 0) {
    console.log("No hay sesiones. Ejecutar seed base primero.");
    return;
  }

  console.log(`Sesiones encontradas: ${sesiones.length}`);
  sesiones.forEach((s, i) => console.log(`  [${i}] ${s.id.slice(-8)} items=${s.items?.length || 0}`));

  // Distribuir items entre las sesiones
  const itemsSets = [itemsBuena, itemsMedia, itemsExcelente, itemsDificil, itemsBuena];

  console.log("\n=== ACTUALIZAR ITEMS ===");
  for (let i = 0; i < sesiones.length; i++) {
    const sesion = sesiones[i];
    if (sesion.items && sesion.items.length > 0) {
      console.log(`  SKIP ${sesion.id.slice(-8)} — ya tiene ${sesion.items.length} items`);
      continue;
    }
    const items = itemsSets[i % itemsSets.length];
    const { status, json } = await req(
      "PATCH",
      `/rest/v1/sesiones?id=eq.${sesion.id}`,
      { items }
    );
    if (status >= 400) {
      console.log(`  ❌ ${sesion.id.slice(-8)}: ${status}`, JSON.stringify(json));
    } else {
      const promedio = items.reduce((s, it) => s + it.valor, 0) / items.length;
      console.log(`  ✅ ${sesion.id.slice(-8)} — ${items.length} items, promedio ${promedio.toFixed(1)}/5`);
    }
  }

  console.log("\n=== VERIFICACIÓN FINAL ===");
  const { json: check } = await req("GET", "/rest/v1/sesiones?select=id,items&order=created_at.asc");
  check?.forEach((s) => console.log(`  ${s.id.slice(-8)}: ${s.items?.length || 0} items`));
  console.log("\n=== DONE ===");
}

main().catch(console.error);
