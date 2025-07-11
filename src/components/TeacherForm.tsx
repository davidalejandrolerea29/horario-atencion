// Aquí está tu componente ajustado con loaders para guardar y al cambiar de curso

// Aquí está tu componente ajustado con loaders para guardar y al cambiar de curso

import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle, Text } from 'lucide-react';
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
  const [loadingCourses, setLoadingCourses] = useState<string | null>(null);
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
  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };
  const loadSubjectsForCourse = async (cursoCompleto: string) => {
    setLoadingCourses(cursoCompleto);  // Esta línea está bien para mostrar el mensaje general de "Cargando materias"
    setLoadingCoursesIndex(schedules.findIndex(schedule => schedule.curso === cursoCompleto)); // Asegúrate de que el índice sea el correcto
    
    const [curso, division] = cursoCompleto.split(' ');
    const { data, error } = await supabase.from('subjects').select('id, nombre').eq('curso', curso).eq('division', division);
  
    if (error) {
      console.error('Error loading subjects:', error);
      setLoadingCourses(null);  // Resetea el mensaje de carga en caso de error
      setLoadingCoursesIndex(null);  // Asegura que el índice se restablezca también
      return [];
    }
  
    setSubjectsByCourse(prev => ({ ...prev, [cursoCompleto]: data || [] }));
    
    // Aquí, ya puedes asegurarte de que el loader se oculta después de la carga
    setLoadingCourses(null);
    setLoadingCoursesIndex(null);
    return data || [];
  };
  
  
  const updateSchedule = async (index: number, field: keyof SubjectSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
  
    let subjects: Subject[] | undefined;
  
    if (field === 'curso') {
      setLoadingCoursesIndex(index);  // Asegúrate de que el índice se esté estableciendo correctamente
      
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
  
      setLoadingCoursesIndex(null);  // Aquí se debería resetear después de cambiar la materia
    }
  
    setSchedules(updated);
  };
  
  
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    for (let i = 0; i < schedules.length; i++) {
      if (!schedules[i].materia || schedules[i].materia.trim() === '') {
        console.error('El campo "Materia" no puede estar vacío para el horario:', schedules[i]);
        setIsSaving(false);
        return;
      }
    }

    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .insert({ nombre: formData.nombre, apellido: formData.apellido })
      .select()
      .single();

    if (teacherError || !teacherData || !teacherData.id) {
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

    for (const subject of teacherSubjects) {
      if (!isValidUUID(subject.subject_id)) {
        console.error('El subject_id no es un UUID válido:', subject.subject_id);
        setIsSaving(false);
        return;
      }
    }

    if (!validateMateria()) {
      setIsSaving(false);
      return;
    }

    const { error: schedulesError } = await supabase.from('teacher_subjects').insert(teacherSubjects);
    setIsSaving(false);

    if (schedulesError) {
      console.error('Error al guardar los horarios:', schedulesError);
      return;
    }

    setIsModalOpen(true);
  };

  const isValidUUID = (str: string) => {
    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return regex.test(str);
  };

  const validateMateria = () => {
    for (const schedule of schedules) {
      if (!schedule.materia || schedule.materia.trim() === '') {
        console.error('Falta el valor de materia en uno de los horarios');
        return false;
      }
    }
    return true;
  };

  return (
    <div className="relative min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="text-white text-lg">Guardando horario...</div>
        </div>
      )}
        <div className="max-w-4xl mx-auto">
          {successMessage && (
            <div className="flex items-center p-4 mb-4 text-green-700 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 mr-2" />
              {successMessage}
            </div>
          )}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Registro de Horarios de Consulta</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {isModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
      <CheckCircle className="text-green-500 mx-auto mb-4" size={40} />
      <h2 className="text-xl font-semibold mb-2">¡Horario registrado!</h2>
      <p className="mb-4">Su horario ha sido registrado correctamente. Muchas gracias.</p>
      <button
        onClick={() => {
          setIsModalOpen(false);
          navigate('/'); // redirigir si querés
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Aceptar
      </button>
    </div>
  </div>
)}

            <div>
              <label className="block text-sm font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                required
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Horarios de Consulta</h3>
              <button
                type="button"
                onClick={addSchedule}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Plus size={16} />
                Agregar Horario
              </button>
            </div>

            {schedules.map((schedule, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Curso y División</label>
                    <select
                      value={schedule.curso}
                      onChange={(e) => updateSchedule(index, 'curso', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {CURSOS_DIVISIONES.map((curso) => (
                        <option key={curso} value={curso}>{curso}</option>
                      ))}
                    </select>
                    {loadingCoursesIndex === index && (
  <Text>Cargando materias...</Text> // Muestra el mensaje solo si estamos cargando las materias para este índice
)}

                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Materia</label>
                    <select
  value={schedule.materia}
  onChange={(e) => updateSchedule(index, 'materia', e.target.value)}
  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
>
  {subjectsByCourse[schedule.curso]?.map((subject) => (
    <option key={subject.id} value={subject.id}>
      {subject.nombre}
    </option>
  ))}
</select>

{schedule.genero !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Género</label>
                      <select
                        value={schedule.genero}
                        onChange={(e) => updateSchedule(index, 'genero', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="Varones">Varones</option>
                        <option value="Mujeres">Mujeres</option>
                      </select>
                    </div>
                  )}
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Día de Consulta</label>
                    <select
                      value={schedule.dia}
                      onChange={(e) => updateSchedule(index, 'dia', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {DIAS.map((dia) => (
                        <option key={dia} value={dia}>{dia}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                      <input
                        type="time"
                        required
                        value={schedule.horaInicio}
                        onChange={(e) => updateSchedule(index, 'horaInicio', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                      <input
                        type="time"
                        required
                        value={schedule.horaFin}
                        onChange={(e) => updateSchedule(index, 'horaFin', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-end mt-8">
           
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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