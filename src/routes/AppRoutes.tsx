import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, ProtectedRoute, PublicRoute } from '../components/auth';

// Pages
import { LoginPage, InboxPage, UnauthorizedPage, NotFoundPage } from '../pages';

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
          
          {/* Protected routes */}
          <Route 
            path="/inbox" 
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Error routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthGuard>
    </Router>
  );
};