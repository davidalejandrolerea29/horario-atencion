import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Pencil, Save, X } from 'lucide-react';
import type { TeacherSubject } from '../types';

interface Props {
  schedule: TeacherSubject;
  reload: () => void;
}

export function ScheduleRow({ schedule, reload }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    dia: schedule.dia,
    hora_inicio: schedule.hora_inicio,
    hora_fin: schedule.hora_fin,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('teacher_subjects')
      .update({
        dia: formData.dia,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
      })
      .eq('id', schedule.id);

    if (error) {
      console.error('Error updating schedule:', error);
      alert('Hubo un error guardando el horario.');
    } else {
      setIsEditing(false);
      reload(); // Recarga la lista
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-900">
        <Clock size={16} className="text-gray-500" />
        <span>{schedule.subject?.nombre}</span>
        <select
          name="dia"
          value={formData.dia}
          onChange={handleChange}
          className="border rounded px-2 py-1 text-sm"
        >
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <input
          type="time"
          name="hora_inicio"
          value={formData.hora_inicio}
          onChange={handleChange}
          className="border rounded px-2 py-1 text-sm"
        />
        <input
          type="time"
          name="hora_fin"
          value={formData.hora_fin}
          onChange={handleChange}
          className="border rounded px-2 py-1 text-sm"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800">
          <Save size={16} />
        </button>
        <button onClick={() => setIsEditing(false)} className="text-gray-600 hover:text-gray-800">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-900">
      <Clock size={16} className="text-gray-500" />
      <span>
        {schedule.subject?.nombre} - {schedule.dia} {schedule.hora_inicio} - {schedule.hora_fin}
      </span>
      <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-800">
        <Pencil size={16} />
      </button>
    </div>
  );
}
