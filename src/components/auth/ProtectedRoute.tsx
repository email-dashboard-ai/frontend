import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children
}) => {
  const { isAuthenticated, isSessionExpired } = useAppSelector(state => state.auth);
  const location = useLocation();

  useEffect(() => {
    if (isSessionExpired) {
      toast.error("Session expired. Please login again.");
    }
  }, [isSessionExpired]);

  // If session is expired, we still render children so user sees current screen
  // The toast will inform them. They can manually navigate or refresh to go to login.
  if (isSessionExpired) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};