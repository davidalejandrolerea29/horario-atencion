import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function PrefectForm() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('preceptores')
      .insert({ nombre: nombre.trim() });

    if (error) {
      console.error('Error saving preceptor:', error);
      return;
    }

    navigate('/preceptores');
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10 font-sans text-neutral-800">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* Header Options */}
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Volver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-8">Nuevo Preceptor</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre Completo</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Pérez, María"
                className="block w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-shadow"
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end mt-10">
            <button
              type="button"
              onClick={() => navigate('/preceptores')}
              className="px-6 py-2.5 text-neutral-700 bg-neutral-100 rounded-full font-medium hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-900/20 transition-all shadow-sm"
            >
              <Save size={18} />
              Guardar Preceptor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}