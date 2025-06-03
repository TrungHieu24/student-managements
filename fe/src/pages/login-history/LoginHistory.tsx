// src/components/LoginHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Typography, CircularProgress, Box, Pagination
} from '@mui/material';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  name: string;
  email: string;
}

interface LoginHistoryItem {
  id: number;
  user_id: number;
  ip_address: string;
  device: string;
  browser: string;
  login_at: string;
  logout_at: string | null;
  status: string;
  user?: User;
}

const LoginHistory = () => {
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
  const { t } = useTranslation();
  const [loginHistories, setLoginHistories] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLoginHistories(page);
  }, [page]);

  const fetchLoginHistories = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/login-history?page=${pageNumber}&per_page=${rowsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
           "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setLoginHistories(response.data.data);
      setTotal(response.data.total || response.data.meta?.total || 0);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '---';
    return moment.utc(dateTimeString).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('loginHistoryTitle')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('id')}</TableCell>
              <TableCell>{t('user')}</TableCell>
              <TableCell>{t('email')}</TableCell>
              <TableCell>{t('ip')}</TableCell>
              <TableCell>{t('device')}</TableCell>
              <TableCell>{t('browser')}</TableCell>
              <TableCell>{t('loginAt')}</TableCell>
              <TableCell>{t('logoutAt')}</TableCell>
              <TableCell>{t('status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loginHistories.map((history) => (
              <TableRow key={history.id}>
                <TableCell>{history.id}</TableCell>
                <TableCell>{history.user?.name || t('emptyValue')}</TableCell>
                <TableCell>{history.user?.email || t('emptyValue')}</TableCell>
                <TableCell>{history.ip_address}</TableCell>
                <TableCell>{history.device}</TableCell>
                <TableCell>{history.browser}</TableCell>
                <TableCell>{formatDateTime(history.login_at)}</TableCell>
                <TableCell>{formatDateTime(history.logout_at)}</TableCell>
                <TableCell>{history.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={Math.ceil(total / rowsPerPage)}
            page={page}
            onChange={(_e, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
        </>
      )}
    </Paper>
  );
};

export default LoginHistory;