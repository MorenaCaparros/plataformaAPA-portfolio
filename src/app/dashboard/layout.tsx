import Sidebar from '@/components/layouts/Sidebar';
import AnimatedBackground from '@/components/layouts/AnimatedBackground';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      {/* Background animado */}
      <AnimatedBackground />

      {/* Layout con Sidebar */}
      <div className="flex">
        <Sidebar />

        {/* Main Content */}
        {/* pt-20 en mobile deja espacio para el botón hamburguesa (fixed top-4 left-4, ~56px de alto) */}
        <main className="flex-1 px-4 pb-4 pt-20 lg:p-6">
          {/* Botón mini de tema — top right corner */}
          <div className="fixed top-4 right-4 z-[55]">
            <ThemeToggle mini />
          </div>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
