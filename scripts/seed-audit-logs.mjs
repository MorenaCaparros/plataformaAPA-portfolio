#!/usr/bin/env node
// seed-audit-logs.mjs
// Crea la tabla audit_logs y la llena con datos mock realistas
// Ejecutar: node scripts/seed-audit-logs.mjs

const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";

const ADMIN_ID    = "b1000000-0000-0000-0000-000000000001";
const EQUIPO_ID   = "b1000000-0000-0000-0000-000000000002";
const VOL_ID      = "b1000000-0000-0000-0000-000000000006";

async function sql(query) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SVC,
      Authorization: "Bearer " + SVC,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return { status: res.status, text: await res.text() };
}

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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(h) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

// ─── PASO 1: Crear tabla ──────────────────────────────────────────────────────
async function crearTabla() {
  console.log("\n=== PASO 1: Crear tabla audit_logs ===");

  // Intentamos via SQL directo — si no existe exec_sql, usamos el endpoint de query
  const createSQL = `
    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      user_email      TEXT,
      user_rol        TEXT,
      tabla           TEXT NOT NULL,
      fila_id         TEXT NOT NULL,
      accion          TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
      valores_antes   JSONB,
      valores_despues JSONB,
      campos_modificados TEXT[],
      metadata        JSONB,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
    
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "admin_audit_logs" ON public.audit_logs;
    CREATE POLICY "admin_audit_logs" ON public.audit_logs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.perfiles
          WHERE id = auth.uid() AND rol IN ('admin','director')
        )
      );
    
    DROP POLICY IF EXISTS "service_role_audit_logs" ON public.audit_logs;
    CREATE POLICY "service_role_audit_logs" ON public.audit_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  `;

  const r = await sql(createSQL);
  console.log(`SQL create → ${r.status}: ${r.text.slice(0, 200)}`);

  if (r.status !== 200) {
    // Intentar verificar si la tabla ya existe
    const check = await api("GET", "/rest/v1/audit_logs?limit=1");
    if (check.status === 200 || check.status === 206) {
      console.log("✅ Tabla audit_logs ya existe");
      return true;
    } else {
      console.log("⚠️ No se pudo crear la tabla via SQL. Intenta correrlo manualmente en Supabase SQL Editor.");
      console.log("\nCopia y pega en https://supabase.com/dashboard/project/mxazuqmltvkreunukxrc/sql:\n");
      console.log(createSQL);
      return false;
    }
  }
  console.log("✅ Tabla creada");
  return true;
}

// ─── PASO 2: Limpiar logs anteriores ─────────────────────────────────────────
async function limpiarLogs() {
  console.log("\n=== PASO 2: Limpiar logs anteriores ===");
  const r = await api("DELETE", "/rest/v1/audit_logs?id=neq.00000000-0000-0000-0000-000000000000", null, { Prefer: "return=minimal" });
  console.log(`DELETE → ${r.status}`);
}

