import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { getCurrentUser } from '../../store/slices/authSlice';
import { CircularProgress, Box } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isLoading, user, accessToken } = useAppSelector(state => state.auth);

  useEffect(() => {
    // If we have a token but no user data, fetch user info
    if (accessToken && !user && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, accessToken, user, isLoading]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};