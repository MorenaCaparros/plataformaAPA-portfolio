# Plataforma APA — Sistema de seguimiento educativo con IA

PWA para el seguimiento y análisis del proceso de alfabetización de niños en contextos vulnerables, desarrollada en colaboración con dos asociaciones civiles argentinas.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini_1.5_Flash-orange?logo=google)](https://aistudio.google.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-yellow?logo=vitest)](https://vitest.dev/)

---

## El problema que resuelve

Los voluntarios de alfabetización registraban las sesiones con papel y lápiz. Eso hacía imposible detectar patrones de aprendizaje, medir impacto real a lo largo del tiempo o generar alertas tempranas sobre niños que necesitaban más apoyo.

Esta plataforma digitaliza ese proceso: un formulario mobile-first que se completa en menos de 5 minutos, análisis automático del progreso con IA y protección de datos sensibles de menores con encriptación y control de acceso granular por roles.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Componentes UI | shadcn/ui + Radix UI |
| Backend / DB | Supabase (PostgreSQL 15 + Auth + Storage + RLS) |
| IA / Análisis | Google Gemini 1.5 Flash + LangChain.js |
| Estado del servidor | TanStack Query v5 |
| Estado global | Zustand |
| Offline / PWA | Dexie.js (IndexedDB) + Service Worker |
| Testing | Vitest + Testing Library |
| Deploy | Netlify |

---

## Funcionalidades

**Registro de sesiones**  
Checklist de 30+ ítems observacionales estructurados en categorías: atención y concentración, lectura, escritura, matemática, conducta, respuesta emocional y contexto familiar. Diseñado para completarse en menos de 5 minutos desde un celular.

**Análisis con IA**  
Resúmenes automáticos por niño, detección de patrones de progreso y alertas tempranas generadas con Google Gemini. El sistema no emite diagnósticos clínicos; produce observaciones descriptivas y sugerencias de acompañamiento basadas en bibliografía cargada.

**Sistema RAG (tipo NotebookLM)**  
Biblioteca psicopedagógica indexada con embeddings. Los profesionales pueden hacer preguntas en lenguaje natural y la respuesta incluye citas con página y fragmento de la fuente original.

**Offline-first**  
Las sesiones se guardan localmente en IndexedDB cuando no hay conexión y se sincronizan automáticamente al reconectar. Indicador visual permanente de estado (online / offline / sincronizando).

**Control de acceso por roles con anonimización**  
Cinco roles con permisos diferenciados: Voluntario, Coordinador, Trabajo Social, Psicopedagogía y Admin. Los voluntarios ven solo el alias del niño; nombre completo y datos sensibles están restringidos a roles habilitados. Row Level Security implementado en PostgreSQL para que las restricciones operen a nivel de base de datos.

**Dashboard ejecutivo**  
Métricas de impacto por zona, voluntario y período. Exportación de reportes en PDF. Sistema de feedback cuantitativo a voluntarios con análisis de Gemini.

**Gestión de capacitaciones**  
Módulo de formación para voluntarios con seguimiento de completitud, calificaciones y autoevaluaciones.

---

## Base de datos

31 tablas relacionales en PostgreSQL. Las principales:

```
perfiles          → usuarios del sistema con rol y zona asignada
ninos             → perfil educativo (alias, nivel, escolarización)
sesiones          → registro de cada encuentro voluntario-niño
items_observacion → los 30+ ítems con valor Likert por sesión
asignaciones      → relación voluntario ↔ niño
zonas             → sedes/barrios
capacitaciones    → módulos de formación para voluntarios
document_chunks   → embeddings para el sistema RAG (pgvector)
```

Los campos `nombre_completo` y `fecha_nacimiento` se encriptan con AES-256 antes de persistir.

---

## Levantar el proyecto localmente

### Opción A — Demo sin credenciales externas

```bash
git clone https://github.com/TU_USUARIO/plataforma-apa.git
cd plataforma-apa
npm install
cp .env.example .env.local
# En .env.local setear: NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

La aplicación levanta con datos ficticios internos, sin necesidad de Supabase ni API Key de Gemini.

Usuarios disponibles en modo demo:

| Email | Password | Rol |
|---|---|---|
| `admin@demo.apa` | `Demo1234!` | Admin |
| `coord1@demo.apa` | `Demo1234!` | Coordinador |
| `psico@demo.apa` | `Demo1234!` | Psicopedagogía |
| `voluntario1@demo.apa` | `Demo1234!` | Voluntario |

---

### Opción B — Con Supabase propio

```bash
git clone https://github.com/TU_USUARIO/plataforma-apa.git
cd plataforma-apa
npm install
cp .env.example .env.local
# Editar .env.local con las credenciales (ver instrucciones dentro del archivo)
```

Luego en Supabase SQL Editor:
1. Ejecutar las migraciones de `supabase/migrations/` en orden por fecha
2. Ejecutar `scripts/demo-seed.sql`

```bash
npm run demo:seed-users   # Crea los usuarios demo en Supabase Auth
npm run dev
```

---

## Tests

```bash
npm test                  # Todos los tests
npm run test:coverage     # Con reporte de cobertura HTML
npm run test:unit         # Solo tests unitarios
npm run test:components   # Solo tests de componentes
npm run test:api          # Solo tests de API routes
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/             # Login, registro
│   ├── dashboard/          # Dashboards por rol
│   └── api/                # 30+ API Routes
├── components/
│   ├── dashboard/          # AdminDashboard, CoordDashboard, PsicoDashboard...
│   ├── forms/              # FormularioSesion, Autoevaluaciones
│   └── ui/                 # Componentes base (shadcn/ui)
├── lib/
│   ├── supabase/           # Clients (browser, server, admin, demo mock)
│   ├── ia/                 # Gemini + LangChain + sistema RAG
│   ├── hooks/              # Custom hooks con TanStack Query
│   └── utils/              # Encriptación, formatters, helpers
└── types/                  # Tipos TypeScript de la BD y dominio

scripts/
├── demo-seed.sql           # Datos ficticios para Supabase
└── create-demo-users.ts    # Crea usuarios en Supabase Auth

supabase/
└── migrations/             # SQL migrations (schema completo, 31 tablas)
```

---

## Decisiones de arquitectura

**Seguridad de datos de menores**  
La restricción de acceso opera en dos capas: RLS en PostgreSQL (imposible de saltear desde el cliente) y encriptación AES-256 de campos PII antes de almacenarlos. Ni con acceso directo a la base de datos se pueden leer nombres o fechas de nacimiento sin la clave del servidor.

**Offline-first real**  
No es un "modo degradado". Las sesiones se escriben en IndexedDB con la misma estructura que en Supabase. La sincronización usa una cola con manejo de conflictos. El service worker cachea assets y respuestas de API para que la app sea usable sin señal.

**IA sin costo**  
El plan gratuito de Gemini tiene límite de 15 req/min por API Key. El sistema implementa rotación automática entre hasta 5 keys y rate limiting por usuario configurable, lo que permite 75 req/min sin costo. Las respuestas de análisis usan el contexto de las últimas sesiones y fragmentos relevantes de la biblioteca RAG.

**TanStack Query**  
Ningún componente hace fetch directo. Todas las consultas pasan por TanStack Query con `staleTime` configurado por tipo de dato. La navegación entre páginas es instantánea porque los datos están en caché.

---

## Autor

[Tu Nombre](https://tu-portfolio.com) — [LinkedIn](https://linkedin.com/in/tu-usuario) — [GitHub](https://github.com/tu-usuario)
