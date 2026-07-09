import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RouteGuard from './components/RouteGuard';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import CostsPage from './pages/CostsPage';
import ReportsPage from './pages/ReportsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AnomaliesPage from './pages/AnomaliesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes — guarded then laid out */}
          <Route element={<RouteGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"       element={<DashboardPage />} />
              <Route path="/monitoring"      element={<MonitoringPage />} />
              <Route path="/costs"           element={<CostsPage />} />
              <Route path="/reports"         element={<ReportsPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/anomalies"       element={<AnomaliesPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
