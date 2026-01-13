import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { store, persistor } from './store';
import { AppRoutes } from './routes/AppRoutes';
import { SessionRestorer } from './components/auth/SessionRestorer';
import { setStoreForApi, setApiAuthHandlers } from './config/apiConfig';
import { OfflineBanner } from './components/common/OfflineBanner';
import { CacheDebugPanel } from './components/common/CacheDebugPanel';

// Connect store to API for in-memory token access and handlers
setStoreForApi({ getState: store.getState, dispatch: store.dispatch });
setApiAuthHandlers({
  getAccessToken: () => store.getState().auth.accessToken,
  onSessionExpired: () => store.dispatch({ type: 'auth/handleSessionExpiry' }),
});

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a', // slate-900
    },
    secondary: {
      main: '#0ea5e9', // sky-500
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress />
          </Box>
        }
        persistor={persistor}
      >
        <SessionRestorer>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* Global Offline Banner */}
            <OfflineBanner position="top" showPendingCount dismissible />
            <AppRoutes />
            {/* Debug Panel - only visible in development */}
            <CacheDebugPanel />
          </ThemeProvider>
        </SessionRestorer>
      </PersistGate>
    </Provider>
  );
}

export default App;
