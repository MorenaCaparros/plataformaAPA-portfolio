# 🧪 Plan de Testing — Plataforma APA

> **Estado:** Planificado — implementar cuando la plataforma esté estable en producción.
> **Framework elegido:** Vitest + Testing Library + Playwright
> **Última actualización:** 20/02/2026

---

## Filosofía general

- **No testar todo**: enfocarse en lógica crítica, no en trivialidades.
- **Prioridad por impacto**: primero lo que rompe flujos de usuario (sesiones, autoevaluaciones, seguridad de roles).
- **Sin datos reales**: todos los tests usan datos ficticios (alias inventados, nunca PII de niños reales).
- **CI/CD**: los tests deben correr en GitHub Actions en cada push a `main`.

---

## Stack de testing

| Capa | Tool | Para qué |
|------|------|----------|
| Unit | **Vitest** | Funciones puras, helpers, lógica de negocio |
| Componentes | **Vitest + Testing Library** | Render de componentes React con mocks |
| API Routes | **Vitest + `fetch` mockeado** | Lógica de los handlers de Next.js API |
| Supabase | **Supabase local** o **mocks** | Queries, RLS, triggers |
| E2E / Front | **Playwright** | Flujos completos en navegador real |
| Seguridad de roles | **Playwright** | Verificar que cada rol ve solo lo que debe |

### Instalación pendiente (cuando se implemente)

```bash
# Ya instalado:
# vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, jsdom

# Pendiente para E2E:
npm install --save-dev @playwright/test
npx playwright install chromium

# Pendiente para Supabase local (tests de DB):
# Requiere Docker + Supabase CLI
npx supabase start
```

---

## Estructura de carpetas (ya creada, archivos pendientes)

```
src/tests/
├── PLAN_DE_TESTING.md          ← este archivo
├── setup.ts                    ← configuración global (pendiente crear)
├── unit/                       ← funciones puras, sin IO
│   ├── items-observacion.test.ts
│   ├── date-helpers.test.ts
│   ├── metricas-roles.test.ts
│   └── autoevaluacion-scoring.test.ts
├── api/                        ← API routes de Next.js (mocks de Supabase)
│   ├── metricas.test.ts
│   ├── asignaciones.test.ts
│   ├── autoevaluaciones.test.ts
│   └── sesiones.test.ts
├── integration/                ← tests contra Supabase local (Docker)
│   ├── rls-roles.test.ts
│   ├── evaluaciones-iniciales.test.ts
│   └── sesiones-db.test.ts
└── e2e/                        ← Playwright (pendiente crear carpeta)
    ├── auth.spec.ts
    ├── voluntario-flujo.spec.ts
    ├── sesion-nueva.spec.ts
    ├── autoevaluacion.spec.ts
    └── roles-acceso.spec.ts
```

---

## 1. Tests Unitarios (`unit/`)

> Sin dependencias externas. Solo lógica pura de TypeScript.

### 1.1 `items-observacion.test.ts`

**Archivo bajo test:** `src/lib/constants/items-observacion.ts`

| Test | Descripción |
|------|-------------|
| `calcularPromedioItems — vacío` | Retorna 0 si array vacío |
| `calcularPromedioItems — excluye N/C (valor 0)` | Items con valor 0 no cuentan en el promedio |
| `calcularPromedioItems — todos N/C` | Retorna 0 si todos son 0 |
| `calcularPromedioItems — valores normales` | Promedio correcto con valores 1-5 |
| `contarItemsCompletados — mixto` | Distingue completados, N/C y total |
| `ITEMS_OBSERVACION — 37 items` | Verifica que la lista tiene la cantidad correcta |
| `ITEMS_OBSERVACION — ids únicos` | No hay IDs duplicados |
| `ITEMS_OBSERVACION — categorías válidas` | Todos pertenecen a categorías definidas |

---

### 1.2 `date-helpers.test.ts`

**Archivo bajo test:** `src/lib/utils/date-helpers.ts`

