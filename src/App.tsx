import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TeacherForm } from './components/TeacherForm';
import { Dashboard } from './components/Dashboard';
import { SubjectList } from './components/SubjectList';
import { SubjectForm } from './components/SubjectForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nuevo" element={<TeacherForm />} />
        <Route path="/materias" element={<SubjectList />} />
        <Route path="/materias/nueva" element={<SubjectForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;