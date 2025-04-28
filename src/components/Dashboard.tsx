import React, { useEffect, useState } from 'react';
import { Download, Clock, Plus, BookOpen, Trash, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { ScheduleRow } from "./ScheduleRow";


import { supabase } from '../lib/supabase';
import { CURSOS_DIVISIONES, CursoDivision } from '../types'; // Importar desde tu archivo de tipos
import type { Teacher, TeacherSubject } from '../types';

interface TeacherWithSchedules extends Teacher {
  teacher_subjects: TeacherSubject[];

}

export function Dashboard() {
  const [teachers, setTeachers] = useState<TeacherWithSchedules[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prefects, setPrefects] = useState<any[]>([]);
const [selectedPrefectId, setSelectedPrefectId] = useState<string | null>(null);



  useEffect(() => {
    loadTeachers();
    loadPrefects(); 
  }, []);
  async function loadPrefects() {
    const { data, error } = await supabase
      .from('prefects')
      .select('*')
      .order('apellido', { ascending: true });
  
    if (error) {
      console.error('Error loading prefects:', error);
      return;
    }
  
    setPrefects(data || []);
  }
  async function loadTeachers() {
    // 1. Traer todos los profesores
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });
  
    if (teachersError) {
      console.error('Error loading teachers:', teachersError);
      return;
    }
  
    // 2. Traer todos los horarios de todos los profesores
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('teacher_subjects')
      .select(`
        *,
        subject:subject_id (
          id,
          nombre,
          curso,
          division,
          order
        ),
        genero
      `);
  
    if (schedulesError) {
      console.error('Error loading schedules:', schedulesError);
      return;
    }
  
    // 3. Agrupar los horarios por profesor
    const schedulesByTeacherId: Record<string, TeacherSubject[]> = {};
    (schedulesData || []).forEach((schedule) => {
      if (!schedulesByTeacherId[schedule.teacher_id]) {
        schedulesByTeacherId[schedule.teacher_id] = [];
      }
      schedulesByTeacherId[schedule.teacher_id].push(schedule);
    });
  
    // 4. Asociar a cada profesor sus horarios
    const teachersWithSchedules = (teachersData || []).map((teacher) => ({
      ...teacher,
      teacher_subjects: schedulesByTeacherId[teacher.id] || [],
    }));
  
    setTeachers(teachersWithSchedules);
  }
  
  // Exportación a PDF
  const exportToPDF = () => {
    // Agrupar profesores por curso y división
    const groupedTeachers: Record<string, TeacherWithSchedules[]> = {};
  
    teachers.forEach((teacher) => {
      teacher.teacher_subjects.forEach((schedule) => {
        if (schedule.subject?.order === undefined) {
          console.error(`La materia ${schedule.subject?.nombre} no tiene un valor de 'order' definido.`);
        }
        const key = `${schedule.subject?.curso} ${schedule.subject?.division}`;
        if (!groupedTeachers[key]) {
          groupedTeachers[key] = [];
        }
        if (!groupedTeachers[key].includes(teacher)) {
          groupedTeachers[key].push(teacher);
        }
      });
    });
  
    // Ordenar los grupos de curso y división
    const sortedGroups = CURSOS_DIVISIONES.filter((cd) => groupedTeachers[cd]);
  
    // Construir el contenido de la tabla para el PDF
    let pdfContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="text-align: center;">Horarios de Atención a padres</h2>
    `;
  
    sortedGroups.forEach((group) => {
      pdfContent += `
        <h3 style="margin-top: 20px; color: #333;">${group}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px;">Profesor</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Materia</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Día</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Horario</th>
            </tr>
          </thead>
          <tbody>
      `;
  
      groupedTeachers[group].forEach((teacher) => {
        
        const sortedSubjects = teacher.teacher_subjects
            .filter((s) => `${s.subject?.curso} ${s.subject?.division}` === group)
            .sort((a, b) => (a.subject?.order || 0) - (b.subject?.order || 0));
 
      
      
      
        console.log('Sorted Subjects:', sortedSubjects);  // Verifica el orden aquí
      
        // Resto de la lógica para construir el contenido del PDF
    
      
        // Agregar las materias ordenadas al contenido del PDF
        sortedSubjects.forEach((schedule) => {
          console.log(`Materia: ${schedule.subject?.nombre}, Orden: ${schedule.subject?.order}`);
          pdfContent += `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${teacher.apellido}, ${teacher.nombre}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">
                ${schedule.subject?.nombre} 
                ${schedule.subject?.nombre === 'Educación Física' && schedule.genero ? `(${schedule.genero})` : ''}
              </td>
              <td style="border: 1px solid #ddd; padding: 8px;">${schedule.dia}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${schedule.hora_inicio} - ${schedule.hora_fin}</td>
            </tr>
          `;
        });
      });
      
      
  
      pdfContent += `
          </tbody>
        </table>
      `;
    });
  
    pdfContent += `</div>`;
  
    // Configuración de html2pdf para convertir la tabla a PDF
    const opt = {
      margin: 10,
      filename: 'horarios-atencion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
  
    html2pdf().set(opt).from(pdfContent).save();
  };
  
  async function cleanDuplicateSchedules() {
    const { data: allSchedules, error } = await supabase
      .from('teacher_subjects')
      .select('id, teacher_id, subject_id, dia, hora_inicio, hora_fin');
  
    if (error) {
      console.error('Error al cargar horarios:', error);
      return;
    }
  
    const seen = new Map<string, number[]>();
    const duplicatesToDelete: number[] = [];
  
    (allSchedules || []).forEach((item) => {
      const key = `${item.teacher_id}-${item.subject_id}-${item.dia}-${item.hora_inicio}-${item.hora_fin}`;
      if (!seen.has(key)) {
        seen.set(key, [item.id]);
      } else {
        seen.get(key)!.push(item.id);
      }
    });
  
    // Reunimos todos menos el primero (que se mantiene)
    for (const [, ids] of seen) {
      if (ids.length > 1) {
        duplicatesToDelete.push(...ids.slice(1));
      }
    }
  
    if (duplicatesToDelete.length === 0) {
      alert('No se encontraron horarios duplicados.');
      return;
    }
  
    const { error: deleteError } = await supabase
      .from('teacher_subjects')
      .delete()
      .in('id', duplicatesToDelete);
  
    if (deleteError) {
      console.error('Error eliminando duplicados:', deleteError);
      return;
    }
  
    alert(`Se eliminaron ${duplicatesToDelete.length} horarios duplicados.`);
    await loadTeachers(); // refrescar la lista
  }
  
  const exportPrefectScheduleToPDF = () => {
    if (!selectedPrefectId) return;
  
    const prefect = prefects.find(p => p.id === selectedPrefectId);
    if (!prefect) {
      alert('Preceptor no encontrado.');
      return;
    }
  
    const cursoDivisionKey = `${prefect.curso} ${prefect.division}`;
  
    // Filtrar los profesores que tienen materias en el mismo curso/división que el preceptor
    const teachersForPrefect = teachers.filter((teacher) =>
      teacher.teacher_subjects.some((subject) =>
        `${subject.subject?.curso} ${subject.subject?.division}` === cursoDivisionKey
      )
    );
  
    if (teachersForPrefect.length === 0) {
      alert('No se encontraron horarios para el curso del preceptor.');
      return;
    }
  
    // Construir el contenido del PDF
    const generateTable = () => {
      let tableContent = `
        <table style="width: 15cm; height: 11.8cm; border-collapse: collapse; margin: 5px; font-size: 10px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #000; padding: 4px;">Profesor</th>
              <th style="border: 1px solid #000; padding: 4px;">Materia</th>
              <th style="border: 1px solid #000; padding: 4px;">Día</th>
              <th style="border: 1px solid #000; padding: 4px;">Horario</th>
            </tr>
          </thead>
          <tbody>
      `;
  
      teachersForPrefect.forEach((teacher) => {
        const matchingSubjects = teacher.teacher_subjects.filter((subject) =>
          `${subject.subject?.curso} ${subject.subject?.division}` === cursoDivisionKey
        );
  
        matchingSubjects.forEach((schedule) => {
          tableContent += `
            <tr>
              <td style="border: 1px solid #000; padding: 4px;">${teacher.apellido}, ${teacher.nombre}</td>
              <td style="border: 1px solid #000; padding: 4px;">
                ${schedule.subject?.nombre}
                ${schedule.subject?.nombre === 'Educación Física' && schedule.genero ? `(${schedule.genero})` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 4px;">${schedule.dia}</td>
              <td style="border: 1px solid #000; padding: 4px;">${schedule.hora_inicio} - ${schedule.hora_fin}</td>
            </tr>
          `;
        });
      });
  
      tableContent += `
          </tbody>
        </table>
      `;
  
      return tableContent;
    };
  
    // El contenido final del PDF
    let pdfContent = `
      <div style="font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; justify-content: space-around;">
        <div style="text-align: center; width: 100%;">
          <h2 style="font-size: 16px;">Horarios de Atención</h2>
          <h3 style="font-size: 12px;">${prefect.apellido}, ${prefect.nombre} - Curso: ${prefect.curso}° División: ${prefect.division}</h3>
        </div>
  
        <!-- Primera tabla -->
        ${generateTable()}
  
        <!-- Segunda tabla -->
       
      </div>
    `;
  
    const opt = {
      margin: 5,
      filename: `horarios-${prefect.apellido}-${prefect.curso}-${prefect.division}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
  
    html2pdf().set(opt).from(pdfContent).save();
  };
  
  
const groupByCourseAndDivision = (teacherSubjects: TeacherSubject[]) => {
  const grouped: Record<string, TeacherSubject[]> = {};

  teacherSubjects.forEach((schedule) => {
    const key = `${schedule.subject?.curso} ${schedule.subject?.division}`;

    if (key) {
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(schedule);
    }
  });

  // Ahora que las materias están agrupadas por curso y división, ya están en su orden
  // original tal como están en la base de datos.
  const sortedGrouped: { group: CursoDivision, schedules: TeacherSubject[] }[] = CURSOS_DIVISIONES
    .filter(courseDivision => grouped[courseDivision])
    .map((courseDivision) => ({
      group: courseDivision,
      schedules: grouped[courseDivision], // Las materias ya están en su orden predefinido
    }));

  return sortedGrouped;
};
async function deleteTeacher(teacherId: string) {

  if (!confirm('¿Estás seguro de que querés eliminar al profesor y todos sus horarios?')) return;

  // Eliminar primero los registros relacionados en teacher_subjects
  const { error: deleteSubjectsError } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('teacher_id', teacherId);

  if (deleteSubjectsError) {
    console.error('Error eliminando materias del profesor:', deleteSubjectsError);
    return;
  }

  // Luego eliminar el profesor
  const { error: deleteTeacherError } = await supabase
    .from('teachers')
    .delete()
    .eq('id', teacherId);

  if (deleteTeacherError) {
    console.error('Error eliminando profesor:', deleteTeacherError);
    return;
  }

  // Recargar la lista
  await loadTeachers();
}



  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Horarios de Consulta</h2>
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-2 sm:items-center w-full">
            <Link
                to="/preceptores"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Users size={20} />
                Preceptores
              </Link>
  <Link
    to="/materias"
    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
  >
    <BookOpen size={20} />
    Gestionar Materias
  </Link>
  <Link
    to="/nuevo"
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
  >
    <Plus size={20} />
    Nuevo Horario
  </Link>
  <div className="flex flex-col sm:flex-row sm:gap-4 gap-2 sm:items-center w-full">
  {/* Tu Link a Preceptores, Materias, etc. */}

  <select
    value={selectedPrefectId || ''}
    onChange={(e) => setSelectedPrefectId(e.target.value || null)}
    className="px-4 py-2 border rounded-md w-full sm:w-auto"
  >
    <option value="">Seleccionar Preceptor</option>
    {prefects.map((prefect) => (
      <option key={prefect.id} value={prefect.id}>
        {prefect.apellido}, {prefect.nombre} ({prefect.curso}° {prefect.division})
      </option>
    ))}
  </select>

  {/* Botón para exportar por preceptor */}
  <button
    onClick={exportPrefectScheduleToPDF}
    disabled={!selectedPrefectId}
    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
  >
    <Download size={20} />
    Exportar por Preceptor
  </button>
</div>

  <button
    onClick={exportToPDF}
    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
  >
    <Download size={20} />
    Exportar PDF
  </button>
</div>


          </div>

          <div id="teacher-schedule" className="overflow-x-auto">
          <input
  type="text"
  placeholder="Buscar profesor..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="mb-4 px-4 py-2 border rounded-md w-full sm:w-1/2"
/>

  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesor</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materias y Horarios</th>
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
  {teachers
    .filter((teacher) =>
      `${teacher.apellido} ${teacher.nombre}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .map((teacher) => (
      <tr key={teacher.id}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {teacher.apellido}, {teacher.nombre}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="space-y-4">
            {groupByCourseAndDivision(teacher.teacher_subjects).map(({ group, schedules }) => (
              <div key={group} className="space-y-2">
                <div className="font-semibold text-gray-800">{group}</div>
                {schedules.map((schedule) => (
                  <ScheduleRow key={schedule.id} schedule={schedule} reload={loadTeachers} />
                ))}
              </div>
            ))}
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={() => deleteTeacher(teacher.id)}
            className="text-red-600 hover:text-red-800 font-semibold text-sm"
          >
            Eliminar
          </button>
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
