import React, { useEffect, useState } from 'react';
import { Download, Clock, Plus, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { supabase } from '../lib/supabase';
import { CURSOS_DIVISIONES, CursoDivision } from '../types'; // Importar desde tu archivo de tipos
import type { Teacher, TeacherSubject } from '../types';

interface TeacherWithSchedules extends Teacher {
  teacher_subjects: TeacherSubject[];
}

export function Dashboard() {
  const [teachers, setTeachers] = useState<TeacherWithSchedules[]>([]);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (teachersError) {
      console.error('Error loading teachers:', teachersError);
      return;
    }

    const teachersWithSchedules = await Promise.all(
      (teachersData || []).map(async (teacher) => {
        const { data: schedulesData } = await supabase
          .from('teacher_subjects')
          .select(`
            *,
            subject:subject_id (
              id,
              nombre,
              curso,
              division
            )
          `)
          .eq('teacher_id', teacher.id);

        return {
          ...teacher,
          teacher_subjects: schedulesData || [],
        };
      })
    );

    setTeachers(teachersWithSchedules);
  }

  const exportToPDF = () => {
    // Agrupar profesores por curso y división
    const groupedTeachers: Record<string, TeacherWithSchedules[]> = {};
  
    teachers.forEach((teacher) => {
      teacher.teacher_subjects.forEach((schedule) => {
        const key = `${schedule.subject?.curso} ${schedule.subject?.division}`;
        if (!groupedTeachers[key]) {
          groupedTeachers[key] = [];
        }
        if (!groupedTeachers[key].includes(teacher)) {
          groupedTeachers[key].push(teacher);
        }
      });
    });
  
    // Ordenar según CURSOS_DIVISIONES
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
        teacher.teacher_subjects
          .filter((s) => `${s.subject?.curso} ${s.subject?.division}` === group)
          .forEach((schedule) => {
            pdfContent += `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${teacher.apellido}, ${teacher.nombre}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${schedule.subject?.nombre}</td>
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
  
  

  // Función para agrupar las materias por curso y división según el orden definido
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

    // Ordenar las claves de acuerdo con el array CURSOS_DIVISIONES
    const sortedGrouped: { group: CursoDivision, schedules: TeacherSubject[] }[] = CURSOS_DIVISIONES
      .filter(courseDivision => grouped[courseDivision])
      .map((courseDivision) => ({
        group: courseDivision,
        schedules: grouped[courseDivision],
      }));

    return sortedGrouped;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Horarios de Consulta</h2>
            <div className="flex flex-col sm:flex-row sm:gap-4 gap-2 sm:items-center w-full">
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materias y Horarios</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((teacher) => (
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
                              <div key={schedule.id} className="flex items-center gap-2 text-sm text-gray-900">
                                <Clock size={16} className="text-gray-500" />
                                <span>
                                  {schedule.subject?.nombre} - {schedule.dia} {schedule.hora_inicio} - {schedule.hora_fin}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
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
