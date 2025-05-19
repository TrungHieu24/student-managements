import React from 'react';
import ReactDOM from 'react-dom/client';
import theme from '../src/theme/theme.ts';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import BreakpointsProvider from '../src/providers/BreakpointsProvider.tsx';
import router from '../src/routes/router';
import './index.css';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
echarts.use([CanvasRenderer]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <BreakpointsProvider>
          <CssBaseline />
          <RouterProvider router={router} />
        </BreakpointsProvider>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);

