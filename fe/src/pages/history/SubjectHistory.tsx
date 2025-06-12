import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { SelectChangeEvent } from '@mui/material/Select';

interface SubjectHistory {
  id: number;
  record_id: number;
  action_type: string;
  created_at: string;
  user: {
    id: number;
    name: string;
  } | null;
  old_values: any;
  new_values: any;
}

interface ApiResponse {
  data: SubjectHistory[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const SubjectHistory: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
  const [history, setHistory] = useState<SubjectHistory[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const response = await axios.get<ApiResponse>('/api/subject-history', {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          action_type: selectedActionType,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true",
          'Authorization': `Bearer ${token}`
        },
        baseURL: API_BASE_URL
      });

      console.log('API Response:', response.data);

      if (response.data && response.data.data) {
        setHistory(response.data.data);
        setTotal(response.data.meta.total || 0);
      } else {
        setHistory([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching subject history:', error);
      let errorMessage = 'Không thể tải lịch sử môn học. Vui lòng thử lại sau.';

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          window.location.href = '/authentication/login';
        } else {
          errorMessage = error.response.data?.message || `Lỗi server: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }

      setError(errorMessage);
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, rowsPerPage, selectedActionType]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleActionTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedActionType(event.target.value as string);
    setPage(0);
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm:ss dd/MM/yyyy', { locale: vi });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return dateString;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'warning';
      case 'DELETE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getActionTypeText = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'Tạo mới';
      case 'UPDATE':
        return 'Cập nhật';
      case 'DELETE':
        return 'Xóa';
      default:
        return actionType;
    }
  };

  const renderJsonField = (data: any) => {
    if (data === null || data === undefined) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>null</span>;
    }

    try {
      const formattedData = Object.entries(data).map(([key, value]) => {
        if (value === null) return null;

        if (key.includes('_at') && typeof value === 'string') {
          try {
            if (key === 'updated_at') {
              return null;
            }
            value = format(new Date(value), 'HH:mm:ss dd/MM/yyyy', { locale: vi });
          } catch (e) {
          }
        }

        const fieldMap: { [key: string]: string } = {
          'id': 'ID',
          'name': 'Tên môn học',
          'created_at': 'Ngày tạo',
          'updated_at': 'Ngày cập nhật'
        };

        return (
          <div key={key} style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#aaa' }}>{fieldMap[key] || key}:</strong>{' '}
            <span style={{ color: '#fff' }}>{String(value)}</span>
          </div>
        );
      }).filter(Boolean);

      return (
        <div style={{
          padding: '8px',
          backgroundColor: '#4a4d5e',
          borderRadius: '4px',
          fontSize: '13px',
          maxWidth: '300px',
          overflow: 'auto',
          color: '#fff'
        }}>
          {formattedData}
        </div>
      );
    } catch (error) {
      return <span style={{ color: 'red' }}>Invalid JSON</span>;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#21222D' }}>
        <CircularProgress sx={{ color: '#fff' }} />
        <Typography sx={{ ml: 2, color: '#fff' }}>Đang tải dữ liệu...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#21222D', minHeight: '100vh', color: '#fff' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#fff' }}>
          Lịch sử môn học
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{
            minWidth: 150,
            height: '40px',
            bgcolor: '#333645',
            borderRadius: '4px',
            '& .MuiOutlinedInput-root': {
              height: '40px',
            }
          }} size="small">
            <Select
              value={selectedActionType}
              onChange={handleActionTypeChange}
              displayEmpty
              sx={{
                color: '#fff',
                height: '40px',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#888' },
                '.MuiSvgIcon-root': { color: '#fff' }
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="CREATE">Tạo mới</MenuItem>
              <MenuItem value="UPDATE">Cập nhật</MenuItem>
              <MenuItem value="DELETE">Xóa</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchHistory}
            disabled={loading}
            sx={{
              color: '#fff',
              borderColor: '#fff',
              minWidth: 150,
              height: '40px'
            }}
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden', backgroundColor: '#333645', color: '#fff' }}>
        <TableContainer sx={{ backgroundColor: '#333645' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Thời gian</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Hành động</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Người thực hiện</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Thông tin cũ</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Thông tin mới</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history && history.length > 0 ? (
                history.map((record) => (
                  <TableRow
                    key={record.id}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#333645' },
                      '&:nth-of-type(even)': { backgroundColor: '#3a3d4f' },
                      '&:hover': { backgroundColor: '#4c4f64 !important' }
                    }}
                  >
                    <TableCell sx={{ color: '#fff' }}>{formatDateTime(record.created_at)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{record.record_id}</TableCell>
                    <TableCell>
                      <Chip
                        label={getActionTypeText(record.action_type)}
                        color={getActionTypeColor(record.action_type) as any}
                        size="small"
                        sx={{ color: '#fff' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      {record.user ? (
                        <Tooltip title={record.user.name}>
                          <span>{record.user.name}</span>
                        </Tooltip>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Unknown User</span>
                      )}
                    </TableCell>
                    <TableCell>{renderJsonField(record.old_values)}</TableCell>
                    <TableCell>{renderJsonField(record.new_values)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ backgroundColor: '#333645' }}>
                    <Typography variant="body1" sx={{ py: 4, color: 'text.secondary' }}>
                      Không có dữ liệu lịch sử
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
          sx={{
            color: '#fff',
            '.MuiTablePagination-selectLabel': {
              color: '#fff',
            },
            '.MuiTablePagination-displayedRows': {
              color: '#fff',
            },
            '.MuiTablePagination-select': {
              color: '#fff',
            },
            '.MuiSelect-icon': {
              color: '#fff',
            },
            '.MuiTablePagination-actions': {
              color: '#fff',
              '& .MuiIconButton-root': {
                color: '#fff',
              }
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default SubjectHistory;
