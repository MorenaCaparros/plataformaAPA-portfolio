import React from 'react';
import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutro-lienzo flex flex-col">
      {/* Simple header para páginas públicas */}
      <header className="bg-white/40 backdrop-blur-lg border-b border-neutro-piedra/10 py-4 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sol-400 to-crecimiento-400 flex items-center justify-center">
              <span className="text-white font-quicksand font-bold text-lg">A</span>
            </div>
            <span className="hidden sm:block font-quicksand font-bold text-neutro-carbon">Plataforma APA</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-neutro-carbon hover:text-crecimiento-600 transition-colors"
            >
              Iniciar sesión
            </Link>
            <a
              href="https://globalia.org.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              GlobalIA
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-neutro-carbon/5 border-t border-neutro-piedra/10 py-12 px-4 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Sobre */}
            <div>
              <h3 className="font-quicksand font-bold text-neutro-carbon mb-4">Plataforma APA</h3>
              <p className="text-sm text-neutro-piedra leading-relaxed">
                Sistema de gestión educativa y seguimiento para voluntarios y equipos profesionales dedicados a la alfabetización en contextos vulnerables.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-bold text-neutro-carbon mb-4">Información Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacidad" className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors">
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors">
                    Términos de Servicio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="font-bold text-neutro-carbon mb-4">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:privacidad@adelante-ong.org"
                    className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors"
                  >
                    privacidad@adelante-ong.org
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:legal@adelante-ong.org"
                    className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors"
                  >
                    legal@adelante-ong.org
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutro-piedra/10 pt-8 text-center">
            <p className="text-sm text-neutro-piedra">
              © 2025 Plataforma APA • Desarrollado por GlobalIA × ONG Adelante
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
