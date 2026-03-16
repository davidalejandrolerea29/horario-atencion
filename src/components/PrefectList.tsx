import React, { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Preceptor, Curso } from '../types';

export function PrefectList() {
  const [preceptores, setPreceptores] = useState<Preceptor[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [editingCurso, setEditingCurso] = useState<number | null>(null);
  const [selectedPreceptorId, setSelectedPreceptorId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [preceptoresResponse, cursosResponse] = await Promise.all([
      supabase.from('preceptores').select('*').order('nombre', { ascending: true }),
      supabase.from('cursos').select('*').order('nombre', { ascending: true })
    ]);

    if (preceptoresResponse.error) console.error('Error loading preceptores:', preceptoresResponse.error);
    else setPreceptores(preceptoresResponse.data || []);

    if (cursosResponse.error) console.error('Error loading cursos:', cursosResponse.error);
    else setCursos(cursosResponse.data || []);
  }

  async function handleAssignPreceptor(cursoId: number) {
    const { error } = await supabase
      .from('cursos')
      .update({ preceptor_id: selectedPreceptorId })
      .eq('id', cursoId);

    if (error) {
      console.error('Error assigning preceptor:', error);
      alert('Error guardando la asignación.');
    } else {
      setEditingCurso(null);
      loadData();
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10 font-sans text-neutral-800">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Options */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <Link to="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Volver al Dashboard
          </Link>
          <Link
            to="/preceptores/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Nuevo Preceptor
          </Link>
        </div>

        {/* Cursos y Asignaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-neutral-100">
            <h2 className="text-2xl font-semibold tracking-tight">Asignación de Cursos</h2>
            <p className="text-sm text-neutral-500 mt-1">Asigná un preceptor a cada curso para visualizarlo en los reportes.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/50">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-500 tracking-wide uppercase text-xs">Curso</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 tracking-wide uppercase text-xs">Preceptor Asignado</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 tracking-wide uppercase text-xs text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cursos.map((curso) => {
                  const preceptor = preceptores.find(p => p.id === Number(curso.preceptor_id));
                  const isEditing = editingCurso === curso.id;

                  return (
                    <tr key={curso.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium">{curso.nombre}</td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <select
                              value={selectedPreceptorId || ''}
                              onChange={(e) => setSelectedPreceptorId(e.target.value ? Number(e.target.value) : null)}
                              className="w-full max-w-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-shadow"
                            >
                              <option value="">-- Sin preceptor --</option>
                              {preceptores.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAssignPreceptor(curso.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => setEditingCurso(null)}
                                className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className={preceptor ? 'text-neutral-900' : 'text-neutral-400 italic'}>
                            {preceptor ? preceptor.nombre : 'Sin asignar'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingCurso(curso.id);
                              setSelectedPreceptorId(curso.preceptor_id ? Number(curso.preceptor_id) : null);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity whitespace-nowrap"
                          >
                            Asignar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de Preceptores */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-neutral-100">
            <h2 className="text-2xl font-semibold tracking-tight">Directorio de Preceptores</h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {preceptores.map((preceptor) => (
                <div key={preceptor.id} className="p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all bg-neutral-50/50">
                  <div className="font-medium text-neutral-900">{preceptor.nombre}</div>
                  <div className="text-xs text-neutral-500 mt-1">ID: {preceptor.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
