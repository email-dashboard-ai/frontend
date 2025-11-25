import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  if (isAuthenticated) {
    // Redirect to inbox if already authenticated
    return <Navigate to="/inbox" replace />;
  }

  return <>{children}</>;
};