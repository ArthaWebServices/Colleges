import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicFeed from './pages/PublicFeed';
import AdminLogin from './pages/AdminLogin';
import AdminSignUp from './pages/AdminSignUp';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

export function App() {
  const location = useLocation();

  // Normalize double slashes in URL (e.g., //admin/superadmin -> /admin/superadmin)
  if (location.pathname.startsWith('//')) {
    const cleanPath = location.pathname.replace(/\/+/g, '/');
    return <Navigate to={cleanPath + location.search + location.hash} replace />;
  }

  // Clerk controls these sub-routes entirely — hide app shell to avoid hook conflicts
  const isClerkInternalRoute = location.pathname.includes('/tasks/');
  return (
    <div className="min-h-screen flex flex-col bg-college-lightBg dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {!isClerkInternalRoute && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<PublicFeed />} />
          <Route path="/admin/login/*" element={<AdminLogin />} />
          <Route path="/admin/sign-up/*" element={<AdminSignUp />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/super" element={<SuperAdminDashboard />} />
          <Route path="/admin/super" element={<SuperAdminDashboard />} />
          <Route path="/admin/superadmin" element={<SuperAdminDashboard />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Any unhandled /admin/* sub-path redirects to /admin */}
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
      {!isClerkInternalRoute && <Footer />}
    </div>
  );
}

export default App;
