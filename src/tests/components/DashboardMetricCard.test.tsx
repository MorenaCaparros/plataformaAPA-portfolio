/**
 * Tests para src/components/dashboard/ui/DashboardMetricCard.tsx
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardMetricCard, {
  DashboardMetricCardSkeleton,
} from '@/components/dashboard/ui/DashboardMetricCard';
import { Users } from 'lucide-react';

describe('DashboardMetricCard', () => {
  const defaultProps = {
    icon: Users,
    value: 42,
    label: 'Niños registrados',
    colorClass: 'crecimiento' as const,
  };

  it('renderiza el valor numérico', () => {
    render(<DashboardMetricCard {...defaultProps} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renderiza el label', () => {
    render(<DashboardMetricCard {...defaultProps} />);
    expect(screen.getByText('Niños registrados')).toBeInTheDocument();
  });

  it('renderiza el valor como string', () => {
    render(<DashboardMetricCard {...defaultProps} value="87%" />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('renderiza el sublabel cuando se pasa', () => {
    render(<DashboardMetricCard {...defaultProps} sublabel="Últimos 30 días" />);
    expect(screen.getByText('Últimos 30 días')).toBeInTheDocument();
  });

  it('no renderiza sublabel si no se pasa', () => {
    render(<DashboardMetricCard {...defaultProps} />);
    expect(screen.queryByText('Últimos 30 días')).not.toBeInTheDocument();
  });

  it('aplica gradiente de color según colorClass', () => {
    const { container } = render(<DashboardMetricCard {...defaultProps} colorClass="impulso" />);
    const card = container.firstElementChild;
    expect(card?.className).toContain('impulso');
  });

  it('tiene un punto de pulso (pulse dot)', () => {
    const { container } = render(<DashboardMetricCard {...defaultProps} />);
    const pulseDot = container.querySelector('.animate-pulse');
    expect(pulseDot).toBeInTheDocument();
  });

  it('funciona con todos los colores disponibles', () => {
    const colors = ['impulso', 'sol', 'crecimiento', 'teal', 'purple'] as const;
    for (const color of colors) {
      const { container } = render(
        <DashboardMetricCard {...defaultProps} colorClass={color} />
      );
      expect(container.firstElementChild?.className).toContain(color);
    }
  });
});

describe('DashboardMetricCardSkeleton', () => {
  it('renderiza sin errores', () => {
    const { container } = render(<DashboardMetricCardSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('tiene clase animate-pulse', () => {
    const { container } = render(<DashboardMetricCardSkeleton />);
    expect(container.firstElementChild?.className).toContain('animate-pulse');
  });

  it('tiene placeholders grises (bg-gray-200)', () => {
    const { container } = render(<DashboardMetricCardSkeleton />);
    const grayElements = container.querySelectorAll('.bg-gray-200');
    // Debería tener al menos 2-3 placeholders (icon, value, label)
    expect(grayElements.length).toBeGreaterThanOrEqual(2);
  });
});
