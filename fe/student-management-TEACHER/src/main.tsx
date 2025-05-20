import React from 'react';
import ReactDOM from 'react-dom/client';
import theme from '../../student-management-TEACHER/src/theme/theme.ts';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import BreakpointsProvider from '../../student-management-TEACHER/src/providers/BreakpointsProvider.tsx';
import router from '../../student-management-TEACHER/src/routes/router.tsx';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BreakpointsProvider>
        <CssBaseline />
        <RouterProvider router={router} />
      </BreakpointsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
