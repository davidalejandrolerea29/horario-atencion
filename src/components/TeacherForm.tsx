import React, { useState, useEffect } from 'react';
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

  const addSchedule = async () => {
    setSchedules([
      ...schedules,
      {
        curso: '',  // Curso vacío por defecto
        materia: '',  // Materia vacía por defecto
        dia: DIAS[0],  // Día por defecto (puedes cambiarlo si quieres)
        horaInicio: '08:00',  // Hora de inicio por defecto
        horaFin: '09:00',  // Hora de fin por defecto
      },
    ]);
  };
  

  useEffect(() => {
    // Iterar sobre los horarios solo una vez cuando cambian
    schedules.forEach((schedule, index) => {
      if (!schedule.materia && subjectsByCourse[schedule.curso]) {
        const availableSubjects = subjectsByCourse[schedule.curso];
        if (availableSubjects.length > 0) {
          updateSchedule(index, 'materia', availableSubjects[0].id); // Asigna la primera materia disponible
        }
      }
    });
  }, [schedules, subjectsByCourse]);
  

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = async (index: number, field: keyof SubjectSchedule, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };

    // Si cambia la materia a "Educación Física", asegurarse de agregar el campo de género
    if (field === 'materia') {
      const subjectName = subjectsByCourse[newSchedules[index].curso]?.find(sub => sub.id === value)?.nombre;
      if (subjectName === 'Educación Física') {
        newSchedules[index].genero = 'Varones'; // Valor por defecto
      } else {
        delete newSchedules[index].genero;
      }
    }

    setSchedules(newSchedules);
  };
  useEffect(() => {
    schedules.forEach((schedule, index) => {
      if (!subjectsByCourse[schedule.curso]) {
        loadSubjectsForCourse(schedule.curso).then((subjects) => {
          if (subjects.length > 0 && !schedule.materia) {
            updateSchedule(index, 'materia', subjects[0].id);
          }
        });
      }
    });
  }, [schedules, subjectsByCourse]);
  const loadSubjectsForCourse = async (cursoCompleto: string) => {
    const [curso, division] = cursoCompleto.split(' ');
  
    // Log para verificar que estamos separando correctamente curso y división
    console.log(`Cargando materias para el curso: ${curso}, división: ${division}`);
  
    const { data, error } = await supabase.from('subjects').select('id, nombre').eq('curso', curso).eq('division', division);
  
    if (error) {
      console.error('Error cargando materias:', error);
      return [];
    }
  
    console.log(`Materias cargadas para ${cursoCompleto}:`, data);  // Log de depuración
  
    setSubjectsByCourse(prev => ({ ...prev, [cursoCompleto]: data || [] }));
    return data || [];
  };
  
  
  
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que todos los horarios tengan un curso y materia válidos
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      if (!schedule.curso || schedule.curso.trim() === '') {
        console.error('El campo "Curso" no puede estar vacío para el horario:', schedule);
        return;  // Evitar enviar el formulario si el curso está vacío
      }
      if (!schedule.materia || schedule.materia.trim() === '') {
        console.error('El campo "Materia" no puede estar vacío para el horario:', schedule);
        return;  // Evitar enviar el formulario si la materia está vacía
      }
  
      console.log(`Horario validado: ${schedule.curso} - ${schedule.materia}`); // Log de depuración
    }
    // Guardar el profesor y obtener su ID
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .insert({ nombre: formData.nombre, apellido: formData.apellido })
      .select()
      .single();
  
    if (teacherError || !teacherData || !teacherData.id) {
      console.error('Error al guardar el profesor:', teacherError);
      return;
    }
  
    // Usar el ID del profesor para asociarlo con los horarios
    const teacherSubjects = schedules.map(schedule => {
      console.log('Materia:', schedule.materia); // Verifica el valor del subject_id
      const subjectName = subjectsByCourse[schedule.curso]?.find(sub => sub.id === schedule.materia)?.nombre;
      
      return {
        teacher_id: teacherData.id,
        subject_id: schedule.materia,
        dia: schedule.dia,
        hora_inicio: schedule.horaInicio,
        hora_fin: schedule.horaFin,
        ...(subjectName === 'Educación Física' ? { genero: schedule.genero } : {}), // Solo agrega 'genero' si es Educación Física
      };
    });
    
  
    // Asegúrate de que el subject_id es un UUID antes de enviar los datos
    teacherSubjects.forEach(subject => {
      if (!isValidUUID(subject.subject_id)) {
        console.error('El subject_id no es un UUID válido:', subject.subject_id);
        return;
      }
    });
    if (!validateMateria()) {
      return;
    }
    
    // Insertar los horarios en la tabla teacher_subjects
    const { error: schedulesError } = await supabase.from('teacher_subjects').insert(teacherSubjects);
    if (schedulesError) {
      console.error('Error al guardar los horarios:', schedulesError);
      return;
    }
    setIsModalOpen(true);

  };
  
  // Función para verificar si una cadena es un UUID válido
  function isValidUUID(str: string) {
    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return regex.test(str);
  }
  
  
  // Asegúrate de que todos los campos 'materia' sean válidos antes de enviar el formulario
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
   
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
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
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
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