import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { refreshToken } from '../../store/slices/authSlice';
import { Box, CircularProgress } from '@mui/material';

interface SessionRestorerProps {
  children: React.ReactNode;
}

export const SessionRestorer: React.FC<SessionRestorerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken: storedRefreshToken, isAuthenticated } = useAppSelector((state) => state.auth);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      // If already have access token in memory, no need to restore
      if (accessToken && isAuthenticated) {
        setIsRestoring(false);
        return;
      }

      // If have refresh token but no access token, restore session
      if (storedRefreshToken && !accessToken) {
        try {
          await dispatch(refreshToken()).unwrap();
        } catch (error) {
          console.error('Failed to restore session:', error);
          // Clear invalid tokens
          localStorage.removeItem('persist:auth');
        }
      }

      setIsRestoring(false);
    };

    restoreSession();
  }, [dispatch, accessToken, storedRefreshToken, isAuthenticated]);

  if (isRestoring) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};
