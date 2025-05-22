// src/components/LoginHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Typography, CircularProgress, Box
} from '@mui/material';
import moment from 'moment-timezone';

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
  const [loginHistories, setLoginHistories] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistories();
  }, []);

  const fetchLoginHistories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/login-history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLoginHistories(response.data.data);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'N/A';
    return moment.utc(dateTimeString).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Lịch sử đăng nhập của user.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Người dùng</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>Thiết bị</TableCell>
              <TableCell>Trình duyệt</TableCell>
              <TableCell>Đăng nhập</TableCell>
              <TableCell>Đăng xuất</TableCell>
              <TableCell>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loginHistories.map((history) => (
              <TableRow key={history.id}>
                <TableCell>{history.id}</TableCell>
                <TableCell>{history.user?.name || 'N/A'}</TableCell>
                <TableCell>{history.user?.email || 'N/A'}</TableCell>
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
      )}
    </Paper>
  );
};

export default LoginHistory;