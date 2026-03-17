'use client';

import { X, Save, Plus, Phone, Pencil } from 'lucide-react';
import type { FamiliarApoyo } from '@/types/database';
import { inputClassGlassSm, labelClass } from '@/lib/constants/styles';
import { Spinner } from '@/components/ui/LoadingScreen';

// ─── Colores por tipo ─────────────────────────────────────────────────────────

export const tipoFamiliarColors: Record<string, string> = {
  madre: 'bg-sol-50 border-sol-200/60',
  padre: 'bg-crecimiento-50 border-crecimiento-200/60',
  tutor: 'bg-sol-50 border-sol-300/60',
  referente_escolar: 'bg-crecimiento-50 border-crecimiento-300/60',
  otro: 'bg-sol-50/60 border-sol-200/40',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface FamiliarCardProps {
  label: string;
  tipo: string;
  familiar: FamiliarApoyo | undefined;
  icon: string;
  editandoId: string | null;
  editForm: Partial<FamiliarApoyo>;
  onEditar: (f: FamiliarApoyo) => void;
  onAgregar: (tipo: string) => void;
  onCancelar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  onChangeForm: (form: Partial<FamiliarApoyo>) => void;
}

/**
 * Tarjeta de familiar / apoyo de un niño.
 * Maneja tres estados: vista (datos existentes), edición/creación, y vacío.
 */
export default function FamiliarCard({
  label,
  tipo,
  familiar,
  icon,
  editandoId,
  editForm,
  onEditar,
  onAgregar,
  onCancelar,
  onGuardar,
  guardando,
  onChangeForm,
}: FamiliarCardProps) {
  const esteEditando = familiar ? editandoId === familiar.id : false;
  const esteCreando = !familiar && editandoId === `__nuevo__${tipo}`;
  const colorClass = tipoFamiliarColors[tipo] || tipoFamiliarColors.otro;

  // ── Formulario (crear o editar) ──────────────────────────────────────────
  if (esteCreando || esteEditando) {
    return (
      <div className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-all ${colorClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-neutro-carbon font-outfit">{label}</p>
              {esteCreando && (
                <p className="text-xs text-neutro-piedra font-outfit">Nuevo registro</p>
              )}
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 text-neutro-piedra hover:text-impulso-500 transition-colors rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nombre + Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={editForm.nombre || ''}
              onChange={(e) => onChangeForm({ ...editForm, nombre: e.target.value })}
              placeholder={`Nombre del/la ${label.toLowerCase()}`}
              autoFocus={esteCreando}
              className={inputClassGlassSm}
            />
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono
              </span>
            </label>
            <input
              type="tel"
              value={editForm.telefono || ''}
              onChange={(e) => onChangeForm({ ...editForm, telefono: e.target.value })}
              placeholder="Ej: 11-2345-6789"
              className={inputClassGlassSm}
            />
          </div>
        </div>

        {/* Email + Relación (solo para "otro") */}
        <div className={`grid grid-cols-1 gap-3 ${tipo === 'otro' ? 'sm:grid-cols-2' : ''}`}>
          <div>
            <label className={labelClass}>Email (opcional)</label>
            <input
              type="email"
              value={editForm.email || ''}
              onChange={(e) => onChangeForm({ ...editForm, email: e.target.value })}
              placeholder="email@ejemplo.com"
              className={inputClassGlassSm}
            />
          </div>
          {tipo === 'otro' && (
            <div>
              <label className={labelClass}>¿Qué es para el niño?</label>
              <input
                type="text"
                value={editForm.relacion || ''}
                onChange={(e) => onChangeForm({ ...editForm, relacion: e.target.value })}
                placeholder="Ej: Tío, vecino, padrino..."
                className={inputClassGlassSm}
              />
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className={labelClass}>Notas (opcional)</label>
          <input
            type="text"
            value={editForm.notas || ''}
            onChange={(e) => onChangeForm({ ...editForm, notas: e.target.value })}
            placeholder="Observaciones adicionales"
            className={inputClassGlassSm}
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
            <input
              type="checkbox"
              checked={editForm.vive_con_nino ?? false}
              onChange={(e) => onChangeForm({ ...editForm, vive_con_nino: e.target.checked })}
              className="w-4 h-4 rounded text-crecimiento-500 focus:ring-crecimiento-400"
            />
            Vive con el niño
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-outfit text-neutro-carbon min-h-[44px]">
            <input
              type="checkbox"
              checked={editForm.es_contacto_principal ?? false}
              onChange={(e) => onChangeForm({ ...editForm, es_contacto_principal: e.target.checked })}
              className="w-4 h-4 rounded text-sol-500 focus:ring-sol-400"
            />
            Contacto principal
          </label>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/60">
          <button
            onClick={onGuardar}
            disabled={guardando || (!editForm.nombre?.trim() && esteCreando)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 hover:shadow-lg disabled:opacity-50 text-white rounded-2xl text-sm font-semibold font-outfit transition-all min-h-[44px]"
          >
            {guardando ? <Spinner size="xs" color="white" /> : <Save className="w-3.5 h-3.5" />}
            {esteCreando ? 'Agregar' : 'Guardar cambios'}
          </button>
          <button
            onClick={onCancelar}
            className="px-4 py-2.5 rounded-2xl bg-white/80 border border-white/60 text-neutro-carbon font-outfit text-sm hover:shadow-md transition-all min-h-[44px]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Sin datos ──────────────────────────────────────────────────────────────
  if (!familiar) {
    return (
      <div
        className={`rounded-2xl border border-dashed p-4 flex items-center justify-between gap-3 group ${colorClass}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-neutro-carbon/50 font-outfit">{label}</p>
            <p className="text-xs text-neutro-piedra/60 italic font-outfit">Sin datos registrados</p>
          </div>
        </div>
        <button
          onClick={() => onAgregar(tipo)}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/80 border border-white/60 text-sm font-outfit text-neutro-carbon hover:shadow-md transition-all min-h-[44px] opacity-0 group-hover:opacity-100 focus:opacity-100"
          title={`Agregar ${label.toLowerCase()}`}
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
    );
  }

  // ── Vista: datos existentes ────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 group transition-all ${colorClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl mt-0.5">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutro-carbon font-outfit">
              {familiar.nombre}
              {familiar.es_contacto_principal && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-sol-100 text-sol-700 rounded-full text-xs font-medium">
                  ⭐ Principal
                </span>
              )}
            </p>
            <p className="text-xs text-neutro-piedra font-outfit">
              {label}
              {tipo === 'otro' && familiar.relacion ? ` — ${familiar.relacion}` : ''}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-neutro-piedra font-outfit">
              {familiar.telefono && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {familiar.telefono}
                </span>
              )}
              {familiar.email && (
                <span className="inline-flex items-center gap-1">📧 {familiar.email}</span>
              )}
              {familiar.vive_con_nino && (
                <span className="inline-flex items-center gap-1 text-crecimiento-600 font-medium">
                  🏠 Vive con el niño
                </span>
              )}
            </div>
            {familiar.notas && (
              <p className="text-xs text-neutro-piedra/70 mt-1.5 italic font-outfit">{familiar.notas}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onEditar(familiar)}
          className="flex-shrink-0 p-2 text-neutro-piedra hover:text-sol-600 hover:bg-white/80 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title={`Editar ${label.toLowerCase()}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
