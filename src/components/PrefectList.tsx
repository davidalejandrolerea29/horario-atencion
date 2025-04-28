import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { html2pdf } from 'html2pdf.js'; // Asegúrate de tener html2pdf instalado
import type { Prefect } from '../types';

export function PrefectList() {
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(''); // Guardar el curso seleccionado

  useEffect(() => {
    loadPrefects();
  }, []);

  // Cargar los preceptores
  async function loadPrefects() {
    const { data, error } = await supabase
      .from('prefects')
      .select('*')
      .order('curso', { ascending: true });

    if (error) {
      console.error('Error loading prefects:', error);
      return;
    }

    setPrefects(data || []);
  }

  // Función para obtener las materias asociadas al curso
  async function getSubjectsForCourse(course: string) {
    const { data, error } = await supabase
      .from('teachers_subjects')
      .select('subject')
      .eq('curso', course); // Filtrar por curso

    if (error) {
      console.error('Error loading subjects:', error);
      return [];
    }

    return data || [];
  }

  // Función para exportar el PDF de acuerdo al curso seleccionado
  const exportToPDF = async () => {
    // Obtener las materias asociadas al curso seleccionado
    const subjects = await getSubjectsForCourse(selectedCourse);

    // Filtrar los preceptores del curso seleccionado
    const coursePrefects = prefects.filter((prefect) => prefect.curso === selectedCourse);

    if (coursePrefects.length === 0) {
      alert('No hay preceptores para este curso');
      return;
    }

    // Crear el contenido del PDF
    let pdfContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="text-align: center;">Preceptores por Curso: ${selectedCourse}</h2>
    `;

    // Agregar las materias al PDF
    if (subjects.length > 0) {
      pdfContent += `<h3 style="color: #333;">Materias Asociadas:</h3><ul>`;
      subjects.forEach((subject) => {
        pdfContent += `<li>${subject.subject}</li>`;
      });
      pdfContent += `</ul>`;
    }

    // Agregar los preceptores al PDF
    pdfContent += `
      <h3 style="margin-top: 20px; color: #333;">Preceptores:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px;">Preceptor</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Curso</th>
          </tr>
        </thead>
        <tbody>
    `;

    coursePrefects.forEach((prefect) => {
      pdfContent += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${prefect.apellido}, ${prefect.nombre}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${prefect.curso} ${prefect.division}</td>
        </tr>
      `;
    });

    pdfContent += `
      </tbody>
    </table>
    </div>
    `;

    // Configuración de html2pdf
    const opt = {
      margin: 10,
      filename: `preceptores-${selectedCourse}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    // Generar y descargar el PDF
    html2pdf().set(opt).from(pdfContent).save();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Preceptores por Curso</h2>
            <Link
              to="/preceptores/nuevo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus size={20} />
              Nuevo Preceptor
            </Link>
           
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preceptor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prefects.map((prefect) => (
                  <tr key={prefect.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prefect.apellido}, {prefect.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prefect.curso} {prefect.division}</div>
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
