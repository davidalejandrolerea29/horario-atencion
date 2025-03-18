import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Teacher, TeacherSubject } from '../types';

interface TeacherWithSchedules extends Teacher {
  teacher_subjects: TeacherSubject[];
}

export function TeacherDetail({ teacherId }: { teacherId: string }) {
  const [teacher, setTeacher] = useState<TeacherWithSchedules | null>(null);

  useEffect(() => {
    loadTeacherDetail();
  }, []);

  async function loadTeacherDetail() {
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (teachersError) {
      console.error('Error loading teacher:', teachersError);
      return;
    }

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
      .eq('teacher_id', teacherId);

    setTeacher({
      ...teachersData,
      teacher_subjects: schedulesData || [],
    });
  }

  const groupByCourseAndDivision = (teacherSubjects: TeacherSubject[]) => {
    return teacherSubjects.reduce((grouped, schedule) => {
      const key = `${schedule.subject?.curso} ${schedule.subject?.division}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(schedule);
      return grouped;
    }, {} as Record<string, TeacherSubject[]>);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800">Detalles del Profesor</h2>
          {teacher ? (
            <>
              <h3 className="mt-4 text-xl font-semibold">{teacher.nombre} {teacher.apellido}</h3>
              <div className="mt-4 space-y-6">
                {Object.entries(groupByCourseAndDivision(teacher.teacher_subjects)).map(([group, schedules]) => (
                  <div key={group}>
                    <div className="font-semibold text-gray-800">{group}</div>
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="flex justify-between py-2">
                        <div>{schedule.subject?.nombre}</div>
                        <div>{schedule.dia} {schedule.hora_inicio} - {schedule.hora_fin}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