| Test | Descripción |
|------|-------------|
| `calcularEdad — nulo` | Retorna null si no hay fecha |
| `calcularEdad — exacto` | Edad correcta cuando ya cumplió años este año |
| `calcularEdad — antes del cumpleaños` | No suma año si aún no cumplió |
| `formatearEdad — con fecha` | Muestra "X años" |
| `formatearEdad — sin fecha, con rango` | Usa el rango etario como fallback |
| `formatearEdad — sin nada` | Muestra "Edad no especificada" |

---

### 1.3 `metricas-roles.test.ts`

**Archivo bajo test:** `src/app/api/metricas/route.ts` (lógica del switch de roles)

| Test | Descripción |
|------|-------------|
| `rol voluntario → getMetricasVoluntario` | Switch correcto |
| `rol coordinador → getMetricasEquipo` | Switch correcto |
| `rol trabajador_social → getMetricasEquipo` | No da 400 (bug corregido) |
| `rol trabajadora_social → getMetricasEquipo` | No da 400 (bug corregido) |
| `rol equipo_profesional → getMetricasEquipo` | No da 400 (bug corregido) |
| `rol psicopedagogia → getMetricasAdmin` | Switch correcto |
| `rol admin → getMetricasAdmin` | Switch correcto |
| `rol director → getMetricasAdmin` | Switch correcto |
| `rol inválido → 400` | Responde error correcto |
| `sin userId → 400` | Responde error correcto |

---

### 1.4 `autoevaluacion-scoring.test.ts`

**Contexto:** bug corregido donde `puntaje_automatico` usaba `puntaje_final / 10` en vez de `porcentaje / 10`

| Test | Descripción |
|------|-------------|
| `porcentaje 100 → puntaje_total 10` | Conversión correcta |
| `porcentaje 50 → puntaje_total 5` | Conversión correcta |
| `porcentaje null → puntaje_total null` | No crashea con null |
| `puntaje_total === puntaje_automatico` | Ambos usan la misma fuente (porcentaje) |
| `puntaje_final ignorado` | `puntaje_final` no altera el score mostrado |

---

## 2. Tests de API Routes (`api/`)

> Mockean Supabase con `vi.mock`. Testean la lógica del handler.

### 2.1 `metricas.test.ts`

| Test | Descripción |
|------|-------------|
| `GET sin parámetros → 400` | userId y rol son requeridos |
| `GET rol voluntario → shape correcta` | Respuesta tiene claves `resumen`, `detalle`, `tendencias` |
| `GET rol coordinador → shape correcta` | Respuesta tiene claves `zona`, `resumen`, `equipo`, `atencion` |
| `GET rol equipo_profesional → shape correcta` | Igual que coordinador (no da 400) |
| `GET rol admin → shape correcta` | Respuesta tiene claves `resumen`, `este_mes`, `distribucion` |
| `Supabase error → 500` | Manejo correcto de errores de DB |

---

### 2.2 `asignaciones.test.ts`

| Test | Descripción |
|------|-------------|
| `GET sin token → 401` | Requiere autenticación |
| `GET token inválido → 401` | Token que no corresponde a ningún usuario |
| `GET como voluntario → solo sus asignaciones` | Filtrado por rol |
| `GET como coordinador → todas` | Sin filtro por voluntario_id |
| `POST sin rol permitido (voluntario) → 403` | Solo director/coordinador/psicopedagogia pueden crear |
| `POST datos válidos → 201 + asignación creada` | Creación exitosa |
| `PATCH desactivar asignación → activa = false` | Update correcto |

---

### 2.3 `sesiones.test.ts`

| Test | Descripción |
|------|-------------|
| `POST sin evaluación inicial → bloquear` | Verifica la lógica de bloqueo |
| `POST con evaluación inicial → permite` | Flujo normal |
| `POST items incompletos → error` | Validación de ítems |
| `GET sesiones como voluntario → solo las propias` | Filtrado por rol |

---

## 3. Tests de Integración con Supabase (`integration/`)

> Requieren **Supabase local** corriendo via Docker.
> Se conectan a la DB real pero usando datos de test que se limpian después de cada suite.

### Prerequisito

```bash
npx supabase start   # levanta Postgres + Auth local
# Variables de entorno para tests:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=<local anon key>
# SUPABASE_SERVICE_ROLE_KEY=<local service role key>
```

