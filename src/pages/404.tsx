import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { FileX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" className="min-h-screen flex items-center justify-center">
      <Box className="text-center p-8">
        <FileX size={64} className="text-slate-400 mx-auto mb-4" />
        <Typography variant="h4" className="font-bold text-slate-900 mb-4">
          Page Not Found
        </Typography>
        <Typography variant="body1" className="text-slate-600 mb-6">
          The page you're looking for doesn't exist.
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

export default NotFoundPage;