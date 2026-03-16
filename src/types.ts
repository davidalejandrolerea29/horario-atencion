export interface Docente {
  id: number;
  nombre: string;
}

export interface Materia {
  id: number;
  nombre: string;
}

export interface Curso {
  id: number;
  nombre: string;
  preceptor_id?: number | string | null;
}

export interface CursoMateria {
  id: number;
  curso_id: number;
  materia_id: number;
  materia?: Materia;
  curso?: Curso;
}

export interface HorarioDocente {
  id: number;
  docente_id: number;
  curso_id: number;
  materia_id: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  genero?: string | null;
  docente?: Docente;
  curso?: Curso;
  materia?: Materia;
}

export interface Preceptor {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
}

export const DIAS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
] as const;