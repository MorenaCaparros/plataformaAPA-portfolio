export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Fondo base */}
      <div className="absolute inset-0 bg-neutro-lienzo" />
      
      {/* Textura de ruido sutil para efecto táctil */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay' as const
        }}
        aria-hidden="true"
      />

      {/* Blob 1 - Amarillo (arriba derecha) */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 bg-sol-400/20 rounded-full blur-3xl animate-blob"
        aria-hidden="true"
      />

      {/* Blob 2 - Verde (abajo izquierda) */}
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-crecimiento-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"
        aria-hidden="true"
      />

      {/* Blob 3 - Rojo suave (centro derecha) */}
      <div
        className="absolute top-1/2 -right-20 w-72 h-72 bg-impulso-400/10 rounded-full blur-3xl animate-blob animation-delay-4000"
        aria-hidden="true"
      />

      {/* Noise texture (opcional - descomentar si tenés la imagen) */}
      {/* <div
        className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"
        aria-hidden="true"
      /> */}
    </div>
  );
}