### 3.1 `rls-roles.test.ts`

> Verifica que Row Level Security funciona como se diseñó.

| Test | Descripción |
|------|-------------|
| `voluntario NO lee ninos_sensibles` | RLS bloquea acceso |
| `psicopedagogia SÍ lee ninos_sensibles` | RLS permite acceso |
| `voluntario NO ve sesiones de otros voluntarios` | Filtrado por RLS |
| `voluntario SÍ ve sus propias sesiones` | RLS correcto |
| `coordinador SÍ ve voluntarios de su zona` | RLS correcto |
| `coordinador NO ve voluntarios de otra zona` | RLS correcto |
| `director ve todos los registros` | RLS: acceso total |

---

### 3.2 `evaluaciones-iniciales.test.ts`

| Test | Descripción |
|------|-------------|
| `nino sin evaluación → query retorna null` | Comportamiento esperado de DB |
| `nino con evaluación → query retorna registro` | Comportamiento esperado |
| `insertar evaluación → nino queda habilitado` | Trigger o estado posterior |
| `equipo_profesional puede insertar` | Permisos correctos |
| `voluntario NO puede insertar` | RLS bloquea |

---

### 3.3 `sesiones-db.test.ts`

| Test | Descripción |
|------|-------------|
| `insertar sesión → aparece en listado` | CRUD básico |
| `sesión referencia nino_id válido` | FK constraint |
| `sesión referencia voluntario_id válido` | FK constraint |
| `trigger actualiza estadísticas` | Si hay triggers en DB |

---

## 4. Tests E2E con Playwright (`e2e/`)

> Corren en navegador real (Chromium). Testean el flujo completo usuario → UI → DB.
> Requieren el servidor Next.js corriendo (`npm run dev` o `npm run build && npm start`).

### 4.1 `auth.spec.ts`

| Test | Descripción |
|------|-------------|
| `Login exitoso → redirige a /dashboard` | Flujo de autenticación completo |
| `Login incorrecto → muestra error` | Mensaje de error visible |
| `Sin sesión → redirige a /login` | Middleware protege rutas |
| `Logout → redirige a /login` | Cierre de sesión |
| `Recuperar contraseña → envía email` | Flujo completo (mock de email) |

---

### 4.2 `voluntario-flujo.spec.ts`

> Logueado como voluntario con al menos un niño asignado en la DB de test.

| Test | Descripción |
|------|-------------|
| `Dashboard voluntario — carga sin errores` | No hay pantalla en blanco ni crasheos |
| `Sidebar — NO muestra "Niños"` | Elemento ausente en DOM |
| `Sidebar — muestra "Mis Sesiones", "Autoevaluaciones", "Biblioteca"` | Elementos presentes |
| `Acciones rápidas — NO muestra "Análisis con IA"` | Eliminado (bug corregido) |
| `Ir a Mis Niños → lista de niños asignados` | Navegación correcta |
| `Click "Ver Perfil" → abre perfil del niño` | Navegación sin error |

---

### 4.3 `sesion-nueva.spec.ts`

> Flujo crítico: el más importante de testear.

| Test | Descripción |
|------|-------------|
| `Niño sin evaluación inicial → banner rojo visible` | Warning mostrado |
| `Niño sin evaluación inicial → botón "Guardar" deshabilitado` | Disabled attribute presente |
| `Niño con evaluación → formulario completable` | Sin bloqueos |
| `Completar todos los ítems → progreso 100%` | Barra llega a 100 |
| `Enviar con ítems faltantes → modal de advertencia` | Modal visible con cuenta |
| `Guardar sesión exitosa → redirige a /dashboard/ninos` | Navegación post-submit |
| `Cronómetro — inicia al cargar la página` | Timer corriendo |
| `Cronómetro — pausar/reanudar` | Toggle funciona |
| `Borrador — se recupera al recargar` | localStorage persiste |

---

### 4.4 `autoevaluacion.spec.ts`

| Test | Descripción |
|------|-------------|
| `Lista de autoevaluaciones — carga` | Página carga sin error |
| `Score mostrado = porcentaje / 10` | Verifica que es X.X/10 |
| `Mis respuestas — todos los grupos expandidos por defecto` | Historial visible sin click |
| `Completar autoevaluación → score correcto al final` | Cálculo consistente |

