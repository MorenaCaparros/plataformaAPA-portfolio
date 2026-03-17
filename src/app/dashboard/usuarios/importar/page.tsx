'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ImportarUsuariosPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  // Solo director puede acceder
  if (perfil && perfil.rol !== 'director') {
    router.push('/dashboard');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setResultado(null);
    }
  };

  const parsearCSV = (texto: string) => {
    const lineas = texto.split('\n').filter(l => l.trim());
    const headers = lineas[0].split(',').map(h => h.trim());
    return lineas.slice(1).map(linea => {
      const valores = linea.split(',').map(v => v.trim());
      const usuario: any = {};
      headers.forEach((header, i) => { usuario[header] = valores[i] || ''; });
      return usuario;
    });
  };

  const handleImportar = async () => {
    if (!archivo) return;
    setProcesando(true);
    setResultado(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setResultado({ error: 'No hay sesión activa' }); return; }
      const texto = await archivo.text();
      const usuarios = parsearCSV(texto);
      const response = await fetch('/api/usuarios/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ usuarios }),
      });
      setResultado(await response.json());
    } catch (error: any) {
      setResultado({ error: error.message || 'Error al procesar el archivo' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navbar flotante */}
      <nav className="sticky top-0 z-30 mb-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-3xl shadow-[0_4px_16px_rgba(242,201,76,0.1)] px-6 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard/usuarios" className="flex items-center gap-2 text-neutro-piedra hover:text-neutro-carbon transition-colors font-outfit font-medium min-h-[44px]">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Usuarios</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-neutro-carbon font-quicksand">Importar desde CSV</h1>
              <div className="w-20 sm:w-24" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-5">

        {/* Instrucciones */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-sol-200/40 p-6 shadow-[0_4px_16px_rgba(242,201,76,0.1)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-sol-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-sol-700" />
            </div>
            <h2 className="text-lg font-bold text-neutro-carbon font-quicksand">Formato del CSV</h2>
          </div>
          <p className="text-sm text-neutro-piedra font-outfit mb-3">
            El archivo debe tener las siguientes columnas separadas por coma:
          </p>
          <div className="bg-neutro-lienzo rounded-2xl p-4 overflow-x-auto mb-4">
            <code className="text-xs text-neutro-carbon font-mono whitespace-pre">{`email,nombre,apellido,rol,equipo,telefono,password
voluntario1@apa.org,Juan,Pérez,voluntario,Las Dalias,123456789,MiPassword123
profesional1@apa.org,María,González,equipo_profesional,La Herradura,987654321,Segura456`}</code>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm font-outfit">
            <div className="bg-crecimiento-50 rounded-2xl p-3">
              <p className="font-semibold text-crecimiento-800 mb-1">Roles válidos</p>
              <p className="text-crecimiento-700 text-xs">voluntario, equipo_profesional, director</p>
              <p className="text-crecimiento-600 text-xs italic mt-1">Los roles anteriores (coordinador, psicopedagogia, admin) se convierten automáticamente.</p>
            </div>
            <div className="bg-impulso-50 rounded-2xl p-3">
              <p className="font-semibold text-impulso-800 mb-1">Equipos válidos</p>
              <p className="text-impulso-700 text-xs">Las Dalias, La Herradura, Parque Palermo, Villa de Paso</p>
              <p className="text-impulso-600 text-xs italic mt-1">Password mínimo 8 caracteres. Si está vacío, se genera automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-bold text-neutro-carbon font-quicksand mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-crecimiento-600" />
            Seleccionar archivo
          </h2>
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${archivo ? 'border-crecimiento-400 bg-crecimiento-50/40' : 'border-neutro-piedra/30 hover:border-sol-400 hover:bg-sol-50/30'}`}>
              {archivo ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-crecimiento-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-neutro-carbon font-outfit">{archivo.name}</p>
                    <p className="text-sm text-neutro-piedra font-outfit">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={e => { e.preventDefault(); setArchivo(null); setResultado(null); }} className="ml-2 text-neutro-piedra hover:text-impulso-600 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-neutro-piedra/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-neutro-carbon font-outfit">Hacé click para seleccionar un archivo CSV</p>
                  <p className="text-xs text-neutro-piedra font-outfit mt-1">Solo archivos .csv</p>
                </>
              )}
            </div>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={handleImportar}
            disabled={!archivo || procesando}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-crecimiento-400 to-crecimiento-500 text-white rounded-2xl font-outfit font-semibold text-sm hover:shadow-[0_8px_24px_rgba(164,198,57,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
          >
            {procesando ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Procesando...</>
            ) : (
              <><Upload className="w-4 h-4" /> Importar Usuarios</>
            )}
          </button>
        </div>

        {/* Resultados */}
        {resultado && (
          <div className="space-y-4">
            {resultado.error ? (
              <div className="bg-impulso-50 rounded-3xl border border-impulso-200/40 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-impulso-600 flex-shrink-0" />
                  <h3 className="text-base font-bold text-impulso-800 font-quicksand">Error en la importación</h3>
                </div>
                <p className="text-sm text-impulso-700 font-outfit">{resultado.error}</p>
              </div>
            ) : (
              <>
                <div className="bg-crecimiento-50 rounded-3xl border border-crecimiento-200/40 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-crecimiento-600 flex-shrink-0" />
                    <h3 className="text-base font-bold text-crecimiento-800 font-quicksand">Importación completada</h3>
                  </div>
                  <div className="flex gap-6 text-sm font-outfit">
                    <span className="text-crecimiento-700 font-semibold">✓ Exitosos: {resultado.exitosos}</span>
                    {resultado.errores > 0 && <span className="text-sol-700 font-semibold">⚠ Errores: {resultado.errores}</span>}
                  </div>
                </div>
                {resultado.detalle?.exitosos?.length > 0 && (
                  <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 p-6 shadow-sm">
                    <h4 className="font-bold text-neutro-carbon font-quicksand mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-crecimiento-600" /> Usuarios creados ({resultado.detalle.exitosos.length})
                    </h4>
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                      {resultado.detalle.exitosos.map((email: string) => (
                        <li key={email} className="text-sm text-neutro-carbon font-outfit flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-crecimiento-400 flex-shrink-0" />{email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {resultado.detalle?.errores?.length > 0 && (
                  <div className="bg-sol-50 rounded-3xl border border-sol-200/40 p-6">
                    <h4 className="font-bold text-sol-800 font-quicksand mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-sol-600" /> Errores ({resultado.detalle.errores.length})
                    </h4>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {resultado.detalle.errores.map((err: any, i: number) => (
                        <li key={i} className="text-sm font-outfit">
                          <span className="font-semibold text-sol-800">{err.email}:</span>{' '}
                          <span className="text-sol-700">{err.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
