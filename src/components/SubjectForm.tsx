import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { CURSOS_DIVISIONES } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function SubjectForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    curso: CURSOS_DIVISIONES[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const [curso, division] = formData.curso.split(' ');
    
    const { error } = await supabase
      .from('subjects')
      .insert({
        nombre: formData.nombre,
        curso,
        division,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('Error saving subject:', error);
      return;
    }

    navigate('/materias');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Agregar Nueva Materia</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de la Materia</label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Curso y División</label>
              <select
                value={formData.curso}
                onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {CURSOS_DIVISIONES.map((curso) => (
                  <option key={curso} value={curso}>{curso}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/materias')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Save size={20} />
              Guardar Materia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}