// ─── PASO 3: Insertar logs mock ───────────────────────────────────────────────
async function insertarLogs() {
  console.log("\n=== PASO 3: Insertar logs mock ===");

  const logs = [
    // --- Sesiones ---
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000001",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "lectura", duracion_minutos: 45, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.10", dispositivo: "mobile" },
      created_at: hoursAgo(2),
    },
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000002",
      accion: "UPDATE",
      valores_antes: { estado: "pendiente" },
      valores_despues: { estado: "completada", observaciones: "Muy buena sesión" },
      campos_modificados: ["estado", "observaciones"],
      metadata: { ip: "192.168.1.10" },
      created_at: hoursAgo(5),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000003",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "evaluacion", duracion_minutos: 60, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(1),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000004",
      accion: "UPDATE",
      valores_antes: { duracion_minutos: 30 },
      valores_despues: { duracion_minutos: 45 },
      campos_modificados: ["duracion_minutos"],
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(1),
    },
    // --- Niños ---
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000001",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Sofía", apellido: "López", edad: 7 },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "panel_admin" },
      created_at: daysAgo(2),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000002",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Tomás", apellido: "Martínez", edad: 9 },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "panel_admin" },
      created_at: daysAgo(2),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000001",
      accion: "UPDATE",
      valores_antes: { notas: null },
      valores_despues: { notas: "Presenta dificultades lecto-escritura. Iniciar plan refuerzo." },
      campos_modificados: ["notas"],
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(3),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000003",
      accion: "UPDATE",
      valores_antes: { activo: true },
      valores_despues: { activo: false, motivo_baja: "Traslado familiar" },
      campos_modificados: ["activo", "motivo_baja"],
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(4),
    },
    // --- Perfiles (usuarios) ---
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: VOL_ID,
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Carlos", apellido: "Ruiz", rol: "voluntario", activo: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "panel_admin" },
      created_at: daysAgo(5),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: EQUIPO_ID,
      accion: "UPDATE",
      valores_antes: { rol: "voluntario" },
      valores_despues: { rol: "equipo_profesional" },
      campos_modificados: ["rol"],
      metadata: { ip: "203.0.113.1", motivo: "Promoción de rol" },
      created_at: daysAgo(6),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000005",
      accion: "UPDATE",
      valores_antes: { activo: true },
      valores_despues: { activo: false },
      campos_modificados: ["activo"],
      metadata: { ip: "203.0.113.1", motivo: "Baja voluntaria" },
      created_at: daysAgo(7),
    },
    // --- Asignaciones ---
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000001",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { voluntario_id: VOL_ID, nino_id: "n1000000-0000-0000-0000-000000000001", activa: true },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5", metodo: "matching_manual" },
      created_at: daysAgo(8),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000002",
      accion: "UPDATE",
      valores_antes: { activa: true },
      valores_despues: { activa: false, fecha_fin: new Date().toISOString().split("T")[0] },
      campos_modificados: ["activa", "fecha_fin"],
      metadata: { ip: "10.0.0.5", motivo: "Cierre de ciclo" },
      created_at: daysAgo(9),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000003",
      accion: "DELETE",
      valores_antes: { voluntario_id: "b1000000-0000-0000-0000-000000000004", nino_id: "n1000000-0000-0000-0000-000000000004", activa: false },
      valores_despues: null,
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", motivo: "Limpieza de registros inactivos" },
      created_at: daysAgo(10),
    },
    // --- Documentos ---
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "documentos",
      fila_id: "d1000000-0000-0000-0000-000000000001",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "informe_sesion", nombre: "Informe_Sesion_Abril.pdf" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.10", size_kb: 245 },
      created_at: daysAgo(2),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "documentos",
      fila_id: "d1000000-0000-0000-0000-000000000002",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "evaluacion_psicopedagogica", nombre: "Eval_Inicial_Sofia.pdf" },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5", size_kb: 890 },
      created_at: daysAgo(3),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "documentos",
      fila_id: "d1000000-0000-0000-0000-000000000003",
      accion: "DELETE",
      valores_antes: { tipo: "borrador", nombre: "borrador_sin_usar.docx" },
      valores_despues: null,
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", motivo: "Archivo duplicado" },
      created_at: daysAgo(4),
    },
    // --- Más sesiones y actividad reciente ---
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000005",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "juego_educativo", duracion_minutos: 50, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.15", dispositivo: "tablet" },
      created_at: daysAgo(5),
    },
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000006",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "lectura", duracion_minutos: 35, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.15" },
      created_at: daysAgo(6),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000007",
      accion: "UPDATE",
      valores_antes: { estado: "pendiente", observaciones: null },
      valores_despues: { estado: "completada", observaciones: "Progreso notable en comprensión lectora." },
      campos_modificados: ["estado", "observaciones"],
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(7),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000007",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Laura", apellido: "Pérez", rol: "voluntario", activo: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "importacion_csv" },
      created_at: daysAgo(11),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000008",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Martín", apellido: "González", rol: "voluntario", activo: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "importacion_csv" },
      created_at: daysAgo(11),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000009",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Valentina", apellido: "Torres", rol: "voluntario", activo: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", origen: "importacion_csv" },
      created_at: daysAgo(11),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000004",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Agustín", apellido: "Díaz", edad: 8 },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(12),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000005",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Camila", apellido: "Romero", edad: 6 },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(12),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000004",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { voluntario_id: "b1000000-0000-0000-0000-000000000007", nino_id: "n1000000-0000-0000-0000-000000000004", activa: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", metodo: "matching_ia" },
      created_at: daysAgo(13),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000005",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { voluntario_id: "b1000000-0000-0000-0000-000000000008", nino_id: "n1000000-0000-0000-0000-000000000005", activa: true },
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", metodo: "matching_ia" },
      created_at: daysAgo(13),
    },
    // --- Actividad muy reciente ---
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000008",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "matematica", duracion_minutos: 40, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.10" },
      created_at: hoursAgo(1),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: VOL_ID,
      accion: "UPDATE",
      valores_antes: { max_ninos_asignados: 2 },
      valores_despues: { max_ninos_asignados: 3 },
      campos_modificados: ["max_ninos_asignados"],
      metadata: { ip: "203.0.113.1" },
      created_at: hoursAgo(3),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "documentos",
      fila_id: "d1000000-0000-0000-0000-000000000004",
      accion: "UPDATE",
      valores_antes: { nombre: "plan_inicial.pdf" },
      valores_despues: { nombre: "plan_inicial_v2.pdf" },
      campos_modificados: ["nombre"],
      metadata: { ip: "10.0.0.5" },
      created_at: hoursAgo(6),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000002",
      accion: "UPDATE",
      valores_antes: { zona_id: "z1000000-0000-0000-0000-000000000001" },
      valores_despues: { zona_id: "z1000000-0000-0000-0000-000000000002" },
      campos_modificados: ["zona_id"],
      metadata: { ip: "203.0.113.1", motivo: "Cambio de equipo por proximidad geográfica" },
      created_at: hoursAgo(8),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000009",
      accion: "DELETE",
      valores_antes: { tipo: "lectura", estado: "cancelada", duracion_minutos: 0 },
      valores_despues: null,
      campos_modificados: null,
      metadata: { ip: "10.0.0.5", motivo: "Sesión cancelada sin datos registrados" },
      created_at: hoursAgo(10),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000009",
      accion: "UPDATE",
      valores_antes: { horas_disponibles: 2 },
      valores_despues: { horas_disponibles: 4 },
      campos_modificados: ["horas_disponibles"],
      metadata: { ip: "203.0.113.1" },
      created_at: hoursAgo(12),
    },
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "documentos",
      fila_id: "d1000000-0000-0000-0000-000000000005",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "foto_actividad", nombre: "actividad_lectura_22abr.jpg" },
      campos_modificados: null,
      metadata: { ip: "192.168.1.10", size_kb: 1240 },
      created_at: hoursAgo(14),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000006",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { nombre: "Luciana", apellido: "Fernández", edad: 10 },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(14),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "asignaciones",
      fila_id: "a1000000-0000-0000-0000-000000000006",
      accion: "UPDATE",
      valores_antes: { activa: true, notas: null },
      valores_despues: { activa: true, notas: "Seguimiento especial requerido" },
      campos_modificados: ["notas"],
      metadata: { ip: "203.0.113.1" },
      created_at: daysAgo(15),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "perfiles",
      fila_id: "b1000000-0000-0000-0000-000000000010",
      accion: "DELETE",
      valores_antes: { nombre: "Usuario", apellido: "Prueba", rol: "voluntario", activo: false },
      valores_despues: null,
      campos_modificados: null,
      metadata: { ip: "203.0.113.1", motivo: "Cuenta de prueba eliminada" },
      created_at: daysAgo(16),
    },
    {
      user_id: EQUIPO_ID,
      user_email: "equipo@demo.apa",
      user_rol: "equipo_profesional",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000010",
      accion: "INSERT",
      valores_antes: null,
      valores_despues: { tipo: "evaluacion_comprension", duracion_minutos: 55, estado: "completada" },
      campos_modificados: null,
      metadata: { ip: "10.0.0.5" },
      created_at: daysAgo(17),
    },
    {
      user_id: VOL_ID,
      user_email: "voluntario@demo.apa",
      user_rol: "voluntario",
      tabla: "sesiones",
      fila_id: "s1000000-0000-0000-0000-000000000011",
      accion: "UPDATE",
      valores_antes: { observaciones: null },
      valores_despues: { observaciones: "Muy motivado hoy. Terminó todos los ejercicios." },
      campos_modificados: ["observaciones"],
      metadata: { ip: "192.168.1.10" },
      created_at: daysAgo(18),
    },
    {
      user_id: ADMIN_ID,
      user_email: "admin@demo.apa",
      user_rol: "admin",
      tabla: "ninos",
      fila_id: "n1000000-0000-0000-0000-000000000003",
      accion: "UPDATE",
      valores_antes: { prioridad: "media" },
      valores_despues: { prioridad: "alta" },
      campos_modificados: ["prioridad"],
      metadata: { ip: "203.0.113.1", motivo: "Revisión trimestral de prioridades" },
      created_at: daysAgo(20),
    },
  ];

  const r = await api("POST", "/rest/v1/audit_logs", logs);
  console.log(`INSERT ${logs.length} logs → ${r.status}`);
  if (r.status !== 201) {
    console.log("Error:", r.text.slice(0, 500));
    return false;
  }
  console.log(`✅ ${logs.length} logs insertados`);
  return true;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Seed audit_logs iniciado\n");

  const tablaOk = await crearTabla();
  if (!tablaOk) {
    // Si no se pudo crear via exec_sql, intentar insertar de todas formas
    // (puede que la tabla ya exista)
    console.log("\n⚠️  Continuando de todas formas (la tabla podría ya existir)...");
  }

  await limpiarLogs();
  const insOk = await insertarLogs();

  if (insOk) {
    console.log("\n✅ Todo listo. Refrescá /dashboard/audit-log en Netlify.");
  } else {
    console.log("\n❌ Falló la inserción. Ver errores arriba.");
    console.log("\nSi la tabla no existe, copiá el SQL de PASO 1 y ejecutalo en:");
    console.log("https://supabase.com/dashboard/project/mxazuqmltvkreunukxrc/sql");
  }
}

main().catch(console.error);
