import { useEffect, useState } from 'react';
import { Download, Clock, Plus, BookOpen, Trash, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { ScheduleRow } from './ScheduleRow';
import { supabase } from '../lib/supabase';
import type { Docente, Curso, HorarioDocente, Preceptor } from '../types';

interface DocenteWithSchedules extends Docente {
  horarios: HorarioDocente[];
}

interface PdfEntry {
  docente: string;
  materia: string;
  dia: string;
  horario: string;
}

interface PdfGroup {
  cursoNombre: string;
  preceptorNombre: string;
  entries: PdfEntry[];
}

const PDF_BOXES_PER_PAGE = 2;
const PDF_PAGE_PADDING_MM = 8;
const PDF_PAGE_GAP_MM = 6;
const PDF_BOX_HEIGHT_MM = 104;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;

export function Dashboard() {
  const [docentes, setDocentes] = useState<DocenteWithSchedules[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [preceptores, setPreceptores] = useState<Preceptor[]>([]);
  const [selectedPreceptorId, setSelectedPreceptorId] = useState<number | null>(null);
  const [selectedPreceptorCourseIds, setSelectedPreceptorCourseIds] = useState<number[]>([]);
  const [selectedGeneralCourseIds, setSelectedGeneralCourseIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([
        loadDocentes(),
        loadPreceptores(),
        loadCursos()
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    setSelectedGeneralCourseIds(cursos.map((curso) => curso.id));
  }, [cursos]);

  async function loadCursos() {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .order('nombre', { ascending: true });
    if (!error && data) setCursos(data);
  }

  async function loadPreceptores() {
    const { data, error } = await supabase
      .from('preceptores')
      .select('*')
      .order('nombre', { ascending: true });
    if (!error && data) setPreceptores(data);
  }

  async function loadDocentes() {
    const [docentesRes, horariosRes] = await Promise.all([
      supabase.from('docentes').select('*').order('nombre', { ascending: true }),
      supabase.from('horarios_docente').select(`
        *,
        docente:docente_id(id, nombre),
        curso:curso_id(id, nombre, preceptor_id),
        materia:materia_id(id, nombre)
      `)
    ]);

    const { data: docentesData, error: docentesError } = docentesRes;
    const { data: horariosData, error: horariosError } = horariosRes;

    if (docentesError) {
      console.error('Error loading docentes:', docentesError);
      return;
    }

    if (horariosError) {
      console.error('Error loading horarios:', horariosError);
      return;
    }

    const horariosByDocente: Record<number, HorarioDocente[]> = {};
    (horariosData || []).forEach((h: any) => {
      if (!horariosByDocente[h.docente_id]) {
        horariosByDocente[h.docente_id] = [];
      }
      horariosByDocente[h.docente_id].push(h);
    });

    const docentesWithSchedules = (docentesData || []).map((docente) => ({
      ...docente,
      horarios: horariosByDocente[docente.id] || [],
    }));

    setDocentes(docentesWithSchedules);
  }

  const groupByCurso = (horarios: HorarioDocente[]) => {
    const grouped: Record<string, { curso: Curso; schedules: HorarioDocente[] }> = {};

    horarios.forEach((h) => {
      if (h.curso) {
        const key = String(h.curso.id);
        if (!grouped[key]) {
          grouped[key] = { curso: h.curso, schedules: [] };
        }
        grouped[key].schedules.push(h);
      }
    });

    return Object.values(grouped).sort((a, b) =>
      a.curso.nombre.localeCompare(b.curso.nombre)
    );
  };

  const getPreceptorNameForCurso = (curso: Curso): string => {
    if (!curso.preceptor_id) return 'Sin asignar';
    const preceptor = preceptores.find(p => p.id === Number(curso.preceptor_id));
    return preceptor ? preceptor.nombre : 'Sin asignar';
  };

  const assignedCoursesForSelectedPreceptor = selectedPreceptorId
    ? cursos.filter((curso) => Number(curso.preceptor_id) === selectedPreceptorId)
    : [];

  useEffect(() => {
    if (!selectedPreceptorId) {
      setSelectedPreceptorCourseIds([]);
      return;
    }

    setSelectedPreceptorCourseIds(assignedCoursesForSelectedPreceptor.map((curso) => curso.id));
  }, [selectedPreceptorId, cursos]);

  const handleSelectedPreceptorCoursesChange = (value: number) => {
    setSelectedPreceptorCourseIds((current) =>
      current.includes(value)
        ? current.filter((courseId) => courseId !== value)
        : [...current, value]
    );
  };

  const handleSelectedGeneralCoursesChange = (value: number) => {
    setSelectedGeneralCourseIds((current) =>
      current.includes(value)
        ? current.filter((courseId) => courseId !== value)
        : [...current, value]
    );
  };

  const chunkEntries = <T,>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  };

  const buildPdfContent = (groups: PdfGroup[], title: string) => {
    const pages = groups.map((group) => Array.from({ length: PDF_BOXES_PER_PAGE }, () => group));

    const pagesContent = pages.map((page, pageIndex) => `
      <section style="page-break-after: ${pageIndex === pages.length - 1 ? 'auto' : 'always'}; break-after: ${pageIndex === pages.length - 1 ? 'auto' : 'page'}; page-break-inside: avoid; break-inside: avoid; width: ${PDF_PAGE_WIDTH_MM}mm; height: ${PDF_PAGE_HEIGHT_MM}mm; padding: ${PDF_PAGE_PADDING_MM}mm; box-sizing: border-box; overflow: hidden; background: #fff;">
        <div style="text-align: center; margin-bottom: 5mm;">
          <img src="/logo_gsm.png" alt="Logo GSM" style="max-width: 42px; height: auto; display: block; margin: 0 auto 6px;" />
          <h2 style="margin: 0; color: #111; font-size: 16px; line-height: 1.2;">${title}</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: ${PDF_PAGE_GAP_MM}mm;">
          ${page.map((box) => `
            <div style="height: ${PDF_BOX_HEIGHT_MM}mm; border: 1px solid #d4d4d8; border-radius: 8px; padding: 4mm; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
              <div style="border-bottom: 2px solid #d4d4d8; padding-bottom: 3px; margin-bottom: 7px;">
                <h3 style="margin: 0; color: #333; font-size: 15px; line-height: 1.2;">Curso: ${box.cursoNombre}</h3>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 12px; line-height: 1.2;">Preceptor: ${box.preceptorNombre}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="border: 1px solid #dee2e6; padding: 5px; text-align: left; width: 28%;">Profesor</th>
                    <th style="border: 1px solid #dee2e6; padding: 5px; text-align: left; width: 39%;">Materia</th>
                    <th style="border: 1px solid #dee2e6; padding: 5px; text-align: left; width: 11%;">Día</th>
                    <th style="border: 1px solid #dee2e6; padding: 5px; text-align: left; width: 22%;">Horario</th>
                  </tr>
                </thead>
                <tbody>
                  ${box.entries.map((entry) => `
                    <tr>
                      <td style="border: 1px solid #dee2e6; padding: 4px; line-height: 1.15;">${entry.docente}</td>
                      <td style="border: 1px solid #dee2e6; padding: 4px; line-height: 1.15;">${entry.materia}</td>
                      <td style="border: 1px solid #dee2e6; padding: 4px; line-height: 1.15;">${entry.dia}</td>
                      <td style="border: 1px solid #dee2e6; padding: 4px; line-height: 1.15;">${entry.horario}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0;">
        ${pagesContent}
      </div>
    `;
  };

  const exportToPDFLegacy = (selectedCourseIds?: number[]) => {
    const allowedCourseIds = selectedCourseIds ? new Set(selectedCourseIds) : null;
    const groupedByCurso: Record<string, { cursoNombre: string; preceptorNombre: string; entries: { docente: string; materia: string; dia: string; horario: string }[] }> = {};

    docentes.forEach((docente) => {
      docente.horarios.forEach((h) => {
        if (!h.curso) return;
        if (allowedCourseIds && !allowedCourseIds.has(h.curso.id)) return;
        const cursoNombre = h.curso.nombre;
        if (!groupedByCurso[cursoNombre]) {
          groupedByCurso[cursoNombre] = { 
            cursoNombre, 
            preceptorNombre: getPreceptorNameForCurso(h.curso),
            entries: [] 
          };
        }
        groupedByCurso[cursoNombre].entries.push({
          docente: docente.nombre,
          materia: h.materia?.nombre ? `${h.materia.nombre}${h.genero ? ` (${h.genero})` : ''}` : '',
          dia: h.dia,
          horario: `${h.hora_inicio} - ${h.hora_fin}`,
        });
      });
    });

    const sortedGroups = Object.values(groupedByCurso).sort((a, b) =>
      a.cursoNombre.localeCompare(b.cursoNombre)
    );

    let pdfContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/logo_gsm.png" alt="Logo GSM" style="max-width: 70px; height: auto;" />
        </div>
        <h2 style="text-align: center; color: #111;">Horarios de Atención a padres</h2>
    `;

    sortedGroups.forEach((group) => {
      pdfContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <div style="margin-top: 10px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
          <h3 style="margin: 0; color: #333; font-size: 18px;">Curso: ${group.cursoNombre}</h3>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Preceptor: ${group.preceptorNombre}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Profesor</th>
              <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Materia</th>
              <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Día</th>
              <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Horario</th>
            </tr>
          </thead>
          <tbody>
      `;

      group.entries.forEach((entry) => {
        pdfContent += `
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.docente}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.materia}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.dia}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.horario}</td>
          </tr>
        `;
      });

      pdfContent += `</tbody></table></div>`;
    });

    pdfContent += `</div>`;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'horarios-atencion-general.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(pdfContent).save();
  };

  const exportToPDF = (selectedCourseIds?: number[]) => {
    const allowedCourseIds = selectedCourseIds ? new Set(selectedCourseIds) : null;
    const groupedByCurso: Record<string, PdfGroup> = {};

    docentes.forEach((docente) => {
      docente.horarios.forEach((h) => {
        if (!h.curso) return;
        if (allowedCourseIds && !allowedCourseIds.has(h.curso.id)) return;

        const cursoNombre = h.curso.nombre;
        if (!groupedByCurso[cursoNombre]) {
          groupedByCurso[cursoNombre] = {
            cursoNombre,
            preceptorNombre: getPreceptorNameForCurso(h.curso),
            entries: []
          };
        }

        groupedByCurso[cursoNombre].entries.push({
          docente: docente.nombre,
          materia: h.materia?.nombre ? `${h.materia.nombre}${h.genero ? ` (${h.genero})` : ''}` : '',
          dia: h.dia,
          horario: `${h.hora_inicio} - ${h.hora_fin}`,
        });
      });
    });

    const sortedGroups = Object.values(groupedByCurso).sort((a, b) =>
      a.cursoNombre.localeCompare(b.cursoNombre)
    );

    const pdfContent = buildPdfContent(sortedGroups, 'Horarios de Atención a padres');

    const opt = {
      margin: [0, 0, 0, 0],
      filename: 'horarios-atencion-general.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      pagebreak: { mode: ['css'] },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(pdfContent).save();
  };

  const exportSelectedCoursesToPDF = () => {
    if (selectedGeneralCourseIds.length === 0) {
      alert('Selecciona al menos un curso para exportar el PDF general.');
      return;
    }

    exportToPDF(selectedGeneralCourseIds);
  };

  const exportPreceptorScheduleToPDFLegacy = () => {
    if (!selectedPreceptorId) return;

    const preceptor = preceptores.find(p => p.id === selectedPreceptorId);
    if (!preceptor) {
      alert('Preceptor no encontrado.');
      return;
    }

    const preceptorCursos = cursos.filter(
      (curso) =>
        Number(curso.preceptor_id) === preceptor.id &&
        selectedPreceptorCourseIds.includes(curso.id)
    );

    if (preceptorCursos.length === 0) {
      alert('Selecciona al menos un curso para exportar el PDF del preceptor.');
      return;
    }

    const preceptorCursoIds = new Set(preceptorCursos.map(c => c.id));

    const docentesForPreceptor = docentes.filter((docente) =>
      docente.horarios.some((h) => preceptorCursoIds.has(h.curso_id))
    );

    if (docentesForPreceptor.length === 0) {
      alert('No se encontraron horarios para los cursos del preceptor.');
      return;
    }

    const groupedByCurso: Record<string, { cursoNombre: string; entries: { docente: string; materia: string; dia: string; horario: string }[] }> = {};

    docentesForPreceptor.forEach((docente) => {
      const matchingHorarios = docente.horarios.filter((h) =>
        preceptorCursoIds.has(h.curso_id)
      );

      matchingHorarios.forEach((h) => {
        if (!h.curso) return;

        const cursoNombre = h.curso.nombre;
        if (!groupedByCurso[cursoNombre]) {
          groupedByCurso[cursoNombre] = {
            cursoNombre,
            entries: [],
          };
        }

        groupedByCurso[cursoNombre].entries.push({
          docente: docente.nombre,
          materia: h.materia?.nombre ? `${h.materia.nombre}${h.genero ? ` (${h.genero})` : ''}` : '',
          dia: h.dia,
          horario: `${h.hora_inicio} - ${h.hora_fin}`,
        });
      });
    });

    const sortedGroups = Object.values(groupedByCurso).sort((a, b) =>
      a.cursoNombre.localeCompare(b.cursoNombre)
    );

    let groupedTablesContent = '';

    sortedGroups.forEach((group) => {
      groupedTablesContent += `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <div style="margin-top: 10px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">
            <h3 style="margin: 0; color: #333; font-size: 18px;">Curso: ${group.cursoNombre}</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Preceptor: ${preceptor.nombre}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Profesor</th>
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Materia</th>
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Día</th>
                <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left;">Horario</th>
              </tr>
            </thead>
            <tbody>
      `;

      group.entries.forEach((entry) => {
        groupedTablesContent += `
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.docente}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.materia}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.dia}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${entry.horario}</td>
          </tr>
        `;
      });

      groupedTablesContent += `
            </tbody>
          </table>
        </div>
      `;
    });

    const pdfContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        ${groupedTablesContent}
      </div>
    `;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `horarios-${preceptor.nombre.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(pdfContent).save();
  };

  const exportPreceptorScheduleToPDF = () => {
    if (!selectedPreceptorId) return;

    const preceptor = preceptores.find(p => p.id === selectedPreceptorId);
    if (!preceptor) {
      alert('Preceptor no encontrado.');
      return;
    }

    const preceptorCursos = cursos.filter(
      (curso) =>
        Number(curso.preceptor_id) === preceptor.id &&
        selectedPreceptorCourseIds.includes(curso.id)
    );

    if (preceptorCursos.length === 0) {
      alert('Selecciona al menos un curso para exportar el PDF del preceptor.');
      return;
    }

    const preceptorCursoIds = new Set(preceptorCursos.map(c => c.id));

    const docentesForPreceptor = docentes.filter((docente) =>
      docente.horarios.some((h) => preceptorCursoIds.has(h.curso_id))
    );

    if (docentesForPreceptor.length === 0) {
      alert('No se encontraron horarios para los cursos del preceptor.');
      return;
    }

    const groupedByCurso: Record<string, PdfGroup> = {};

    docentesForPreceptor.forEach((docente) => {
      const matchingHorarios = docente.horarios.filter((h) =>
        preceptorCursoIds.has(h.curso_id)
      );

      matchingHorarios.forEach((h) => {
        if (!h.curso) return;

        const cursoNombre = h.curso.nombre;
        if (!groupedByCurso[cursoNombre]) {
          groupedByCurso[cursoNombre] = {
            cursoNombre,
            preceptorNombre: preceptor.nombre,
            entries: [],
          };
        }

        groupedByCurso[cursoNombre].entries.push({
          docente: docente.nombre,
          materia: h.materia?.nombre ? `${h.materia.nombre}${h.genero ? ` (${h.genero})` : ''}` : '',
          dia: h.dia,
          horario: `${h.hora_inicio} - ${h.hora_fin}`,
        });
      });
    });

    const sortedGroups = Object.values(groupedByCurso).sort((a, b) =>
      a.cursoNombre.localeCompare(b.cursoNombre)
    );

    const pdfContent = buildPdfContent(sortedGroups, `Horarios de Atención a padres - ${preceptor.nombre}`);

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `horarios-${preceptor.nombre.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      pagebreak: { mode: ['css'] },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(pdfContent).save();
  };

  async function deleteDocente(docenteId: number) {
    if (!confirm('¿Estás seguro de que querés eliminar al docente y todos sus horarios?')) return;

    const { error: deleteHorariosError } = await supabase
      .from('horarios_docente')
      .delete()
      .eq('docente_id', docenteId);

    if (deleteHorariosError) {
      console.error('Error eliminando horarios del docente:', deleteHorariosError);
      return;
    }

    const { error: deleteDocenteError } = await supabase
      .from('docentes')
      .delete()
      .eq('id', docenteId);

    if (deleteDocenteError) {
      console.error('Error eliminando docente:', deleteDocenteError);
      return;
    }

    await loadDocentes();
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-10 font-sans text-neutral-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Horarios de Consulta</h1>
            <p className="text-sm text-neutral-500 mt-1">Gestión general de docentes, materias y preceptores.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/preceptores"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-full text-sm font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <Users size={16} />
              Preceptores
            </Link>
            <Link
              to="/materias"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-full text-sm font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-all"
            >
              <BookOpen size={16} />
              Materias
            </Link>
            <Link
              to="/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2 md:py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              Nuevo Horario
            </Link>
          </div>
        </div>

        {/* Toolbar: Search and Exports */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
          <div className="w-full md:max-w-md">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Buscar por nombre</label>
            <input
              type="text"
              placeholder="Buscar docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-shadow"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1.5 shadow-sm w-full sm:w-auto">
                <select
                  value={selectedPreceptorId || ''}
                  onChange={(e) => setSelectedPreceptorId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-1.5 bg-transparent border-none text-sm focus:ring-0 cursor-pointer w-full"
                >
                  <option value="">Seleccionar preceptor</option>
                  {preceptores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm w-full sm:min-w-[280px]">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  Cursos para PDF
                </div>
                {selectedPreceptorId ? (
                  assignedCoursesForSelectedPreceptor.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto">
                      {assignedCoursesForSelectedPreceptor.map((curso) => (
                        <label key={curso.id} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPreceptorCourseIds.includes(curso.id)}
                            onChange={() => handleSelectedPreceptorCoursesChange(curso.id)}
                            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
                          />
                          <span>{curso.nombre}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">Este preceptor no tiene cursos asignados.</p>
                  )
                ) : (
                  <p className="text-sm text-neutral-500">Primero selecciona un preceptor.</p>
                )}
              </div>

              <button
                onClick={exportPreceptorScheduleToPDF}
                disabled={!selectedPreceptorId || selectedPreceptorCourseIds.length === 0}
                className="p-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit self-end"
                title="Exportar PDF de Preceptor"
              >
                <Download size={18} />
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm w-full sm:min-w-[280px]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Cursos para PDF General
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedGeneralCourseIds(cursos.map((curso) => curso.id))}
                    className="text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGeneralCourseIds([])}
                    className="text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              {cursos.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto">
                  {cursos.map((curso) => (
                    <label key={curso.id} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGeneralCourseIds.includes(curso.id)}
                        onChange={() => handleSelectedGeneralCoursesChange(curso.id)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
                      />
                      <span>{curso.nombre}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No hay cursos disponibles.</p>
              )}
            </div>

            <button
              onClick={exportSelectedCoursesToPDF}
              disabled={selectedGeneralCourseIds.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
            >
              <Download size={18} />
              Exportar General por Cursos
            </button>
            
            <button
              onClick={() => exportToPDF()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-200 hover:border-neutral-300 transition-all w-full sm:w-auto"
            >
              <Download size={18} />
              Exportar General
            </button>
          </div>
        </div>

        {/* Lista de Docentes */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-neutral-100">
               <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-4"></div>
               <p className="text-neutral-500 font-medium animate-pulse">Cargando horarios...</p>
            </div>
          ) : docentes
            .filter((docente) =>
              docente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((docente) => {
              const cursosGrouped = groupByCurso(docente.horarios);
              
              if (cursosGrouped.length === 0) return null;

              return (
                <div key={docente.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden group">
                  <div className="p-6 md:p-8 flex justify-between items-start md:items-center border-b border-neutral-50 bg-neutral-50/30">
                    <h3 className="text-xl font-semibold text-neutral-900">{docente.nombre}</h3>
                    <button
                      onClick={() => deleteDocente(docente.id)}
                      className="text-neutral-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Eliminar docente"
                    >
                      <Trash size={18} />
                    </button>
                  </div>

                  <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {cursosGrouped.map(({ curso, schedules }) => (
                      <div key={curso.id} className="bg-neutral-50 rounded-xl p-5 border border-neutral-100/50">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-neutral-200/50">
                          <h4 className="font-semibold text-neutral-800">{curso.nombre}</h4>
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-neutral-200/50 text-neutral-600 rounded-full">
                            {getPreceptorNameForCurso(curso)}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {schedules.map((schedule) => (
                            <ScheduleRow key={schedule.id} schedule={schedule} reload={loadDocentes} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {(!isLoading && docentes.length === 0) && (
            <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 border-dashed">
              <Clock className="mx-auto text-neutral-300 mb-3" size={40} />
              <p className="text-neutral-500 font-medium">No hay docentes registrados.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
