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
    const element = document.getElementById('teacher-schedule');
    const opt = {
      margin: 1,
      filename: 'horarios-atencion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
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
            <div className="flex gap-4">
              <Link
                to="/materias"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <BookOpen size={20} />
                Gestionar Materias
              </Link>
              <Link
                to="/nuevo"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus size={20} />
                Nuevo Horario
              </Link>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
