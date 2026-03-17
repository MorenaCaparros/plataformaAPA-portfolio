/**
 * Clases de Tailwind reutilizables en todo el dashboard.
 * Importar con: import { inputClass, inputClassGlass } from '@/lib/constants/styles';
 */

// ─── Inputs ────────────────────────────────────────────────────────────────

/**
 * Input estándar con fondo blanco y borde gris. Usado en formularios de sesión.
 * `w-full` NO incluido — cada uso puede necesitar un ancho diferente.
 */
export const inputClass =
  'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-outfit focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 transition-all placeholder:text-neutro-piedra/60';

/** Input más grande (py-3 text-base), para formularios principales. */
export const inputClassLg =
  'w-full px-3 py-3 text-base border border-gray-200 rounded-xl font-outfit focus:ring-2 focus:ring-crecimiento-300 focus:border-crecimiento-400 transition-all placeholder:text-neutro-piedra/60';

/**
 * Input glass: fondo blanco/80 translúcido, borde blanco. Usado en modales y
 * tarjetas glassmorphism (creación de niños, familiares, usuarios).
 */
export const inputClassGlass =
  'w-full px-4 py-3 bg-white/80 border border-white/60 rounded-2xl focus:ring-2 focus:ring-crecimiento-400 focus:border-transparent text-neutro-carbon font-outfit min-h-[48px] transition-all placeholder:text-neutro-piedra/60';

/** Input glass pequeño (py-2.5), para campos en tarjetas compactas. */
export const inputClassGlassSm =
  'w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl focus:ring-2 focus:ring-sol-400 focus:border-transparent text-neutro-carbon font-outfit shadow-[0_2px_8px_rgba(242,201,76,0.08)] min-h-[44px] placeholder:text-neutro-piedra/60 transition-all text-sm';

// ─── Labels ─────────────────────────────────────────────────────────────────

export const labelClass = 'block text-xs font-medium text-neutro-piedra font-outfit mb-1';
export const labelClassMd = 'block text-sm font-medium text-neutro-carbon font-outfit mb-2';

// ─── Tarjetas glass ──────────────────────────────────────────────────────────

/** Tarjeta glass estándar del dashboard. */
export const cardClass =
  'bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_4px_16px_rgba(242,201,76,0.08)]';

/** Tarjeta glass grande con sombra más pronunciada (para secciones principales). */
export const cardClassLg =
  'bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(242,201,76,0.12)]';

// ─── Botones ──────────────────────────────────────────────────────────────────

/** Botón primario (gradiente crecimiento). */
export const btnPrimary =
  'flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-gradient-to-r from-crecimiento-500 to-crecimiento-400 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

/** Botón secundario (borde, sin fondo). */
export const btnSecondary =
  'flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white/80 border border-white/60 text-neutro-carbon rounded-2xl font-outfit font-medium text-sm hover:shadow-md active:scale-95 transition-all';

/** Botón destructivo (rojo). */
export const btnDanger =
  'flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-impulso-500 text-white rounded-2xl font-outfit font-semibold text-sm hover:bg-impulso-600 active:scale-95 transition-all disabled:opacity-50';
