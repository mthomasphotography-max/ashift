import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import SettingsPage from './pages/SettingsPage';
import StaffPlanPage from './pages/StaffPlanPage';
import LinePlanPage from './pages/LinePlanPage';
import RotaPage from './pages/RotaPage';
import SKAPListPage from './pages/SKAPListPage';
import SKAPDetailPage from './pages/SKAPDetailPage';
import SKAPSettingsPage from './pages/SKAPSettingsPage';
import SKAPTaskEditorPage from './pages/SKAPTaskEditorPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="staff-plan" element={<StaffPlanPage />} />
          <Route path="line-plan" element={<LinePlanPage />} />
          <Route path="rota" element={<RotaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="skap" element={<SKAPListPage />} />
          <Route path="skap/settings" element={<SKAPSettingsPage />} />
          <Route path="skap/editor" element={<SKAPTaskEditorPage />} />
          <Route path="skap/:operatorId" element={<SKAPDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
