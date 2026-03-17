/**
 * demo-data.ts
 * -----------
 * Datos ficticios para modo DEMO_MODE=true.
 * NO contiene ningún dato real de la organización.
 *
 * Activar con: NEXT_PUBLIC_DEMO_MODE=true en .env.local
 */

export type DemoZona    = { id: string; nombre: string; descripcion: string; activa: boolean };
export type DemoPerfil  = { id: string; nombre: string; apellido: string; email: string; rol: string; zona_id: string; activo: boolean };
export type DemoNino    = { id: string; alias: string; rango_etario: string; nivel_alfabetizacion: string; escolarizado: boolean; zona_id: string; fecha_ingreso: string; activo: boolean };
export type DemoSesion  = { id: string; nino_id: string; voluntario_id: string; fecha: string; duracion_minutos: number; observaciones_libres: string; created_offline: boolean };
export type DemoCapacitacion = { id: string; titulo: string; descripcion: string; tipo: string; duracion_horas: number; obligatoria: boolean; activa: boolean };

export const DEMO_ZONAS: DemoZona[] = [
  { id: 'zona-001', nombre: 'Barrio Norte', descripcion: 'Sede principal, sala multiuso', activa: true },
  { id: 'zona-002', nombre: 'Barrio Sur',   descripcion: 'Sede secundaria, 2 aulas',      activa: true },
  { id: 'zona-003', nombre: 'Centro',       descripcion: 'Sede centro comunitario',        activa: true },
];

export const DEMO_PERFILES: DemoPerfil[] = [
  { id: 'usr-admin',  nombre: 'Ana',     apellido: 'García',    email: 'admin@demo.apa',       rol: 'admin',          zona_id: 'zona-001', activo: true },
  { id: 'usr-coord1', nombre: 'Marcos',  apellido: 'Rodríguez', email: 'coord1@demo.apa',      rol: 'coordinador',    zona_id: 'zona-001', activo: true },
  { id: 'usr-coord2', nombre: 'Valeria', apellido: 'López',     email: 'coord2@demo.apa',      rol: 'coordinador',    zona_id: 'zona-002', activo: true },
  { id: 'usr-psico',  nombre: 'Laura',   apellido: 'Méndez',    email: 'psico@demo.apa',       rol: 'psicopedagogia', zona_id: 'zona-001', activo: true },
  { id: 'usr-social', nombre: 'Sandra',  apellido: 'Peralta',   email: 'social@demo.apa',      rol: 'trabajo_social', zona_id: 'zona-001', activo: true },
  { id: 'usr-vol1',   nombre: 'Diego',   apellido: 'Torres',    email: 'voluntario1@demo.apa', rol: 'voluntario',     zona_id: 'zona-001', activo: true },
  { id: 'usr-vol2',   nombre: 'Sofía',   apellido: 'Martínez',  email: 'voluntario2@demo.apa', rol: 'voluntario',     zona_id: 'zona-002', activo: true },
  { id: 'usr-vol3',   nombre: 'Tomás',   apellido: 'Flórez',    email: 'voluntario3@demo.apa', rol: 'voluntario',     zona_id: 'zona-001', activo: true },
];

export const DEMO_NINOS: DemoNino[] = [
  { id: 'nino-001', alias: 'Nico',  rango_etario: '8-10',  nivel_alfabetizacion: 'inicial',    escolarizado: true,  zona_id: 'zona-001', fecha_ingreso: '2025-03-01', activo: true },
  { id: 'nino-002', alias: 'Luli',  rango_etario: '8-10',  nivel_alfabetizacion: 'intermedio', escolarizado: true,  zona_id: 'zona-001', fecha_ingreso: '2025-03-01', activo: true },
  { id: 'nino-003', alias: 'Santi', rango_etario: '11-13', nivel_alfabetizacion: 'avanzado',   escolarizado: true,  zona_id: 'zona-001', fecha_ingreso: '2025-03-15', activo: true },
  { id: 'nino-004', alias: 'Maia',  rango_etario: '5-7',   nivel_alfabetizacion: 'pre-lector', escolarizado: false, zona_id: 'zona-002', fecha_ingreso: '2025-04-01', activo: true },
  { id: 'nino-005', alias: 'Bruno', rango_etario: '11-13', nivel_alfabetizacion: 'inicial',    escolarizado: true,  zona_id: 'zona-002', fecha_ingreso: '2025-04-10', activo: true },
  { id: 'nino-006', alias: 'Cami',  rango_etario: '14+',   nivel_alfabetizacion: 'avanzado',   escolarizado: true,  zona_id: 'zona-002', fecha_ingreso: '2025-02-20', activo: true },
  { id: 'nino-007', alias: 'Mateo', rango_etario: '8-10',  nivel_alfabetizacion: 'intermedio', escolarizado: false, zona_id: 'zona-003', fecha_ingreso: '2025-05-01', activo: true },
  { id: 'nino-008', alias: 'Flor',  rango_etario: '5-7',   nivel_alfabetizacion: 'pre-lector', escolarizado: true,  zona_id: 'zona-003', fecha_ingreso: '2025-05-05', activo: true },
];

