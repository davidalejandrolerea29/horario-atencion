export interface Teacher {
  id: string;
  nombre: string;
  apellido: string;
  created_at?: string;
}

export interface Subject {
  id: string;
  nombre: string;
  curso: string;
  division: string;
  order: number;
}
export interface Prefect {
  id: string;
  nombre: string;
  apellido: string;
  curso: string;
  division: string;
  created_at?: string;
}
export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  subject?: Subject;
  genero?:string;
}

export const CURSOS_DIVISIONES = [
  '1 I', '1 II', '1 III',
  '2 I', '2 II', '2 III',
  '3 I', '3 II', '3 III',
  '4 I', '4 II', '4 III',
  '5 I', '5 II', '5 III',
  '6 I', '6 II', '6 III',
] as const;
export type CursoDivision = (typeof CURSOS_DIVISIONES)[number];
export const DIAS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
] as const;