#!/bin/zsh
# insert-audit-logs.sh
# Inserta ~40 logs mock en audit_logs via curl (Supabase REST API)
# Requiere que la tabla audit_logs ya exista (ver SQL abajo)
# Ejecutar: zsh scripts/insert-audit-logs.sh

SVC="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw"
URL="https://mxazuqmltvkreunukxrc.supabase.co/rest/v1/audit_logs"

ADMIN="b1000000-0000-0000-0000-000000000001"
EQUIPO="b1000000-0000-0000-0000-000000000002"
VOL="b1000000-0000-0000-0000-000000000006"

now() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
hago() { date -u -v-${1}H +"%Y-%m-%dT%H:%M:%SZ"; }
dago() { date -u -v-${1}d +"%Y-%m-%dT%H:%M:%SZ"; }

post() {
  STATUS=$(curl -s -o /tmp/al_resp.txt -w "%{http_code}" -X POST "$URL" \
    -H "apikey: $SVC" \
    -H "Authorization: Bearer $SVC" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$1")
  if [ "$STATUS" = "201" ]; then
    echo "✅ $2"
  else
    echo "❌ $2 → $STATUS: $(cat /tmp/al_resp.txt)"
  fi
}

echo "🚀 Insertando audit logs...\n"

# Limpiar existentes
curl -s -o /dev/null -X DELETE "$URL?id=neq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Prefer: return=minimal"
echo "🗑️  Logs anteriores eliminados\n"

# ── Sesiones ───────────────────────────────────────────────────────────────────
post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000001","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"lectura","duracion_minutos":45,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"192.168.1.10","dispositivo":"mobile"},"created_at":"'$(hago 2)'"}]' "Sesión INSERT (hoy -2h)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000002","accion":"UPDATE","valores_antes":{"estado":"pendiente"},"valores_despues":{"estado":"completada","observaciones":"Muy buena sesión, alta concentración"},"campos_modificados":["estado","observaciones"],"metadata":{"ip":"192.168.1.10"},"created_at":"'$(hago 5)'"}]' "Sesión UPDATE (hoy -5h)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000003","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"evaluacion","duracion_minutos":60,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 1)'"}]' "Sesión evaluación INSERT (-1d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000004","accion":"UPDATE","valores_antes":{"duracion_minutos":30},"valores_despues":{"duracion_minutos":45},"campos_modificados":["duracion_minutos"],"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 1)'"}]' "Sesión UPDATE duración (-1d)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000005","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"juego_educativo","duracion_minutos":50,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"192.168.1.15","dispositivo":"tablet"},"created_at":"'$(dago 5)'"}]' "Sesión juego INSERT (-5d)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000006","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"lectura","duracion_minutos":35,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"192.168.1.15"},"created_at":"'$(dago 6)'"}]' "Sesión lectura INSERT (-6d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000007","accion":"UPDATE","valores_antes":{"estado":"pendiente","observaciones":null},"valores_despues":{"estado":"completada","observaciones":"Progreso notable en comprensión lectora."},"campos_modificados":["estado","observaciones"],"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 7)'"}]' "Sesión UPDATE obs (-7d)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000008","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"matematica","duracion_minutos":40,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"192.168.1.10"},"created_at":"'$(hago 1)'"}]' "Sesión matemática INSERT (-1h)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000009","accion":"DELETE","valores_antes":{"tipo":"lectura","estado":"cancelada","duracion_minutos":0},"valores_despues":null,"campos_modificados":null,"metadata":{"ip":"10.0.0.5","motivo":"Sesión cancelada sin datos"},"created_at":"'$(hago 10)'"}]' "Sesión DELETE cancelada (-10h)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000010","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"evaluacion_comprension","duracion_minutos":55,"estado":"completada"},"campos_modificados":null,"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 17)'"}]' "Sesión eval comprensión (-17d)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"sesiones","fila_id":"s1000000-0000-0000-0000-000000000011","accion":"UPDATE","valores_antes":{"observaciones":null},"valores_despues":{"observaciones":"Muy motivado. Terminó todos los ejercicios."},"campos_modificados":["observaciones"],"metadata":{"ip":"192.168.1.10"},"created_at":"'$(dago 18)'"}]' "Sesión UPDATE obs (-18d)"

