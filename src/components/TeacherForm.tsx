import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle } from 'lucide-react';
import { DIAS } from '../types';
import type { Docente, Curso, Materia } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ScheduleEntry {
  curso_id: number | '';
  materia_id: number | '';
  dia: string;
  horaInicio: string;
  horaFin: string;
  genero?: string;
}

export function TeacherForm() {
  const navigate = useNavigate();
  const [docenteNombre, setDocenteNombre] = useState('');
  const [selectedDocenteId, setSelectedDocenteId] = useState<number | null>(null);
  const [isNewDocente, setIsNewDocente] = useState(true);

  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materiasByCurso, setMateriasByCurso] = useState<Record<number, Materia[]>>({});

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([{
    curso_id: '',
    materia_id: '',
    dia: DIAS[0],
    horaInicio: '08:00',
    horaFin: '09:00',
  }]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDocentes();
    loadCursos();
  }, []);

  async function loadDocentes() {
    const { data, error } = await supabase
      .from('docentes')
      .select('*')
      .order('nombre', { ascending: true });
    if (!error && data) setDocentes(data);
  }

  async function loadCursos() {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .order('nombre', { ascending: true });
    if (!error && data) setCursos(data);
  }

  async function loadMateriasForCurso(cursoId: number) {
    if (materiasByCurso[cursoId]) return materiasByCurso[cursoId];

    const { data, error } = await supabase
      .from('curso_materia')
      .select('materia_id, materias:materia_id(id, nombre)')
      .eq('curso_id', cursoId);

    if (error) {
      console.error('Error loading materias:', error);
      return [];
    }

    const materias: Materia[] = (data || []).map((item: any) => ({
      id: item.materias.id,
      nombre: item.materias.nombre,
    }));

    setMateriasByCurso(prev => ({ ...prev, [cursoId]: materias }));
    return materias;
  }

  const addSchedule = () => {
    setSchedules([...schedules, {
      curso_id: '',
      materia_id: '',
      dia: DIAS[0],
      horaInicio: '08:00',
      horaFin: '09:00',
    }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = async (index: number, field: keyof ScheduleEntry, value: string | number) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'curso_id' && typeof value === 'number') {
      const materias = await loadMateriasForCurso(value);
      updated[index].materia_id = materias.length > 0 ? materias[0].id : '';

      // Check if first materia is Educación Física
      const materiaNombre = materias[0]?.nombre;
      if (materiaNombre === 'Educación Física') {
        updated[index].genero = 'Varones';
      } else {
        delete updated[index].genero;
      }
    }

    if (field === 'materia_id' && typeof value === 'number') {
      const cursoId = updated[index].curso_id;
      if (cursoId !== '') {
        const materias = materiasByCurso[cursoId] || [];
        const materiaNombre = materias.find(m => m.id === value)?.nombre;
        if (materiaNombre === 'Educación Física') {
          updated[index].genero = 'Varones';
        } else {
          delete updated[index].genero;
        }
      }
    }

    setSchedules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validate schedules
    for (const schedule of schedules) {
      if (schedule.curso_id === '' || schedule.materia_id === '') {
        alert('Debe seleccionar un curso y una materia para cada horario.');
        setIsSaving(false);
        return;
      }
    }

    let docenteId = selectedDocenteId;

    if (isNewDocente) {
      if (!docenteNombre.trim()) {
        alert('Debe ingresar el nombre del docente.');
        setIsSaving(false);
        return;
      }

      const { data: docenteData, error: docenteError } = await supabase
        .from('docentes')
        .insert({ nombre: docenteNombre.trim() })
        .select()
        .single();

      if (docenteError || !docenteData) {
        console.error('Error al guardar el docente:', docenteError);
        setIsSaving(false);
        return;
      }
      docenteId = docenteData.id;
    }

    if (!docenteId) {
      alert('Debe seleccionar o crear un docente.');
      setIsSaving(false);
      return;
    }

    const horarios = schedules.map(schedule => ({
      docente_id: docenteId,
      curso_id: schedule.curso_id as number,
      materia_id: schedule.materia_id as number,
      dia: schedule.dia,
      hora_inicio: schedule.horaInicio,
      hora_fin: schedule.horaFin,
      genero: schedule.genero || null,
    }));

    const { error: schedulesError } = await supabase
      .from('horarios_docente')
      .insert(horarios);

    setIsSaving(false);

    if (schedulesError) {
      console.error('Error al guardar los horarios:', schedulesError);
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-neutral-800">
      {isSaving && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Guardando horario...</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Options */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Volver
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">¡Horario registrado!</h2>
              <p className="text-neutral-500 mb-8">El horario ha sido guardado correctamente.</p>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  navigate('/');
                }}
                className="w-full px-5 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all shadow-sm"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-8">Registro de Horarios</h2>

          {/* Docente selection */}
          <div className="p-6 bg-neutral-50/50 border border-neutral-100/80 rounded-2xl mb-8 space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  checked={isNewDocente}
                  onChange={() => { setIsNewDocente(true); setSelectedDocenteId(null); }}
                  className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900 focus:ring-offset-1"
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">Nuevo Docente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  checked={!isNewDocente}
                  onChange={() => setIsNewDocente(false)}
                  className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900 focus:ring-offset-1"
                />
                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">Docente Existente</span>
              </label>
            </div>

            {isNewDocente ? (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={docenteNombre}
                  onChange={(e) => setDocenteNombre(e.target.value)}
                  placeholder="Ej: García, Juan Carlos"
                  className="block w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-shadow"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Seleccionar Docente</label>
                <select
                  required
                  value={selectedDocenteId || ''}
                  onChange={(e) => setSelectedDocenteId(Number(e.target.value))}
                  className="block w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-shadow"
                >
                  <option value="">-- Seleccionar --</option>
                  {docentes.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Schedules */}
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-lg font-medium text-neutral-900">Bloques de Horario</h3>
              <button
                type="button"
                onClick={addSchedule}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <Plus size={16} />
                Agregar Bloque
              </button>
            </div>

            {schedules.map((schedule, index) => (
              <div key={index} className="p-6 border border-neutral-200 rounded-2xl bg-white shadow-sm relative group">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Curso */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Curso</label>
                    <select
                      value={schedule.curso_id}
                      onChange={(e) => updateSchedule(index, 'curso_id', Number(e.target.value))}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    >
                      <option value="">Seleccionar Curso</option>
                      {cursos.map((curso) => (
                        <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Materia */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Materia</label>
                    <select
                      value={schedule.materia_id}
                      onChange={(e) => updateSchedule(index, 'materia_id', Number(e.target.value))}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    >
                      <option value="">Seleccionar Materia</option>
                      {schedule.curso_id !== '' && materiasByCurso[schedule.curso_id]?.map((materia) => (
                        <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Género (solo para Educación Física) */}
                  {schedule.genero !== undefined && (
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Género</label>
                      <select
                        value={schedule.genero}
                        onChange={(e) => updateSchedule(index, 'genero', e.target.value)}
                        className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                      >
                        <option value="Varones">Varones</option>
                        <option value="Mujeres">Mujeres</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Día y Horario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-neutral-100">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Día de Consulta</label>
                    <select
                      value={schedule.dia}
                      onChange={(e) => updateSchedule(index, 'dia', e.target.value)}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    >
                      {DIAS.map((dia) => (
                        <option key={dia} value={dia}>{dia}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={schedule.horaInicio}
                      onChange={(e) => updateSchedule(index, 'horaInicio', e.target.value)}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">Hora Fin</label>
                    <input
                      type="time"
                      required
                      value={schedule.horaFin}
                      onChange={(e) => updateSchedule(index, 'horaFin', e.target.value)}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar bloque"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-8 mt-8 border-t border-neutral-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-900/20 transition-all shadow-sm hover:shadow-md"
            >
              <Save size={20} />
              Guardar Horarios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}