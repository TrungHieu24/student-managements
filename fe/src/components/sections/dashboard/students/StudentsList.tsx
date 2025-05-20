import { ReactElement, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  ListSubheader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  InputLabel,
  Snackbar,
  Alert
} from '@mui/material';
import DetailStudents from './DetailStudents';
import { StudentData } from '../../../../data/student-data';
import axios from 'axios';
import { Add } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Topbar from '../../../../layouts/main-layout/Topbar/Topbar';
import { useTranslation } from 'react-i18next';

// Bảng mapping lớp học và ID
const CLASS_ID_MAPPING: Record<string, number> = {
  '10A1': 1,
  '10A2': 2,
  '10A3': 3,
  '10A4': 4,
  '10A5': 5,
  '11A1': 6,
  '11A2': 7,
  '11A3': 8,
  '11A4': 9,
  '11A5': 10,
  '12A1': 11,
  '12A2': 12,
  '12A3': 13,
  '12A4': 14,
  '12A5': 15,
};

const StudentsList = (): ReactElement => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [studentsData, setStudentsData] = useState<StudentData[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    setPage(0);
  };

  const [newStudent, setNewStudent] = useState({
    name: '',
    birthday: '',
    email: '',
    phone: '',
    address: '',
    class_id: 0, // ID lớp mặc định
    gender: '',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const filteredStudents = studentsData
  .filter((student) => {
    if (!selectedClass) return true;
    if (['10', '11', '12'].includes(selectedClass)) {
      // Khi chọn khối
      return student.class?.name?.startsWith(selectedClass);
    }
    // Khi chọn lớp cụ thể
    return student.class?.name === selectedClass;
  })
  .filter((student) =>
    student.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    student.email.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get<{ data: StudentData[] }>(
        'http://localhost:8000/api/students',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (Array.isArray(response.data.data)) {
        setStudentsData(response.data.data);
      } else {
        console.error('Dữ liệu không đúng định dạng:', response.data);
      }
    } catch (err) {
      console.error('Lỗi khi gọi API bằng axios:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Lấy ID lớp từ mapping
  const getClassIdByName = (className: string): number => {
    return CLASS_ID_MAPPING[className] || 1; // Mặc định trả về ID lớp 10A1 nếu không tìm thấy
  };

  const handleChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedClass(value);
    setPage(0);
  };

  const handleEditStudent = (student: StudentData) => {
    setEditStudent(student);
    setOpenEditDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedStudentId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/students/${selectedStudentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchStudents();
      setOpenDialog(false);
      setSelectedStudentId(null);
      showSnackbar('Xóa học sinh thành công', 'success');
    } catch (error) {
      console.error('Lỗi khi xoá học sinh:', error);
      showSnackbar('Lỗi khi xóa học sinh', 'error');
    }
  };

  const handleOpenAddDialog = () => {
    // Lấy class_id từ mapping
    const classId = getClassIdByName(selectedClass);
    
    setNewStudent({
      name: '',
      birthday: '',
      email: '',
      phone: '',
      address: '',
      class_id: classId,
      gender: '',
    });
    
    setOpenAddDialog(true);
  };

  const handleNewStudentChange = (field: string, value: string | number) => {
    setNewStudent((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddStudent = async () => {
    console.log('Bắt đầu thêm học sinh với dữ liệu:', newStudent);
    
    if (!newStudent.name) {
      showSnackbar('Vui lòng nhập tên học sinh', 'error');
      return;
    }
    
    if (!newStudent.birthday) {
      showSnackbar('Vui lòng chọn ngày sinh', 'error');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      showSnackbar('Không tìm thấy token xác thực', 'error');
      return;
    }
    
    try {
      console.log('Gửi dữ liệu học sinh:', newStudent); 
      
      const response = await axios.post(
        'http://localhost:8000/api/students',
        newStudent,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log('Phản hồi từ API khi thêm học sinh:', response);
      
      setOpenAddDialog(false);
      fetchStudents();
      showSnackbar('Thêm học sinh thành công', 'success');
    } catch (err: any) {
      console.error('Lỗi khi thêm học sinh:', err);
      const errorMessage = err.response?.data?.message || 'Lỗi không xác định khi thêm học sinh';
      showSnackbar(errorMessage, 'error');
    }
  };

  return (
    <>
      <Topbar
        open={drawerOpen}
        handleDrawerToggle={handleDrawerToggle}
        onSearchChange={handleSearchChange}
      />

      <Paper sx={{ p: { xs: 4, sm: 8 }, height: 1, mt: 12 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
          <Typography variant="h4" color="common.white">
            {t('studentList')}
          </Typography>

          <Box display="flex" gap={2}>
            {selectedClass && !['10', '11', '12'].includes(selectedClass) && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Add fontSize="small" />}
                onClick={handleOpenAddDialog}
                sx={{ py: 0.75, px: 1.5 }}
              >
                {t('addStudent')}
              </Button>
            )}

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={selectedClass}
                onChange={handleChange}
                displayEmpty
                sx={{ color: 'text.disabled', backgroundColor: 'background.paper' }}
              >
                <MenuItem value="">
                  <em>-- {t('allDepartment')} --</em>
                </MenuItem>

                <MenuItem value="10"><strong>{t('grade10')}</strong></MenuItem>
                <MenuItem value="11"><strong>{t('grade11')}</strong></MenuItem>
                <MenuItem value="12"><strong>{t('grade12')}</strong></MenuItem>

                <ListSubheader>{t('grade10')}</ListSubheader>
                {['10A1', '10A2', '10A3', '10A4', '10A5'].map((cls) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
                <ListSubheader>{t('grade11')}</ListSubheader>
                {['11A1', '11A2', '11A3', '11A4', '11A5'].map((cls) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
                <ListSubheader>{t('grade12')}</ListSubheader>
                {['12A1', '12A2', '12A3', '12A4', '12A5'].map((cls) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <DetailStudents
          studentData={filteredStudents}
          onDelete={fetchStudents}
          onEdit={fetchStudents}
          onReload={fetchStudents}
          onOpenEdit={handleEditStudent}
          page={page}
          setPage={setPage}
        />
      </Paper>

      {/* Dialog xác nhận xoá */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{t('deleteConfirmation')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('deleteConfirmation')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            {t('cancel')}
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm học sinh */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addStudent')}</DialogTitle>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('name')}
              value={newStudent.name}
              onChange={(e) => handleNewStudentChange('name', e.target.value)}
              required
              error={!newStudent.name}
              helperText={!newStudent.name ? 'Tên là bắt buộc' : ''}
            />
            <DatePicker
              label={t('birthday')}
              value={newStudent.birthday ? new Date(newStudent.birthday) : null}
              onChange={(newDate) =>
                handleNewStudentChange(
                  'birthday',
                  newDate instanceof Date && !isNaN(newDate.getTime())
                    ? newDate.toISOString().split('T')[0]
                    : ''
                )
              }
              maxDate={new Date()}
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  required: true,
                  error: !newStudent.birthday,
                  helperText: !newStudent.birthday ? 'Ngày sinh là bắt buộc' : ''
                }
              }}
              format="dd/MM/yyyy"
            />
            <FormControl fullWidth>
              <InputLabel>{t('gender')}</InputLabel>
              <Select
                label={t('gender')}
                value={newStudent.gender || ''}
                onChange={(e) => handleNewStudentChange('gender', e.target.value)}
              >
                <MenuItem value="Nam">{t('male')}</MenuItem>
                <MenuItem value="Nữ">{t('female')}</MenuItem>
                <MenuItem value="Khác">{t('other')}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={t('email')}
              value={newStudent.email}
              onChange={(e) => handleNewStudentChange('email', e.target.value)}
            />
            <TextField
              label={t('phone')}
              value={newStudent.phone}
              onChange={(e) => handleNewStudentChange('phone', e.target.value)}
            />
            <TextField
              label={t('address')}
              value={newStudent.address}
              onChange={(e) => handleNewStudentChange('address', e.target.value)}
            />
            <TextField 
              label={t('class')} 
              value={selectedClass} 
              disabled 
              fullWidth 
            />
          </DialogContent>
        </LocalizationProvider>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>{t('cancel')}</Button>
          <Button 
            onClick={handleAddStudent} 
            variant="contained"
            disabled={!newStudent.name || !newStudent.birthday}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar thông báo */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default StudentsList;