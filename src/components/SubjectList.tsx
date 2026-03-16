import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Materia } from '../types';

export function SubjectList() {
  const [materias, setMaterias] = useState<Materia[]>([]);

  useEffect(() => {
    loadMaterias();
  }, []);

  async function loadMaterias() {
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error loading materias:', error);
      return;
    }

    setMaterias(data || []);
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10 font-sans text-neutral-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Options */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <Link to="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Volver al Dashboard
          </Link>
          <Link
            to="/materias/nueva"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Nueva Materia
          </Link>
        </div>

        {/* Lista de Materias */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-neutral-100">
            <h2 className="text-2xl font-semibold tracking-tight">Directorio de Materias</h2>
            <p className="text-sm text-neutral-500 mt-1">Materias disponibles para asignar en los horarios.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/50">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-500 tracking-wide uppercase text-xs">ID</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 tracking-wide uppercase text-xs">Materia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {materias.map((materia) => (
                  <tr key={materia.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-400 font-mono">{materia.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-neutral-900">{materia.nombre}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}