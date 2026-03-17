import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal, { type ModalConfig } from '@/components/ui/ConfirmModal';

// ────────────────────────────────────────────────────────────────────────────
// Renderizado condicional
// ────────────────────────────────────────────────────────────────────────────
describe('ConfirmModal — renderizado condicional', () => {
  it('no renderiza nada si modal es null', () => {
    const { container } = render(<ConfirmModal modal={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el modal cuando se proporciona una config', () => {
    const config: ModalConfig = {
      tipo: 'exito',
      titulo: 'Todo bien',
      mensaje: 'La operación fue exitosa',
    };
    render(<ConfirmModal modal={config} onClose={vi.fn()} />);
    expect(screen.getByText('Todo bien')).toBeInTheDocument();
    expect(screen.getByText('La operación fue exitosa')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tipo 'exito'
// ────────────────────────────────────────────────────────────────────────────
describe('ConfirmModal — tipo exito', () => {
  it('muestra un único botón "Entendido"', () => {
    const config: ModalConfig = {
      tipo: 'exito',
      titulo: 'Guardado',
      mensaje: 'Los datos fueron guardados.',
    };
    render(<ConfirmModal modal={config} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /entendido/i })).toBeInTheDocument();
    // Solo debe haber un botón
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('llama a onClose al hacer click en el botón', () => {
    const onClose = vi.fn();
    const config: ModalConfig = { tipo: 'exito', titulo: 'OK', mensaje: 'OK' };
    render(<ConfirmModal modal={config} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tipo 'error'
// ────────────────────────────────────────────────────────────────────────────
describe('ConfirmModal — tipo error', () => {
  it('muestra un botón "Entendido"', () => {
    const config: ModalConfig = {
      tipo: 'error',
      titulo: 'Error',
      mensaje: 'Algo salió mal.',
    };
    render(<ConfirmModal modal={config} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /entendido/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tipo 'faltantes'
// ────────────────────────────────────────────────────────────────────────────
describe('ConfirmModal — tipo faltantes', () => {
  it('muestra un botón "Entendido"', () => {
    const config: ModalConfig = {
      tipo: 'faltantes',
      titulo: 'Faltan datos',
      mensaje: 'Completá todos los campos antes de continuar.',
    };
    render(<ConfirmModal modal={config} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /entendido/i })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Tipo 'confirm'
// ────────────────────────────────────────────────────────────────────────────
describe('ConfirmModal — tipo confirm', () => {
  const makeConfig = (overrides?: Partial<ModalConfig>): ModalConfig => ({
    tipo: 'confirm',
    titulo: '¿Estás seguro?',
    mensaje: 'Esta acción no se puede deshacer.',
    onConfirm: vi.fn(),
    ...overrides,
  });

  it('muestra dos botones (cancelar y confirmar)', () => {
    render(<ConfirmModal modal={makeConfig()} onClose={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('muestra el texto por defecto "No, volver" y "Sí, confirmar"', () => {
    render(<ConfirmModal modal={makeConfig()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /no, volver/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sí, confirmar/i })).toBeInTheDocument();
  });

  it('usa labelCancel y labelConfirm customizados si se proveen', () => {
    const config = makeConfig({
      labelCancel: 'No, seguir',
      labelConfirm: 'Sí, borrar',
    });
    render(<ConfirmModal modal={config} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /no, seguir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sí, borrar/i })).toBeInTheDocument();
  });

  it('llama a onClose al hacer click en el botón cancelar', () => {
    const onClose = vi.fn();
    render(<ConfirmModal modal={makeConfig()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /no, volver/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onConfirm al hacer click en el botón confirmar', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmModal modal={makeConfig({ onConfirm })} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /sí, confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('también llama a onClose al hacer click en confirmar (cierra el modal)', () => {
    const onClose = vi.fn();
    const config = makeConfig({ onConfirm: vi.fn() });
    render(<ConfirmModal modal={config} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /sí, confirmar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
