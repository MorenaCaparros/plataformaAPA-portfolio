import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen, { Spinner } from '@/components/ui/LoadingScreen';

// ────────────────────────────────────────────────────────────────────────────
// LoadingScreen
// ────────────────────────────────────────────────────────────────────────────
describe('LoadingScreen', () => {
  it('muestra el texto "Cargando..." por defecto', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('muestra el texto personalizado cuando se provee "text"', () => {
    render(<LoadingScreen text="Verificando datos..." />);
    expect(screen.getByText('Verificando datos...')).toBeInTheDocument();
  });

  it('ocupa pantalla completa por defecto (min-h-screen)', () => {
    const { container } = render(<LoadingScreen />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('min-h-screen');
  });

  it('usa padding relativo cuando fullScreen=false', () => {
    const { container } = render(<LoadingScreen fullScreen={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('py-12');
  });

  it('el spinner tiene clase animate-spin', () => {
    const { container } = render(<LoadingScreen />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renderiza correctamente con size="sm"', () => {
    render(<LoadingScreen size="sm" />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renderiza correctamente con size="lg"', () => {
    render(<LoadingScreen size="lg" />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Spinner
// ────────────────────────────────────────────────────────────────────────────
describe('Spinner', () => {
  it('renderiza un div con clase animate-spin', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('tamaño xs aplica clases correctas', () => {
    const { container } = render(<Spinner size="xs" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-3');
    expect(spinner?.className).toContain('w-3');
  });

  it('tamaño sm aplica clases correctas', () => {
    const { container } = render(<Spinner size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-4');
    expect(spinner?.className).toContain('w-4');
  });

  it('tamaño md aplica clases correctas', () => {
    const { container } = render(<Spinner size="md" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-6');
    expect(spinner?.className).toContain('w-6');
  });

  it('color white aplica border-t-white', () => {
    const { container } = render(<Spinner color="white" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('border-t-white');
  });

  it('color crecimiento aplica border-t-crecimiento-500', () => {
    const { container } = render(<Spinner color="crecimiento" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('border-t-crecimiento-500');
  });

  it('color impulso aplica border-t-impulso-500', () => {
    const { container } = render(<Spinner color="impulso" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('border-t-impulso-500');
  });
});
