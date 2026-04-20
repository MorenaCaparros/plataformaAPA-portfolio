// CJS script - test voluntarios_capacitaciones states
const URL_BASE = "https://mxazuqmltvkreunukxrc.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXp1cW1sdHZrcmV1bnVreHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNzYyNSwiZXhwIjoyMDg5MjkzNjI1fQ._uMYGBXgGpUanqOf-OcS5lhY4s30wIUvWWintmCtrOw";
const H = { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json", Prefer: "return=representation" };
const VOL_ID = "00000000-0000-0000-0000-000000000002";
const CAP_ID = "c1000000-0000-0000-0000-000000000002";

function req(method, path, body) {
  return fetch(URL_BASE + "/rest/v1/" + path, {
    method: method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  }).then(function(r) { return r.text().then(function(t) { return { status: r.status, body: t }; }); });
}

var states = ["pendiente", "en_curso", "asignada", "inscripta", "aprobada", "activa"];

var chain = Promise.resolve();
states.forEach(function(estado) {
  chain = chain
    .then(function() { return req("DELETE", "voluntarios_capacitaciones?voluntario_id=eq." + VOL_ID + "&capacitacion_id=eq." + CAP_ID, null); })
    .then(function() {
      return req("POST", "voluntarios_capacitaciones", {
        voluntario_id: VOL_ID, capacitacion_id: CAP_ID, estado: estado, fecha_inscripcion: new Date().toISOString()
      });
    })
    .then(function(r) {
      var ok = r.status >= 200 && r.status < 300;
      console.log(estado + ": " + (ok ? "OK" : r.status + " " + r.body.substring(0, 120)));
    });
});

chain = chain
  .then(function() { return req("DELETE", "voluntarios_capacitaciones?voluntario_id=eq." + VOL_ID + "&capacitacion_id=eq." + CAP_ID, null); })
  .then(function() { return req("GET", "voluntarios_capacitaciones?select=*&limit=10", null); })
  .then(function(r) { console.log("\nExisting rows:", r.body); })
  .catch(function(e) { console.error("ERROR:", e); });
