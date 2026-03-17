'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatearEdad } from '@/lib/utils/date-helpers';

interface Nino {
  id: string;
  alias: string;
  rango_etario: string;
  fecha_nacimiento: string | null;
  legajo: string | null;
}

interface SelectorNinoProps {
  onSelect: (ninoId: string) => void;
  initialNinoId?: string | null;
}

export default function SelectorNino({
  onSelect,
  initialNinoId,
}: SelectorNinoProps) {
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNino, setSelectedNino] = useState<string | null>(initialNinoId ?? null);

  useEffect(() => {
    loadNinos();
  }, []);

  // Pre-select when ninos load and initialNinoId is provided
  useEffect(() => {
    if (initialNinoId && ninos.length > 0 && !selectedNino) {
      handleSelect(initialNinoId);
    }
  }, [ninos, initialNinoId]);

  const loadNinos = async () => {
    try {
      const { data, error } = await supabase
        .from('ninos')
        .select('id, alias, rango_etario, fecha_nacimiento, legajo')
        .order('alias', { ascending: true });

      if (error) throw error;

      setNinos(data || []);
    } catch (error) {
      console.error('Error al cargar niños:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNinos = ninos.filter((nino) => {
    const search = searchTerm.toLowerCase();
    return (
      nino.alias.toLowerCase().includes(search) ||
      (nino.legajo || '').toLowerCase().includes(search)
    );
  });

  const handleSelect = (ninoId: string) => {
    setSelectedNino(ninoId);
    onSelect(ninoId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Seleccionar Niño
      </h3>

      {/* Buscador */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por nombre o número de legajo..."
        className="w-full border border-gray-300 rounded-md p-3 mb-4 text-sm"
      />

      {/* Lista de niños */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredNinos.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No se encontraron niños
          </p>
        ) : (
          filteredNinos.map((nino) => (
            <button
              key={nino.id}
              type="button"
              onClick={() => handleSelect(nino.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedNino === nino.id
                  ? 'border-crecimiento-400 bg-crecimiento-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {nino.alias}
                  </p>
                  <p className="text-xs text-gray-500">
                    {nino.legajo ? `Legajo: ${nino.legajo} • ` : ''}{formatearEdad(nino.fecha_nacimiento, nino.rango_etario)}
                  </p>
                </div>
                {selectedNino === nino.id && (
                  <svg
                    className="w-6 h-6 text-crecimiento-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedNino && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Niño seleccionado. Podés continuar con el formulario.
          </p>
        </div>
      )}
    </div>
  );
}
