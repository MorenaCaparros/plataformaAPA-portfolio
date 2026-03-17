'use client';

import { AlertTriangle, Check, X } from 'lucide-react';

export type ModalTipo = 'exito' | 'error' | 'faltantes' | 'confirm';

export interface ModalConfig {
  tipo: ModalTipo;
  titulo: string;
  mensaje: string;
  /** Solo para tipo='confirm': callback al confirmar */
  onConfirm?: () => void;
  /** Texto del botón principal en modo confirm (default: 'Sí, confirmar') */
  labelConfirm?: string;
  /** Texto del botón cancelar en modo confirm (default: 'No, volver') */
  labelCancel?: string;
}

interface ConfirmModalProps {
  modal: ModalConfig | null;
  onClose: () => void;
}

const iconConfig: Record<ModalTipo, { bg: string; icon: React.ReactNode }> = {
  exito: {
    bg: 'bg-crecimiento-100',
    icon: <Check className="w-6 h-6 text-crecimiento-600" />,
  },
  error: {
    bg: 'bg-impulso-100',
    icon: <X className="w-6 h-6 text-impulso-600" />,
  },
  faltantes: {
    bg: 'bg-sol-100',
    icon: <AlertTriangle className="w-6 h-6 text-sol-600" />,
  },
  confirm: {
    bg: 'bg-gray-100',
    icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
  },
};

/**
 * Modal universal de confirmación/alerta.
 *
 * Uso:
 * ```tsx
 * const [modal, setModal] = useState<ModalConfig | null>(null);
 * <ConfirmModal modal={modal} onClose={() => setModal(null)} />
 * ```
 */
export default function ConfirmModal({ modal, onClose }: ConfirmModalProps) {
  if (!modal) return null;

  const { bg, icon } = iconConfig[modal.tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4">
        {/* Icono */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${bg}`}>
          {icon}
        </div>

        {/* Texto */}
        <div className="text-center">
          <h3 className="font-bold text-neutro-carbon font-quicksand text-lg">{modal.titulo}</h3>
          <p className="text-neutro-piedra font-outfit text-sm mt-1">{modal.mensaje}</p>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          {modal.tipo === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-outfit font-medium text-neutro-carbon hover:bg-gray-50 transition-all"
              >
                {modal.labelCancel ?? 'No, volver'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  modal.onConfirm?.();
                }}
                className="flex-1 px-4 py-2.5 bg-impulso-500 text-white rounded-xl font-outfit font-semibold hover:bg-impulso-600 transition-all"
              >
                {modal.labelConfirm ?? 'Sí, confirmar'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-crecimiento-500 text-white rounded-xl font-outfit font-semibold hover:bg-crecimiento-600 transition-all"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
