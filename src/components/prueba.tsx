import React, { useState } from 'react';
import { Save, Plus, Trash2, CheckCircle } from 'lucide-react';
import { CURSOS_DIVISIONES, DIAS } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SubjectSchedule {
  curso: string;
  materia: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  genero?: string;
}

interface Subject {
  id: string;
  nombre: string;
  curso: string;
  division: string;
}

export function TeacherForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ nombre: '', apellido: '' });
  const [schedules, setSchedules] = useState<SubjectSchedule[]>([{
    curso: CURSOS_DIVISIONES[0],
    materia: '',
    dia: DIAS[0],
    horaInicio: '08:00',
    horaFin: '09:00',
  }]);
  const [subjectsByCourse, setSubjectsByCourse] = useState<Record<string, Subject[]>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingCoursesIndex, setLoadingCoursesIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addSchedule = async () => {
    const newCurso = CURSOS_DIVISIONES[0];
    let firstMateria = '';

    if (!subjectsByCourse[newCurso]) {
      const subjects = await loadSubjectsForCourse(newCurso);
      if (subjects.length > 0) {
        firstMateria = subjects[0].id;
      }
    } else {
      firstMateria = subjectsByCourse[newCurso][0]?.id || '';
    }

    setSchedules([...schedules, {
      curso: newCurso,
      materia: firstMateria,
      dia: DIAS[0],
      horaInicio: '08:00',
      horaFin: '09:00'
    }]);
  };

  const loadSubjectsForCourse = async (cursoCompleto: string): Promise<Subject[]> => {
    const [curso, division] = cursoCompleto.split(' ');
    const { data, error } = await supabase
      .from('subjects')
      .select('id, nombre')
      .eq('curso', curso)
      .eq('division', division);

    if (error) {
      console.error('Error loading subjects:', error);
      return [];
    }

    setSubjectsByCourse(prev => ({ ...prev, [cursoCompleto]: data || [] }));
    return data || [];
  };

  const updateSchedule = async (index: number, field: keyof SubjectSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'curso') {
      setLoadingCoursesIndex(index);
      let subjects: Subject[] = [];

      if (subjectsByCourse[value]) {
        subjects = subjectsByCourse[value];
      } else {
        subjects = await loadSubjectsForCourse(value);
      }

      const firstMateria = subjects[0]?.id || '';
      updated[index].materia = firstMateria;

      const subjectName = subjects[0]?.nombre;
      if (subjectName === 'Educación Física') {
        updated[index].genero = 'Varones';
      } else {
        delete updated[index].genero;
      }

      setLoadingCoursesIndex(null);
    }

    if (field === 'materia') {
      const currentCurso = updated[index].curso;
      const subjects = subjectsByCourse[currentCurso] || [];
      const subjectName = subjects.find(sub => sub.id === value)?.nombre;

      if (subjectName === 'Educación Física') {
        updated[index].genero = 'Varones';
      } else {
        delete updated[index].genero;
      }
    }

    setSchedules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .insert({ nombre: formData.nombre, apellido: formData.apellido })
      .select()
      .single();

    if (teacherError || !teacherData) {
      console.error('Error al guardar el profesor:', teacherError);
      setIsSaving(false);
      return;
    }

    const teacherSubjects = schedules.map(schedule => {
      const subjectName = subjectsByCourse[schedule.curso]?.find(sub => sub.id === schedule.materia)?.nombre;
      return {
        teacher_id: teacherData.id,
        subject_id: schedule.materia,
        dia: schedule.dia,
        hora_inicio: schedule.horaInicio,
        hora_fin: schedule.horaFin,
        ...(subjectName === 'Educación Física' ? { genero: schedule.genero } : {}),
      };
    });

    const { error: schedulesError } = await supabase.from('teacher_subjects').insert(teacherSubjects);
    setIsSaving(false);

    if (schedulesError) {
      console.error('Error al guardar los horarios:', schedulesError);
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-gray-100 py-8 px-4">
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="text-white text-lg">Guardando horario...</div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-semibold mb-2">¡Horario registrado!</h2>
            <p className="mb-4">Su horario ha sido registrado correctamente.</p>
            <button
              onClick={() => {
                setIsModalOpen(false);
                navigate('/');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Registro de Horarios</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            value={formData.apellido}
            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        {schedules.map((schedule, index) => (
          <div key={index} className="border p-4 rounded space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Curso y División</label>
              <select
                value={schedule.curso}
                onChange={(e) => updateSchedule(index, 'curso', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded"
              >
                {CURSOS_DIVISIONES.map((curso) => (
                  <option key={curso} value={curso}>{curso}</option>
                ))}
              </select>
              {loadingCoursesIndex === index && (
                <p className="text-blue-600 text-sm mt-2">Cargando materias...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Materia</label>
              <select
                value={schedule.materia}
                onChange={(e) => updateSchedule(index, 'materia', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded"
              >
                {(subjectsByCourse[schedule.curso] || []).map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.nombre}</option>
                ))}
              </select>
            </div>

            {schedule.genero && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Género</label>
                <select
                  value={schedule.genero}
                  onChange={(e) => updateSchedule(index, 'genero', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded"
                >
                  <option value="Varones">Varones</option>
                  <option value="Mujeres">Mujeres</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <input
                type="time"
                value={schedule.horaInicio}
                onChange={(e) => updateSchedule(index, 'horaInicio', e.target.value)}
                className="border p-2 rounded w-full"
              />
              <input
                type="time"
                value={schedule.horaFin}
                onChange={(e) => updateSchedule(index, 'horaFin', e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            {schedules.length > 1 && (
              <button
                type="button"
                onClick={() => setSchedules(schedules.filter((_, i) => i !== index))}
                className="text-red-600 flex items-center gap-2 mt-2"
              >
                <Trash2 size={16} />
                Eliminar horario
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={addSchedule}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus size={16} />
            Agregar Horario
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
