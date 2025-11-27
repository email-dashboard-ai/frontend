import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" className="min-h-screen flex items-center justify-center">
      <Box className="text-center p-8">
        <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4" />
        <Typography variant="h4" className="font-bold text-slate-900 mb-4">
          Unauthorized Access
        </Typography>
        <Typography variant="body1" className="text-slate-600 mb-6">
          You don't have permission to access this page.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/inbox')}
          className="bg-slate-900 hover:bg-slate-800"
        >
          Go to Inbox
        </Button>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;