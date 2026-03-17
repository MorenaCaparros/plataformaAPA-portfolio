/**
 * Tests para src/components/dashboard/ui/DashboardNavCard.tsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardNavCard, {
  DashboardNavCardSkeleton,
} from '@/components/dashboard/ui/DashboardNavCard';
import { BookOpen } from 'lucide-react';

describe('DashboardNavCard', () => {
  const defaultProps = {
    href: '/dashboard/biblioteca',
    icon: BookOpen,
    title: 'Biblioteca',
    description: 'Documentos psicopedagógicos',
    colorClass: 'crecimiento' as const,
  };

  it('renderiza el título', () => {
    render(<DashboardNavCard {...defaultProps} />);
    expect(screen.getByText('Biblioteca')).toBeInTheDocument();
  });

  it('renderiza la descripción', () => {
    render(<DashboardNavCard {...defaultProps} />);
    expect(screen.getByText('Documentos psicopedagógicos')).toBeInTheDocument();
  });

  it('renderiza un link con el href correcto', () => {
    render(<DashboardNavCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/biblioteca');
  });

  it('muestra el texto "Ver →"', () => {
    render(<DashboardNavCard {...defaultProps} />);
    expect(screen.getByText('Ver →')).toBeInTheDocument();
  });

  it('renderiza el badge cuando se pasa', () => {
    render(<DashboardNavCard {...defaultProps} badge="IA" />);
    expect(screen.getByText('IA')).toBeInTheDocument();
  });

  it('no renderiza badge si no se pasa', () => {
    render(<DashboardNavCard {...defaultProps} />);
    expect(screen.queryByText('IA')).not.toBeInTheDocument();
  });

  it('funciona con todos los colores disponibles', () => {
    const colors = ['impulso', 'sol', 'crecimiento', 'teal', 'purple', 'neutral'] as const;
    for (const color of colors) {
      const { container } = render(
        <DashboardNavCard {...defaultProps} colorClass={color} />
      );
      expect(container.firstElementChild).toBeInTheDocument();
    }
  });

  it('tiene badge con variant gradient', () => {
    render(<DashboardNavCard {...defaultProps} badge="RAG" badgeVariant="gradient" />);
    expect(screen.getByText('RAG')).toBeInTheDocument();
  });
});

describe('DashboardNavCardSkeleton', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<DashboardNavCardSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('tiene clase animate-pulse', () => {
    const { container } = render(<DashboardNavCardSkeleton />);
    expect(container.firstElementChild?.className).toContain('animate-pulse');
  });

  it('tiene placeholders grises', () => {
    const { container } = render(<DashboardNavCardSkeleton />);
    const grayElements = container.querySelectorAll('.bg-gray-200');
    expect(grayElements.length).toBeGreaterThanOrEqual(2);
  });
});