# ── Niños ──────────────────────────────────────────────────────────────────────
post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000001","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Sofia","apellido":"Lopez","edad":7},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"panel_admin"},"created_at":"'$(dago 2)'"}]' "Niño Sofia INSERT (-2d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000002","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Tomas","apellido":"Martinez","edad":9},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"panel_admin"},"created_at":"'$(dago 2)'"}]' "Niño Tomás INSERT (-2d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000001","accion":"UPDATE","valores_antes":{"notas":null},"valores_despues":{"notas":"Dificultades lecto-escritura. Iniciar plan refuerzo."},"campos_modificados":["notas"],"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 3)'"}]' "Niño UPDATE notas (-3d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000003","accion":"UPDATE","valores_antes":{"activo":true},"valores_despues":{"activo":false,"motivo_baja":"Traslado familiar"},"campos_modificados":["activo","motivo_baja"],"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 4)'"}]' "Niño UPDATE baja (-4d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000004","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Agustin","apellido":"Diaz","edad":8},"campos_modificados":null,"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 12)'"}]' "Niño Agustín INSERT (-12d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000005","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Camila","apellido":"Romero","edad":6},"campos_modificados":null,"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 12)'"}]' "Niño Camila INSERT (-12d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000002","accion":"UPDATE","valores_antes":{"zona_id":"z1000000-0000-0000-0000-000000000001"},"valores_despues":{"zona_id":"z1000000-0000-0000-0000-000000000002"},"campos_modificados":["zona_id"],"metadata":{"ip":"203.0.113.1","motivo":"Cambio de equipo por proximidad geografica"},"created_at":"'$(hago 8)'"}]' "Niño UPDATE zona (-8h)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000003","accion":"UPDATE","valores_antes":{"prioridad":"media"},"valores_despues":{"prioridad":"alta"},"campos_modificados":["prioridad"],"metadata":{"ip":"203.0.113.1","motivo":"Revision trimestral de prioridades"},"created_at":"'$(dago 20)'"}]' "Niño UPDATE prioridad (-20d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"ninos","fila_id":"n1000000-0000-0000-0000-000000000006","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Luciana","apellido":"Fernandez","edad":10},"campos_modificados":null,"metadata":{"ip":"10.0.0.5"},"created_at":"'$(dago 14)'"}]' "Niño Luciana INSERT (-14d)"

# ── Perfiles ───────────────────────────────────────────────────────────────────
post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"'$VOL'","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Carlos","apellido":"Ruiz","rol":"voluntario","activo":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"panel_admin"},"created_at":"'$(dago 5)'"}]' "Perfil Carlos INSERT (-5d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"'$EQUIPO'","accion":"UPDATE","valores_antes":{"rol":"voluntario"},"valores_despues":{"rol":"equipo_profesional"},"campos_modificados":["rol"],"metadata":{"ip":"203.0.113.1","motivo":"Promocion de rol"},"created_at":"'$(dago 6)'"}]' "Perfil UPDATE rol (-6d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000005","accion":"UPDATE","valores_antes":{"activo":true},"valores_despues":{"activo":false},"campos_modificados":["activo"],"metadata":{"ip":"203.0.113.1","motivo":"Baja voluntaria"},"created_at":"'$(dago 7)'"}]' "Perfil UPDATE baja (-7d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000007","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Laura","apellido":"Perez","rol":"voluntario","activo":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"importacion_csv"},"created_at":"'$(dago 11)'"}]' "Perfil Laura INSERT (-11d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000008","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Martin","apellido":"Gonzalez","rol":"voluntario","activo":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"importacion_csv"},"created_at":"'$(dago 11)'"}]' "Perfil Martin INSERT (-11d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000009","accion":"INSERT","valores_antes":null,"valores_despues":{"nombre":"Valentina","apellido":"Torres","rol":"voluntario","activo":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","origen":"importacion_csv"},"created_at":"'$(dago 11)'"}]' "Perfil Valentina INSERT (-11d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"'$VOL'","accion":"UPDATE","valores_antes":{"max_ninos_asignados":2},"valores_despues":{"max_ninos_asignados":3},"campos_modificados":["max_ninos_asignados"],"metadata":{"ip":"203.0.113.1"},"created_at":"'$(hago 3)'"}]' "Perfil UPDATE max_ninos (-3h)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000009","accion":"UPDATE","valores_antes":{"horas_disponibles":2},"valores_despues":{"horas_disponibles":4},"campos_modificados":["horas_disponibles"],"metadata":{"ip":"203.0.113.1"},"created_at":"'$(hago 12)'"}]' "Perfil UPDATE horas (-12h)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"perfiles","fila_id":"b1000000-0000-0000-0000-000000000010","accion":"DELETE","valores_antes":{"nombre":"Usuario","apellido":"Prueba","rol":"voluntario","activo":false},"valores_despues":null,"campos_modificados":null,"metadata":{"ip":"203.0.113.1","motivo":"Cuenta de prueba eliminada"},"created_at":"'$(dago 16)'"}]' "Perfil DELETE prueba (-16d)"

