import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, ProtectedRoute, PublicRoute } from '../components/auth';

// Lazily loaded pages for route-based code splitting
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const UnauthorizedPage = lazy(() => import('../pages/403'));
const NotFoundPage = lazy(() => import('../pages/404'));
const UnauthenticatedPage = lazy(() => import('../pages/401'));
const EmailDashboard = lazy(() => import('../pages/EmailDashboard'));

export const AppRoutes: React.FC = () => {
  return (
    <Router>
      <AuthGuard>
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <EmailDashboard />
                </ProtectedRoute>
              }
            />

            {/* Error routes */}
            <Route path="/401" element={<UnauthenticatedPage />} />
            <Route path="/403" element={<UnauthorizedPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </AuthGuard>
    </Router>
  );
};