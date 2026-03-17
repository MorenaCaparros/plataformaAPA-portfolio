import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background animado */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-neutro-lienzo" />
        
        {/* Blob 1 - Amarillo */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sol-400/30 rounded-full blur-3xl animate-blob" />
        
        {/* Blob 2 - Verde */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-crecimiento-400/25 rounded-full blur-3xl animate-blob animation-delay-2000" />
        
        {/* Blob 3 - Centro */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sol-400/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="text-center space-y-8 relative z-10">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-sol-400 to-crecimiento-400 shadow-glow-sol mb-6">
          <span className="text-white font-quicksand font-bold text-5xl">A</span>
        </div>

        {/* Títulos */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-quicksand font-bold text-neutro-carbon">
            Plataforma APA
          </h1>
          <p className="text-base sm:text-lg text-crecimiento-600 font-semibold tracking-wide">
            Acompañar Para Aprender
          </p>
          <p className="text-lg sm:text-xl text-neutro-piedra font-medium">
            Sistema de seguimiento educativo
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-neutro-piedra">
          <span className="font-semibold">GlobalIA</span>
          <span>×</span>
          <span className="font-semibold">Asociación Civil Adelante</span>
        </div>

        {/* Botones */}
        <div className="pt-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-md mx-auto">
            <Link
              href="/login"
              className="px-8 py-3 min-h-[48px] bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white font-medium rounded-2xl shadow-glow-crecimiento hover:shadow-glow-crecimiento-lg hover:translate-y-[-1px] transition-all duration-200 active:scale-95 flex items-center justify-center"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="px-8 py-3 min-h-[48px] bg-white/60 backdrop-blur-lg border border-crecimiento-400/30 text-crecimiento-700 font-medium rounded-2xl hover:bg-crecimiento-50/80 transition-all duration-200 flex items-center justify-center"
            >
              Registrarse
            </Link>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-400/20 text-sol-700 text-xs font-medium border border-sol-400/30">
            <span className="w-2 h-2 bg-crecimiento-400 rounded-full animate-pulse" />
            Sistema en desarrollo
          </div>
        </div>
      </div>
    </main>
  );
}
