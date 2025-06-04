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
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { SelectChangeEvent } from '@mui/material/Select';

// Add axios interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface TeacherHistory {
  id: number;
  table_name: string;
  record_id: number;
  action_type: string;
  user_id: number;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  changed_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface ApiResponse {
  data: TeacherHistory[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const TeacherHistory: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<TeacherHistory[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{[key: string]: string}>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [userRole, setUserRole] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [classes, setClasses] = useState<{[key: string]: string}>({});

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<ApiResponse>(`/api/teacher-history`, {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          action_type: selectedActionType,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
      });

      // Process data to remove duplicates and sanitize sensitive data
      const processedData = response.data.data.reduce((acc: TeacherHistory[], curr: TeacherHistory) => {
        const existingRecord = acc.find(
          (record) =>
            record.record_id === curr.record_id &&
            record.action_type === curr.action_type &&
            record.changed_at === curr.changed_at
        );

        if (existingRecord && curr.action_type === 'CREATE') {
          existingRecord.new_values = {
            ...existingRecord.new_values,
            ...curr.new_values
          };
          return acc;
        }

        return [...acc, curr];
      }, []);

      // Sort by changed_at in descending order
      processedData.sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );

      // Sanitize passwords and filter for changed fields in UPDATE actions
      const sanitizedData = processedData.map((record: TeacherHistory) => {
        const sanitized = { ...record };

        // Explicitly remove updated_at from old_values and new_values for all action types
        if (sanitized.old_values && typeof sanitized.old_values === 'object') {
          delete sanitized.old_values.updated_at;
        }
        if (sanitized.new_values && typeof sanitized.new_values === 'object') {
          delete sanitized.new_values.updated_at;
        }

        if (sanitized.action_type === 'UPDATE') {
          const oldVals = sanitized.old_values || {};
          const newVals = sanitized.new_values || {};
          const changedOldValues: { [key: string]: any } = {};
          const changedNewValues: { [key: string]: any } = {};

          // Always include 'subjects' and 'teaching_assignments' if they exist, regardless of change
          if ('subjects' in oldVals) changedOldValues.subjects = oldVals.subjects;
          if ('subjects' in newVals) changedNewValues.subjects = newVals.subjects;
          if ('teaching_assignments' in oldVals) changedOldValues.teaching_assignments = oldVals.teaching_assignments;
          if ('teaching_assignments' in newVals) changedNewValues.teaching_assignments = newVals.teaching_assignments;

          // Collect all unique keys from both old and new values
          const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);

          for (const key of allKeys) {
            // Skip 'subjects' and 'teaching_assignments' as they are handled above
            if (key === 'subjects' || key === 'teaching_assignments') {
                continue;
            }

            const oldValue = oldVals[key];
            const newValue = newVals[key];

            // Deep comparison for objects/arrays, otherwise strict equality for primitives
            let hasChanged = false;
            if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
                // If both are objects/arrays, compare their stringified versions
                hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
            } else {
                // For primitive types (string, number, boolean, null, undefined)
                hasChanged = oldValue !== newValue;
            }

            // Also consider if a key exists in one but not the other
            if (hasChanged || !(key in oldVals) || !(key in newVals)) {
                if (key in oldVals) changedOldValues[key] = oldValue;
                if (key in newVals) changedNewValues[key] = newValue;
            }
          }
          sanitized.old_values = changedOldValues;
          sanitized.new_values = changedNewValues;

        } else { // For CREATE and DELETE, sanitize all values
          if (sanitized.old_values) {
            const oldValues = { ...sanitized.old_values };
            if (oldValues.password) oldValues.password = '********';
            if (oldValues.remember_token) oldValues.remember_token = '********';
            sanitized.old_values = oldValues;
          }

          if (sanitized.new_values) {
            const newValues = { ...sanitized.new_values };
            if (newValues.password) newValues.password = '********';
            if (newValues.remember_token) newValues.remember_token = '********';
            sanitized.new_values = newValues;
          }
        }

        // Special handling for generated_password, keep it for display in password field only if CREATE
        if (sanitized.action_type === 'CREATE' && record.new_values?.generated_password) {
            sanitized.new_values = { ...sanitized.new_values, generated_password: record.new_values.generated_password };
        } else if (sanitized.new_values?.generated_password) {
            // Remove generated_password for other action types or if not present in new_values for CREATE
            delete sanitized.new_values.generated_password;
        }

        return sanitized;
      });

      setHistory(sanitizedData);
      setTotal(response.data.meta.total || 0);

      // Add logging for inspection
      console.log('Sanitized History Data:', sanitizedData);
      sanitizedData.forEach(record => {
        if (record.action_type === 'UPDATE') {
          console.log(`Record ID: ${record.record_id}, Action: ${record.action_type}`);
          console.log('Old Values (Teaching Assignments):', record.old_values?.teaching_assignments);
          console.log('New Values (Teaching Assignments):', record.new_values?.teaching_assignments);
          console.log('Old Values (Subjects):', record.old_values?.subjects);
          console.log('New Values (Subjects):', record.new_values?.subjects);
        }
      });

    } catch (error: any) {
      console.error('Error details:', error);
      let errorMessage = 'Không thể tải lịch sử giáo viên. Vui lòng thử lại sau.';

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          window.location.href = '/authentication/login';
        } else {
          errorMessage = error.response.data?.message || 
                        `Lỗi server: ${error.response.status} - ${error.response.statusText}`;
        }
      } else if (error.request) {
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
    const initializeData = async () => {
      setLoading(true);
      try {
        // Fetch subjects and classes first
        const [subjectsRes, classesRes] = await Promise.all([
          axios.get('/api/subjects', {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              "ngrok-skip-browser-warning": "true"
            },
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
          }),
          axios.get('/api/classes', {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              "ngrok-skip-browser-warning": "true"
            },
            baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
          })
        ]);

        const subjectMap: {[key: string]: string} = {};
        if (Array.isArray(subjectsRes.data)) {
          subjectsRes.data.forEach((subject: any) => {
            subjectMap[subject.id] = subject.name;
          });
        } else if (subjectsRes.data.data && Array.isArray(subjectsRes.data.data)) {
          subjectsRes.data.data.forEach((subject: any) => {
            subjectMap[subject.id] = subject.name;
          });
        }
        setSubjects(subjectMap);

        const classMap: {[key: string]: string} = {};
        if (Array.isArray(classesRes.data)) {
          classesRes.data.forEach((cls: any) => {
            classMap[cls.id] = cls.name;
          });
        } else if (classesRes.data.data && Array.isArray(classesRes.data.data)) {
          classesRes.data.data.forEach((cls: any) => {
            classMap[cls.id] = cls.name;
          });
        }
        setClasses(classMap);

        // Then fetch user info
        await axios.get('/api/user', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            "ngrok-skip-browser-warning": "true"
          },
          baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
        }).then(response => {
          if (response.data && response.data.role) {
            setUserRole(response.data.role);
          }
        });

        // Finally, fetch history
        await fetchHistory();

      } catch (e: any) {
        console.error("Error initializing data:", e);
        let errorMessage = 'Lỗi khi tải dữ liệu khởi tạo.';
        if (e.response && e.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          window.location.href = '/authentication/login';
        } else {
          errorMessage = e.response?.data?.message || e.message || errorMessage;
        }
        setError(errorMessage);
        setHistory([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
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

  const formatSubjectIds = (subjectIds: any) => {
    if (!subjectIds) return '';
    
    // Handle both string and array formats
    const ids = typeof subjectIds === 'string' ? subjectIds.split(',') : subjectIds;
    
    return ids
      .map((id: any) => {
        const trimmedId = String(id).trim();
        const subjectName = subjects[trimmedId];
        return subjectName ? t(`subjectName.${subjectName}`) : trimmedId;
      })
      .filter(Boolean)
      .join(', ');
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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

  const renderJsonField = (data: any) => {
    if (data === null || data === undefined) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>null</span>;
    }
    
    try {
      const sanitizedData = { ...data };
      if (sanitizedData.password) {
        sanitizedData.password = '********';
      }
      if (sanitizedData.remember_token) {
        sanitizedData.remember_token = '********';
      }
      // Don't remove generated_password here - it's handled separately in the password field
      if (sanitizedData.generated_password) {
        delete sanitizedData.generated_password;
      }

      // Remove duplicate fields
      const uniqueFields = new Set();
      const formattedData = Object.entries(sanitizedData)
        .filter(([key, value]) => {
          // Exclude 'updated_at' from display in old/new values
          if (key === 'updated_at') {
            return false;
          }
          if (uniqueFields.has(key)) return false;
          uniqueFields.add(key);
          return value !== null;
        })
        .map(([key, value]) => {
          if (key.includes('_at') && typeof value === 'string') {
            try {
              value = format(new Date(value), 'HH:mm:ss dd/MM/yyyy', { locale: vi });
            } catch (e) {
              // If date parsing fails, keep original value
            }
          }

          if (typeof value === 'boolean') {
            value = value ? 'Có' : 'Không';
          }

          // Handle subjects field
          if (key === 'subjects') {
            value = formatSubjectIds(value);
          }

          // Handle teaching_assignments field
          if (key === 'teaching_assignments') {
            const assignmentsArray = Array.isArray(value) ? value : [];

            console.log('Rendering teaching_assignments. Value:', assignmentsArray);
            console.log('Current classes map:', classes);
            console.log('Current subjects map:', subjects);

            // Add detailed logging for each assignment
            assignmentsArray.forEach((assignment, idx) => {
              console.log(`Assignment ${idx}:`, assignment);
              console.log(`  Class ID: ${assignment.class_id}, Class Name: ${classes[assignment.class_id]}`);
              console.log(`  Subject ID: ${assignment.subject_id}, Subject Name: ${subjects[assignment.subject_id]}`);
            });

            return (
              <div key={key} style={{ marginBottom: '4px' }}>
                <strong style={{ color: '#aaa' }}>Phân công giảng dạy:</strong>
                {assignmentsArray.length > 0 ? (
                  assignmentsArray.map((assignment: any, index: number) => (
                    <div key={index} style={{ marginLeft: '10px', marginTop: '5px', padding: '5px', border: '1px solid #666', borderRadius: '4px', backgroundColor: '#3a3d4f' }}>
                      <div style={{ color: '#fff' }}>
                        Lớp: <span style={{ fontWeight: 'bold' }}>{classes[assignment.class_id] || assignment.class_id}</span>
                      </div>
                      <div style={{ color: '#fff' }}>
                        Môn: <span style={{ fontWeight: 'bold' }}>{subjects[assignment.subject_id] || assignment.subject_id}</span>
                      </div>
                      <div style={{ color: '#fff' }}>
                        Năm học: {assignment.school_year}
                      </div>
                      <div style={{ color: '#fff' }}>
                        Học kỳ: {assignment.semester}
                      </div>
                      {assignment.is_homeroom_teacher !== undefined && (
                        <div style={{ color: '#fff' }}>
                          GVCN: {assignment.is_homeroom_teacher ? 'Có' : 'Không'}
                        </div>
                      )}
                      {assignment.weekly_periods !== undefined && (
                        <div style={{ color: '#fff' }}>
                          Tiết/tuần: {assignment.weekly_periods}
                        </div>
                      )}
                      {assignment.notes && (
                        <div style={{ color: '#fff' }}>
                          Ghi chú: {assignment.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#999', fontStyle: 'italic' }}>Không có phân công</span>
                )}
              </div>
            );
          }

          const fieldMap: { [key: string]: string } = {
            'name': 'Tên',
            'email': 'Email',
            'phone': 'Số điện thoại',
            'address': 'Địa chỉ',
            'birthday': 'Ngày sinh',
            'created_at': 'Ngày tạo',
            'updated_at': 'Ngày cập nhật',
            'id': 'ID',
            'subjects': 'Môn học',
            'teaching_assignments': 'Phân công giảng dạy',
            'gender': 'Giới tính'
          };

          return (
            <div key={key} style={{ marginBottom: '4px' }}>
              <strong style={{ color: '#aaa' }}>{fieldMap[key] || key}:</strong>{' '}
              <span style={{ color: '#fff' }}>{String(value)}</span>
            </div>
          );
        })
        .filter(Boolean);

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
          Lịch sử giáo viên
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchHistory}
          disabled={loading}
          sx={{ color: '#fff', borderColor: '#fff' }}
        >
          Làm mới
        </Button>
      </Box>

      <FormControl sx={{ minWidth: 120, mb: 2, bgcolor: '#333645', borderRadius: '4px' }} size="small">
        <InputLabel sx={{ color: '#fff' }}>Hành động</InputLabel>
        <Select
          value={selectedActionType}
          onChange={handleActionTypeChange}
          label="Hành động"
          sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#666' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#888' }, '.MuiSvgIcon-root': { color: '#fff' } }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="CREATE">Tạo mới</MenuItem>
          <MenuItem value="UPDATE">Cập nhật</MenuItem>
          <MenuItem value="DELETE">Xóa</MenuItem>
        </Select>
      </FormControl>

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
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Mật khẩu được tạo</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Thông tin cũ</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>Thông tin mới</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>IP</TableCell>
                <TableCell sx={{ backgroundColor: '#21222D', color: '#fff', fontWeight: 'bold' }}>User Agent</TableCell>
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
                    <TableCell sx={{ color: '#fff' }}>
                      {record.user ? (
                        <Tooltip title={`${record.user.email} (${record.user.role})`}>
                          <span>{record.user.name}</span>
                        </Tooltip>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Unknown User</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.action_type === 'CREATE' && renderPasswordField(record.new_values, record.id)}
                    </TableCell>
                    <TableCell>
                      {renderJsonField(record.old_values)}
                    </TableCell>
                    <TableCell>
                      {renderJsonField(record.new_values)}
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      <Tooltip title={record.ip_address}>
                        <span>{record.ip_address}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      <Tooltip title={record.user_agent}>
                        <div style={{ 
                          maxWidth: '200px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {record.user_agent}
                        </div>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ backgroundColor: '#333645' }}>
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

export default TeacherHistory;