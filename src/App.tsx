import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { EmployeeHome } from './pages/EmployeeHome';
import { AdminDashboard } from './pages/AdminDashboard';
import './App.css';

const queryClient = new QueryClient();

// Smart Redirector for root '/' path
const RootRedirect: React.FC = () => {
  const { user, loading, onboardingRequired } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingRequired) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.role === 'employee') {
    return <Navigate to="/checkin" replace />;
  }

  return <Navigate to="/admin" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading, onboardingRequired } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingRequired) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If not allowed, send to appropriate home
    return user.role === 'employee' ? <Navigate to="/checkin" replace /> : <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root redirector */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public auth route */}
            <Route path="/login" element={<Login />} />
            
            {/* Onboarding route (requires validated OTP login first) */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Employee daily checkin */}
            <Route
              path="/checkin"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeHome />
                </ProtectedRoute>
              }
            />

            {/* Admin Management Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Wildcard redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
