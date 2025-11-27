import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, ProtectedRoute, PublicRoute } from '../components/auth';

// Pages
import { LoginPage, RegisterPage, UnauthorizedPage, NotFoundPage, UnauthenticatedPage } from '../pages';
import EmailDashboard from '../pages/EmailDashboard';

export const AppRoutes: React.FC = () => {
  return (
    <Router>
      <AuthGuard>
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
      </AuthGuard>
    </Router>
  );
};