---

### 4.5 `roles-acceso.spec.ts`

> Matriz de acceso: verifica que cada rol solo accede a lo que debe.

| Rol | Ruta | Acceso esperado |
|-----|------|-----------------|
| `voluntario` | `/dashboard/asignaciones` | Redirige (403/redirect) |
| `voluntario` | `/dashboard/usuarios` | Redirige |
| `voluntario` | `/dashboard/metricas` | Redirige |
| `voluntario` | `/dashboard/ninos` | Redirige |
| `coordinador` | `/dashboard/asignaciones` | Accede ✅ |
| `coordinador` | `/dashboard/usuarios` | Redirige (solo admin) |
| `equipo_profesional` | `/dashboard/metricas` | Accede ✅ (bug corregido) |
| `equipo_profesional` | `/dashboard/ninos/[id]` | Accede ✅ |
| `director` | Cualquier ruta | Accede ✅ |
| Sin sesión | Cualquier `/dashboard/*` | Redirige a `/login` |

---

## 5. Cobertura objetivo

| Capa | Cobertura mínima objetivo |
|------|--------------------------|
| Unit (funciones puras) | **90%** |
| API routes (handlers) | **70%** |
| Integración (Supabase) | **60%** de tablas críticas |
| E2E (flujos críticos) | **100%** de flujos del TESTING_PENDIENTE.md |

---

## 6. CI/CD — GitHub Actions (pendiente crear)

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  unit-and-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:api

  integration:
    runs-on: ubuntu-latest
    services:
      # Supabase local via Docker
    steps:
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: npx playwright test
```

Scripts a agregar en `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run src/tests/unit",
    "test:api": "vitest run src/tests/api",
    "test:integration": "vitest run src/tests/integration",
    "test:e2e": "playwright test src/tests/e2e",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 7. Datos de test (fixtures)

> Cuando se implementen los tests, usar estos datos ficticios. **Jamás datos reales.**

```typescript
// src/tests/fixtures/usuarios.ts
export const VOLUNTARIO_TEST = {
  id: 'test-vol-001',
  email: 'voluntario.test@apa.test',
  rol: 'voluntario',
  nombre: 'María',
  apellido: 'García',
};

export const COORDINADOR_TEST = {
  id: 'test-coord-001',
  email: 'coordinador.test@apa.test',
  rol: 'coordinador',
};

export const DIRECTOR_TEST = {
  id: 'test-dir-001',
  email: 'director.test@apa.test',
  rol: 'director',
};

// src/tests/fixtures/ninos.ts
export const NINO_SIN_EVALUACION = {
  id: 'test-nino-001',
  alias: 'Alias Test 1',
  rango_etario: '8-10',
  nivel_alfabetizacion: 'inicial',
};

export const NINO_CON_EVALUACION = {
  id: 'test-nino-002',
  alias: 'Alias Test 2',
  rango_etario: '10-12',
  nivel_alfabetizacion: 'intermedio',
};
```

---

## 8. Prioridad de implementación

Cuando se decida avanzar con los tests, este es el orden recomendado:

1. **`unit/date-helpers.test.ts`** — más fácil, 0 dependencias
2. **`unit/items-observacion.test.ts`** — validar lógica de cálculo de promedios
3. **`unit/metricas-roles.test.ts`** — previene regresiones en el switch de roles
4. **`unit/autoevaluacion-scoring.test.ts`** — previene que el bug del 50% vuelva
5. **`api/metricas.test.ts`** — testar el endpoint más usado
6. **`e2e/auth.spec.ts`** — flujo base que todo lo demás necesita
7. **`e2e/sesion-nueva.spec.ts`** — flujo más crítico de la plataforma
8. **`e2e/roles-acceso.spec.ts`** — seguridad de acceso por rol
9. **`integration/rls-roles.test.ts`** — requiere Docker/Supabase local
10. El resto según disponibilidad

---

*Este documento se actualiza a medida que se agregan nuevas funcionalidades.*
