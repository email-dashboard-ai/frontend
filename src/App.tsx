import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { store, persistor } from './store';
import { AppRoutes } from './routes/AppRoutes';
import { SessionRestorer } from './components/auth/SessionRestorer';
import { setStoreForApi } from './config/apiConfig';

// Connect store to API for in-memory token access
setStoreForApi({ getState: store.getState, dispatch: store.dispatch });

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
            <AppRoutes />
          </ThemeProvider>
        </SessionRestorer>
      </PersistGate>
    </Provider>
  );
}

export default App;
