import React, { useState, useEffect, startTransition } from 'react';
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
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { Visibility, VisibilityOff, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { SelectChangeEvent } from '@mui/material/Select';

interface HomeroomAuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action_type: string;
  user_id: number;
  old_values: any;
  new_values: any;
  changed_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface ApiResponse {
  data: HomeroomAuditLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const HomeroomHistory: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
  const [history, setHistory] = useState<HomeroomAuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/api/audit-logs`, {
        params: {
          table_name: 'students', // Changed table_name to 'students'
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
      });

      const processedData = response.data.data;

      processedData.sort((a: HomeroomAuditLog, b: HomeroomAuditLog) => {
        return new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime();
      });

      startTransition(() => {
        setHistory(processedData);
        setTotal(response.data.meta.total || 0);
      });

    } catch (error: any) {
      console.error('Error details:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);

      let errorMessage = 'Không thể tải lịch sử học sinh. Vui lòng thử lại sau.';

      if (axios.isAxiosError(error) && error.response) {
        console.error('Server error response:', error.response.data);
        if (error.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          window.location.href = '/authentication/login';
        } else {
          errorMessage = error.response.data?.message ||
            `Lỗi server: ${error.response.status} - ${error.response.statusText}`;
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else {
        errorMessage = error.message || errorMessage;
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

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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

  const renderStudentInfoField = (data: any) => {
    if (data === null || data === undefined) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>null</span>;
    }

    try {
      const studentFields = ['name', 'gender', 'birthday', 'email', 'phone', 'address', 'class_id'];
      const formattedData = Object.entries(data)
        .filter(([key]) => studentFields.includes(key)) // Only show specified student fields
        .map(([key, value]) => {
        if (value === null) return null;

        if (key === 'birthday' && typeof value === 'string') {
            try {
                value = format(new Date(value), 'dd/MM/yyyy', { locale: vi });
            } catch (e) {
                // Keep original value if formatting fails
            }
        }
        if (key === 'gender') {
            const genderMap: { [key: string]: string } = {
                'Nam': 'Nam',
                'Nữ': 'Nữ',
                'Khác': 'Khác'
            };
            value = genderMap[value as string] || value;
        }

        const fieldMap: { [key: string]: string } = {
          'name': 'Họ và tên',
          'gender': 'Giới tính',
          'birthday': 'Ngày sinh',
          'email': 'Email',
          'phone': 'SĐT',
          'address': 'Địa chỉ',
          'class_id': 'ID Lớp',
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
      return <span style={{ color: 'red' }}>Invalid Data</span>;
    }
  };


  const renderPasswordField = (values: any, id: number) => {
    if (values?.generated_password) {
      return (
        <TextField
          type={showPasswords[id] ? 'text' : 'password'}
          value={values.generated_password}
          size="small"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => togglePasswordVisibility(id)}
                  edge="end"
                  sx={{ color: '#fff' }}
                >
                  {showPasswords[id] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#4a4d5e',
              color: '#fff',
              '& fieldset': { borderColor: '#666' },
              '&:hover fieldset': { borderColor: '#888' },
              '&.Mui-focused fieldset': { borderColor: '#fff' },
            },
            '& .MuiInputBase-input': {
                color: '#fff',
            }
          }}
        />
      );
    }
    return null;
  };

  const handleActionTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedActionType(event.target.value as string);
    setPage(0);
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
          Lịch sử chủ nhiệm
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
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Mật khẩu được tạo</TableCell>
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
                    <TableCell sx={{ color: '#fff' }}>{formatDateTime(record.changed_at)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{record.record_id}</TableCell>
                    <TableCell>
                      <Chip
                        label={getActionTypeText(record.action_type)}
                        color={getActionTypeColor(record.action_type) as any}
                        size="small"
                        sx={{ color: '#fff' }}
                      />
                    </TableCell>
                    <TableCell>
                      {record.action_type === 'CREATE' && renderPasswordField(record.new_values, record.id)}
                    </TableCell>
                    <TableCell>
                      {renderStudentInfoField(record.old_values)}
                    </TableCell>
                    <TableCell>
                      {renderStudentInfoField(record.new_values)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ backgroundColor: '#333645' }}>
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

export default HomeroomHistory;
