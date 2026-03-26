import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FarmProvider } from './context/FarmContext';
import Sidebar       from './components/Layout/Sidebar';
import Notification  from './components/Notification';
import Dashboard     from './pages/Dashboard';
import ZoneManagement from './pages/ZoneManagement';
import CropPlanner   from './pages/CropPlanner';
import IrrigationControl from './pages/IrrigationControl';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/zones"      element={<ZoneManagement />} />
          <Route path="/crops"      element={<CropPlanner />} />
          <Route path="/irrigation" element={<IrrigationControl />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Notification />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FarmProvider>
        <AppLayout />
      </FarmProvider>
    </BrowserRouter>
  );
}