export const DEMO_SESIONES: DemoSesion[] = [
  { id: 'ses-001', nino_id: 'nino-001', voluntario_id: 'usr-vol1', fecha: '2025-03-05T15:00', duracion_minutos: 45, observaciones_libres: 'Mostró mucho interés en lectura en voz alta. Se trabó en sílabas trabadas pero perseveró.', created_offline: false },
  { id: 'ses-002', nino_id: 'nino-001', voluntario_id: 'usr-vol1', fecha: '2025-03-12T15:00', duracion_minutos: 50, observaciones_libres: 'Mejoró notablemente en sílabas trabadas. Comenzó a leer oraciones cortas sin ayuda.', created_offline: false },
  { id: 'ses-003', nino_id: 'nino-001', voluntario_id: 'usr-vol1', fecha: '2025-03-19T15:00', duracion_minutos: 45, observaciones_libres: 'Lectura fluida de oraciones. Inició trabajo con párrafos simples.', created_offline: false },
  { id: 'ses-004', nino_id: 'nino-002', voluntario_id: 'usr-vol1', fecha: '2025-03-06T16:00', duracion_minutos: 40, observaciones_libres: 'Buen avance en escritura. Trabas con ortografía acentuada.', created_offline: false },
  { id: 'ses-005', nino_id: 'nino-002', voluntario_id: 'usr-vol1', fecha: '2025-03-13T16:00', duracion_minutos: 45, observaciones_libres: 'Redactó un párrafo propio sobre su mascota. Alta motivación.', created_offline: false },
  { id: 'ses-006', nino_id: 'nino-003', voluntario_id: 'usr-vol3', fecha: '2025-03-20T17:00', duracion_minutos: 60, observaciones_libres: 'Comprensión lectora avanzada. Análisis de textos expositivos.', created_offline: false },
  { id: 'ses-007', nino_id: 'nino-003', voluntario_id: 'usr-vol3', fecha: '2025-03-27T17:00', duracion_minutos: 55, observaciones_libres: 'Resolvió problemas matemáticos de tercer nivel. Muy concentrado.', created_offline: true },
  { id: 'ses-008', nino_id: 'nino-004', voluntario_id: 'usr-vol2', fecha: '2025-04-03T15:30', duracion_minutos: 30, observaciones_libres: 'Primera sesión. Reconoce vocales y algunas consonantes. Muy tímida pero curiosa.', created_offline: false },
];

export const DEMO_CAPACITACIONES: DemoCapacitacion[] = [
  { id: 'cap-001', titulo: 'Introducción a la alfabetización inicial',    descripcion: 'Bases de la enseñanza de lectoescritura.',                   tipo: 'presencial', duracion_horas: 4, obligatoria: true,  activa: true },
  { id: 'cap-002', titulo: 'Manejo de situaciones emocionales complejas', descripcion: 'Herramientas para contener reacciones emocionales.',          tipo: 'virtual',    duracion_horas: 2, obligatoria: false, activa: true },
  { id: 'cap-003', titulo: 'Matemática lúdica para nivel inicial',        descripcion: 'Juegos para trabajar numeración y operaciones básicas.',      tipo: 'presencial', duracion_horas: 3, obligatoria: false, activa: true },
  { id: 'cap-004', titulo: 'Plataforma APA: uso del sistema',             descripcion: 'Tutorial de registro de sesiones y funciones de IA.',         tipo: 'virtual',    duracion_horas: 1, obligatoria: true,  activa: true },
];

export const DEMO_CURRENT_USER = DEMO_PERFILES[0]; // Ana García - admin

/** Filtrado genérico para simular queries de Supabase */
export function filterBy<T>(arr: T[], filters: Partial<T>): T[] {
  return arr.filter((item) =>
    Object.entries(filters).every(([key, val]) => (item as Record<string, unknown>)[key] === val)
  );
}
