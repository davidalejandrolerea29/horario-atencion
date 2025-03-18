import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherForm } from './components/TeacherForm';
import { Dashboard } from './components/Dashboard';
import { SubjectList } from './components/SubjectList';
import { SubjectForm } from './components/SubjectForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirigir la raíz "/" a "/nuevo" automáticamente */}
        <Route path="/" element={<Navigate to="/nuevo" replace />} />
        
        {/* Página de creación de horarios */}
        <Route path="/nuevo" element={<TeacherForm />} />

        {/* Dashboard con los horarios */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Gestión de materias */}
        <Route path="/materias" element={<SubjectList />} />
        <Route path="/materias/nueva" element={<SubjectForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
