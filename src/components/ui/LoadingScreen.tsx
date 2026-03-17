interface LoadingScreenProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Si true, ocupa toda la pantalla. Por defecto true. */
  fullScreen?: boolean;
}

/**
 * Pantalla de carga centrada con spinner y tarjeta de vidrio.
 * Usada en todas las páginas del dashboard mientras se cargan datos.
 */
export default function LoadingScreen({
  text = 'Cargando...',
  size = 'md',
  fullScreen = true,
}: LoadingScreenProps) {
  const spinnerSizes = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  const Wrapper = fullScreen
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen flex items-center justify-center">{children}</div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex items-center justify-center py-12">{children}</div>
      );

  return (
    <Wrapper>
      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(242,201,76,0.15)] text-center">
        <div
          className={`animate-spin rounded-full ${spinnerSizes[size]} border-sol-200 border-t-crecimiento-400 mx-auto mb-4`}
        />
        <p className="text-neutro-piedra font-outfit">{text}</p>
      </div>
    </Wrapper>
  );
}

/**
 * Spinner inline pequeño para botones y contenidos secundarios.
 * Ej: <Spinner color="white" /> dentro de un botón.
 */
export function Spinner({
  size = 'sm',
  color = 'crecimiento',
}: {
  size?: 'xs' | 'sm' | 'md';
  color?: 'white' | 'crecimiento' | 'sol' | 'impulso';
}) {
  const sizes = { xs: 'h-3 w-3 border-2', sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2' };
  const colors = {
    white: 'border-white/40 border-t-white',
    crecimiento: 'border-crecimiento-200 border-t-crecimiento-500',
    sol: 'border-sol-200 border-t-sol-500',
    impulso: 'border-impulso-200 border-t-impulso-500',
  };
  return (
    <div
      className={`animate-spin rounded-full flex-shrink-0 ${sizes[size]} ${colors[color]}`}
    />
  );
}
