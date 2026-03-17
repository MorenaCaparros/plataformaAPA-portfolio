/**
 * Tests para src/components/dashboard/ui/DashboardHeader.tsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardHeader from '@/components/dashboard/ui/DashboardHeader';

describe('DashboardHeader', () => {
  it('renderiza el título', () => {
    render(<DashboardHeader title="Mi Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mi Dashboard');
  });

  it('renderiza el subtítulo cuando se pasa', () => {
    render(<DashboardHeader title="Título" subtitle="Bienvenido al sistema" />);
    expect(screen.getByText('Bienvenido al sistema')).toBeInTheDocument();
  });

  it('no renderiza subtítulo si no se pasa', () => {
    render(<DashboardHeader title="Solo título" />);
    expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument();
  });

  it('renderiza el slot de acción cuando se pasa', () => {
    render(
      <DashboardHeader
        title="Título"
        action={<button>Crear nuevo</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Crear nuevo' })).toBeInTheDocument();
  });

  it('no renderiza el slot de acción si no se pasa', () => {
    const { container } = render(<DashboardHeader title="Solo título" />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('el heading es un h1', () => {
    render(<DashboardHeader title="Test" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.tagName).toBe('H1');
  });
});