# ── Asignaciones ───────────────────────────────────────────────────────────────
post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000001","accion":"INSERT","valores_antes":null,"valores_despues":{"voluntario_id":"'$VOL'","nino_id":"n1000000-0000-0000-0000-000000000001","activa":true},"campos_modificados":null,"metadata":{"ip":"10.0.0.5","metodo":"matching_manual"},"created_at":"'$(dago 8)'"}]' "Asignación INSERT (-8d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000002","accion":"UPDATE","valores_antes":{"activa":true},"valores_despues":{"activa":false,"fecha_fin":"2026-04-01"},"campos_modificados":["activa","fecha_fin"],"metadata":{"ip":"10.0.0.5","motivo":"Cierre de ciclo"},"created_at":"'$(dago 9)'"}]' "Asignación UPDATE cierre (-9d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000003","accion":"DELETE","valores_antes":{"activa":false},"valores_despues":null,"campos_modificados":null,"metadata":{"ip":"203.0.113.1","motivo":"Limpieza registros inactivos"},"created_at":"'$(dago 10)'"}]' "Asignación DELETE (-10d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000004","accion":"INSERT","valores_antes":null,"valores_despues":{"voluntario_id":"b1000000-0000-0000-0000-000000000007","nino_id":"n1000000-0000-0000-0000-000000000004","activa":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","metodo":"matching_ia"},"created_at":"'$(dago 13)'"}]' "Asignación INSERT IA (-13d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000005","accion":"INSERT","valores_antes":null,"valores_despues":{"voluntario_id":"b1000000-0000-0000-0000-000000000008","nino_id":"n1000000-0000-0000-0000-000000000005","activa":true},"campos_modificados":null,"metadata":{"ip":"203.0.113.1","metodo":"matching_ia"},"created_at":"'$(dago 13)'"}]' "Asignación INSERT IA 2 (-13d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"asignaciones","fila_id":"a1000000-0000-0000-0000-000000000006","accion":"UPDATE","valores_antes":{"notas":null},"valores_despues":{"notas":"Seguimiento especial requerido"},"campos_modificados":["notas"],"metadata":{"ip":"203.0.113.1"},"created_at":"'$(dago 15)'"}]' "Asignación UPDATE notas (-15d)"

# ── Documentos ─────────────────────────────────────────────────────────────────
post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"documentos","fila_id":"d1000000-0000-0000-0000-000000000001","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"informe_sesion","nombre":"Informe_Sesion_Abril.pdf"},"campos_modificados":null,"metadata":{"ip":"192.168.1.10","size_kb":245},"created_at":"'$(dago 2)'"}]' "Documento INSERT informe (-2d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"documentos","fila_id":"d1000000-0000-0000-0000-000000000002","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"evaluacion_psicopedagogica","nombre":"Eval_Inicial_Sofia.pdf"},"campos_modificados":null,"metadata":{"ip":"10.0.0.5","size_kb":890},"created_at":"'$(dago 3)'"}]' "Documento INSERT eval (-3d)"

post '[{"user_id":"'$ADMIN'","user_email":"admin@demo.apa","user_rol":"admin","tabla":"documentos","fila_id":"d1000000-0000-0000-0000-000000000003","accion":"DELETE","valores_antes":{"tipo":"borrador","nombre":"borrador_sin_usar.docx"},"valores_despues":null,"campos_modificados":null,"metadata":{"ip":"203.0.113.1","motivo":"Archivo duplicado"},"created_at":"'$(dago 4)'"}]' "Documento DELETE borrador (-4d)"

post '[{"user_id":"'$EQUIPO'","user_email":"equipo@demo.apa","user_rol":"equipo_profesional","tabla":"documentos","fila_id":"d1000000-0000-0000-0000-000000000004","accion":"UPDATE","valores_antes":{"nombre":"plan_inicial.pdf"},"valores_despues":{"nombre":"plan_inicial_v2.pdf"},"campos_modificados":["nombre"],"metadata":{"ip":"10.0.0.5"},"created_at":"'$(hago 6)'"}]' "Documento UPDATE nombre (-6h)"

post '[{"user_id":"'$VOL'","user_email":"voluntario@demo.apa","user_rol":"voluntario","tabla":"documentos","fila_id":"d1000000-0000-0000-0000-000000000005","accion":"INSERT","valores_antes":null,"valores_despues":{"tipo":"foto_actividad","nombre":"actividad_lectura_22abr.jpg"},"campos_modificados":null,"metadata":{"ip":"192.168.1.10","size_kb":1240},"created_at":"'$(hago 14)'"}]' "Documento INSERT foto (-14h)"

echo "\n✅ Seed completado"
