import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { useTranslation } from 'react-i18next';

interface ClassData {
  id: string;
  name: string;
  grade: string;
  school_year: string;
  teacher_name: string | null;
  teacher_id?: string | null;
}

interface TeacherData {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`grade-tabpanel-${index}`}
      aria-labelledby={`grade-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ClassOperationResponse {
  message: string;
  class: ClassData;
}

interface DeleteClassResponse {
  message: string;
}


const Class: React.FC = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<ClassData | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editStartYearDate, setEditStartYearDate] = useState<Dayjs | null>(null);

  const [editTeacherId, setEditTeacherId] = useState<string>('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [newClassStartYearDate, setNewClassStartYearDate] = useState<Dayjs | null>(null);


  const [newClassTeacherId, setNewClassTeacherId] = useState<string>('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [classToDeleteName, setClassToDeleteName] = useState('');
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (snackbar.open) {
      timer = setTimeout(() => {
        handleCloseSnackbar();
      }, 1500);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [snackbar.open]);

  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const gradesList = useMemo(() => {
    if (classes.length > 0) {
      const uniqueGrades = Array.from(new Set(classes.map(c => c.grade)))
        .filter(grade => grade !== null && grade !== undefined)
        .sort((a, b) => {
          const strA = String(a);
          const strB = String(b);
          const numA = parseInt(strA.replace(/\D/g, '') || '0');
          const numB = parseInt(strB.replace(/\D/g, '') || '0');
          return numA - numB;
        });
      return uniqueGrades;
    } else {
      return [];
    }
  }, [classes]);

  useEffect(() => {
    if (gradesList.length > 0) {
      const currentGrade = gradesList[selectedTab];
      const currentIndex = gradesList.findIndex(g => g === currentGrade);

      if (currentIndex !== -1) {
        if (currentIndex !== selectedTab) {
             setSelectedTab(currentIndex);
        }
      } else {
        const grade10Index = gradesList.findIndex(g => String(g).includes('10'));
        if (grade10Index !== -1) {
            setSelectedTab(grade10Index);
        } else {
            setSelectedTab(0);
        }
      }
    } else {
       setSelectedTab(0);
    }
  }, [gradesList, selectedTab]);


  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get<ClassData[]>('http://localhost:8000/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const fetchedClasses = response.data;
      setClasses(fetchedClasses);

    } catch (err: any) {
      console.error('Error fetching classes:', err);
      if (err.response && err.response.status === 401) {
        setAuthError(true);
      } else {
        const errorMessage = `Không thể tải danh sách lớp. Lỗi: ${err.response?.data?.message || err.message}`;
        setError(errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      setLoadingTeachers(false);
      return;
    }
    try {
      const response = await axios.get<TeacherData[]>('http://localhost:8000/api/teachers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      setTeachers(response.data);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleEdit = (classItem: ClassData) => {
    setCurrentClass(classItem);
    setEditName(classItem.name);
    setEditGrade(classItem.grade);

    const years = classItem.school_year ? classItem.school_year.split('-') : ['', ''];
    const startYear = parseInt(years[0], 10);
    setEditStartYearDate(isNaN(startYear) ? null : dayjs().set('year', startYear).startOf('year'));


    setEditTeacherId(classItem.teacher_id || '');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setCurrentClass(null);
    setEditName('');
    setEditGrade('');
    setEditStartYearDate(null);
    setEditTeacherId('');
  };

  const handleOpenAddDialog = () => {
    let suggestedGrade = '';
    if (gradesList.length > 0 && selectedTab >= 0 && selectedTab < gradesList.length) {
      suggestedGrade = gradesList[selectedTab];
      setNewClassGrade(suggestedGrade);
    } else {
      setNewClassGrade('');
    }

    let suggestedClassName = '';
    if (suggestedGrade) {
      const classesInSameGrade = classes.filter(cls => cls.grade === suggestedGrade);

      let maxNumber = 0;
      const pattern = new RegExp(`^${suggestedGrade}A(\\d+)$`);

      classesInSameGrade.forEach(cls => {
        const match = cls.name.match(pattern);
        if (match && match[1]) {
          const number = parseInt(match[1], 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      suggestedClassName = `${suggestedGrade}A${nextNumber}`;
    }

    const currentYearDayjs = dayjs().startOf('year');

    setNewClassName(suggestedClassName);
    setNewClassStartYearDate(currentYearDayjs);
    setNewClassTeacherId('');
    setAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setNewClassName('');
    setNewClassGrade('');
    setNewClassStartYearDate(null);
    setNewClassTeacherId('');
  };

  const handleTeacherChange = (event: SelectChangeEvent) => {
    setEditTeacherId(event.target.value);
  };

  const handleNewTeacherChange = (event: SelectChangeEvent) => {
    setNewClassTeacherId(event.target.value);
  };

  const handleSaveEdit = async () => {
    if (!currentClass) return;

    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      return;
    }

    const startYearNumber = editStartYearDate ? editStartYearDate.year() : NaN;
    const currentYear = dayjs().year(); // Lấy năm hiện tại

    // Kiểm tra validation
    if (!editName || !editStartYearDate || isNaN(startYearNumber) || startYearNumber < currentYear) {
         showSnackbar('Vui lòng nhập đầy đủ Tên lớp và chọn Năm bắt đầu hợp lệ (không được là năm trong quá khứ).', 'warning');
         return;
    }

    const startYearString = String(startYearNumber);
    const endYear = startYearNumber + 3;
    const schoolYearString = `${startYearString}-${endYear}`;


    try {
      const requestData = {
        name: editName,
        school_year: schoolYearString,
        teacher_id: editTeacherId || null
      };
      const response = await axios.put<ClassOperationResponse>(`http://localhost:8000/api/classes/${currentClass.id}`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const updatedClass = response.data.class;

      setClasses(prevClasses =>
        prevClasses.map(c =>
          c.id === currentClass.id
            ? updatedClass
            : c
        )
      );

      handleCloseEditDialog();
      showSnackbar('Cập nhật thông tin lớp thành công.', 'success');

    } catch (err: any) {
      console.error('Error updating class:', err);
      showSnackbar(`Không thể cập nhật thông tin lớp. Lỗi: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleAddClass = async () => {
    const startYearNumber = newClassStartYearDate ? newClassStartYearDate.year() : NaN;
    const currentYear = dayjs().year(); // Lấy năm hiện tại

    // Kiểm tra validation
    if (!newClassName || !newClassGrade || !newClassStartYearDate || isNaN(startYearNumber) || startYearNumber < currentYear) {
      showSnackbar('Vui lòng nhập đầy đủ Tên lớp, Khối và chọn Năm bắt đầu hợp lệ (không được là năm trong quá khứ).', 'warning');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      return;
    }

    const startYearString = String(startYearNumber);
    const endYear = startYearNumber + 3;
    const schoolYearString = `${startYearString}-${endYear}`;

    try {
      const requestData = {
        name: newClassName,
        grade: newClassGrade,
        school_year: schoolYearString,
        teacher_id: newClassTeacherId || null
      };
      const response = await axios.post<ClassOperationResponse>('http://localhost:8000/api/classes', requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const newClass = response.data.class;

      const newClassGradeValue = newClass.grade;

      setClasses(prevClasses => {
        const updatedClasses = [...prevClasses, newClass];
        return updatedClasses;
      });

      handleCloseAddDialog();
      showSnackbar('Thêm lớp mới thành công.', 'success');

       const currentGradesAfterAdd = Array.from(new Set([...classes, newClass].map(c => c.grade)))
         .filter(grade => grade !== null && grade !== undefined)
         .sort((a, b) => {
           const strA = String(a);
           const strB = String(b);
           const numA = parseInt(strA.replace(/\D/g, '') || '0');
           const numB = parseInt(strB.replace(/\D/g, '') || '0');
           return numA - numB;
         });

       const newGradeIndex = currentGradesAfterAdd.findIndex(g => g === newClassGradeValue);
        if (newGradeIndex !== -1) {
            setSelectedTab(newGradeIndex);
        } else if (currentGradesAfterAdd.length > 0) {
             setSelectedTab(0);
        } else {
             setSelectedTab(0);
        }


    } catch (err: any) {
      console.error('Error adding new class:', err);
      showSnackbar(`Không thể thêm lớp mới. Lỗi: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleOpenDeleteConfirmDialog = (id: string) => {
    const classToDelete = classes.find(c => c.id === id);
    const className = classToDelete ? classToDelete.name : 'lớp này';
    setClassToDeleteName(className);
    setIdToDelete(id);
    setShowDeleteConfirmDialog(true);
  };

  const handleCloseDeleteConfirmDialog = () => {
    setShowDeleteConfirmDialog(false);
    setClassToDeleteName('');
    setIdToDelete(null);
  };

  const confirmDeletion = async () => {
    if (!idToDelete) return;
    setDeleteLoading(true);

    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      setDeleteLoading(false);
      handleCloseDeleteConfirmDialog();
      return;
    }

    try {
      await axios.delete<DeleteClassResponse>(`http://localhost:8000/api/classes/${idToDelete}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      setClasses(prev => prev.filter(item => item.id !== idToDelete));

      handleCloseDeleteConfirmDialog();
      showSnackbar('Xóa lớp thành công.', 'success');

    } catch (err: any) {
      console.error('Error deleting class:', err);
      showSnackbar(`Không thể xóa lớp. Lỗi: ${err.response?.data?.message || err.message}`, 'error');
      handleCloseDeleteConfirmDialog();
    } finally {
       setDeleteLoading(false);
    }
  };


  const handleDelete = (id: string) => {
       handleOpenDeleteConfirmDialog(id);
  };


  const assignedTeacherIds = useMemo(() => {
    return new Set(
      classes
        .filter(c => c.teacher_id !== null && c.id !== currentClass?.id)
        .map(c => c.teacher_id) as string[]
    );
  }, [classes, currentClass]);

  const availableTeachers = useMemo(() => {
    if (currentClass) {
      return teachers.filter(teacher =>
        !assignedTeacherIds.has(teacher.id) || teacher.id === currentClass.teacher_id
      );
    }
    return teachers.filter(teacher => !assignedTeacherIds.has(teacher.id));
  }, [teachers, assignedTeacherIds, currentClass]);

  const filteredClasses = useMemo(() => {
    if (gradesList.length > 0 && selectedTab >= 0 && selectedTab < gradesList.length) {
        const currentGrade = gradesList[selectedTab];
        return classes.filter(c => c.grade === currentGrade);
    }
    return [];
  }, [classes, selectedTab, gradesList]);

   const editStartYearString = useMemo(() => {
       return editStartYearDate ? editStartYearDate.year().toString() : '';
   }, [editStartYearDate]);

  const editEndYear = useMemo(() => {
      const startYearNumber = parseInt(editStartYearString, 10);
      return isNaN(startYearNumber) ? '' : String(startYearNumber + 3);
  }, [editStartYearString]);


   const newClassStartYearString = useMemo(() => {
       return newClassStartYearDate ? newClassStartYearDate.year().toString() : '';
   }, [newClassStartYearDate]);

   const newClassEndYear = useMemo(() => {
      const startYearNumber = parseInt(newClassStartYearString, 10);
      return isNaN(startYearNumber) ? '' : String(startYearNumber + 3);
  }, [newClassStartYearString]);

  const currentYearStart = useMemo(() => dayjs().startOf('year'), []);


  if (authError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('needLoginToViewClassList')}
          <Button
            color="inherit"
            size="small"
            onClick={() => window.location.href = '/login'}
            sx={{ ml: 2 }}
          >
            {t('login')}
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        {t('classListTitle')}
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 2, bgcolor: '#fff4f4' }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={fetchClasses} sx={{ mt: 1 }} variant="outlined">
            {t('retry')}
          </Button>
        </Paper>
      ) : (
        <>
          <Box sx={{
            display: 'flex',
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              aria-label="Tabs khối lớp"
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flexGrow: 1 }}
            >
              {gradesList.map((grade, index) => (
                <Tab label={t('gradeTab', { grade })} key={index} />
              ))}
            </Tabs>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{ ml: 2 }}
            >
              {t('addNewClass')}
            </Button>
          </Box>

          {gradesList.length > 0 ? (
               gradesList.map((grade, index) => (
                 <TabPanel value={selectedTab} index={index} key={grade}>
                    <TableContainer component={Paper}>
                     <Table>
                       <TableHead>
                         <TableRow>
                            <TableCell><b>{t('classId')}</b></TableCell>
                            <TableCell><b>{t('className')}</b></TableCell>
                            <TableCell><b>{t('grade')}</b></TableCell>
                            <TableCell><b>{t('schoolYear')}</b></TableCell>
                            <TableCell><b>{t('homeroomTeacher')}</b></TableCell>
                            <TableCell align="center"><b>{t('actions')}</b></TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {filteredClasses
                            .filter(c => c.grade === grade)
                            .map((row) => (
                              <TableRow key={row.id}>
                                 <TableCell>{row.id}</TableCell>
                                 <TableCell>{row.name}</TableCell>
                                 <TableCell>{row.grade}</TableCell>
                                 <TableCell>{row.school_year}</TableCell>
                                 <TableCell>{row.teacher_name || t('notAssigned')}</TableCell>
                                 <TableCell align="center">
                                    <IconButton color="primary" onClick={() => handleEdit(row)}>
                                       <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleOpenDeleteConfirmDialog(row.id)}>
                                       <DeleteIcon />
                                    </IconButton>
                                 </TableCell>
                              </TableRow>
                         ))}
                         {filteredClasses.filter(c => c.grade === grade).length === 0 && (
                            <TableRow>
                               <TableCell colSpan={6} align="center">
                                  {t('noClassInGrade', { grade })}
                               </TableCell>
                            </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </TabPanel>
               ))
           ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                 <Typography variant="body1">{t('noClassData')}</Typography>
              </Box>
           )}

        </>
      )}

      {/* Dialog Chỉnh sửa thông tin lớp */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa thông tin lớp</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('className')}
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            margin="dense"
            label={t('grade')}
            fullWidth
            variant="outlined"
            value={editGrade}
            disabled={true}
            InputProps={{
              readOnly: true,
            }}
          />

           <DatePicker
               views={['year']}
               label={t('startYear')}
               value={editStartYearDate}
               onChange={(newValue) => setEditStartYearDate(newValue)}
               slotProps={{ textField: { fullWidth: true, margin: 'dense', variant: 'outlined' } }}
               minDate={currentYearStart}
           />

           <TextField
            margin="dense"
            label={t('endYear')}
            fullWidth
            variant="outlined"
            value={editEndYear}
            disabled={true}
            InputProps={{
              readOnly: true,
            }}
          />


          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-teacher-label">{t('homeroomTeacher')}</InputLabel>
            <Select
              labelId="edit-teacher-label"
              value={editTeacherId}
              label={t('homeroomTeacher')}
              onChange={handleTeacherChange}
            >
              <MenuItem value="">
                <em>{t('noSelect')}</em>
              </MenuItem>
              {availableTeachers.map((teacher) => (
                <MenuItem value={teacher.id} key={teacher.id}>
                  {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {loadingTeachers && (
            <Box display="flex" justifyContent="center" my={1}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('cancel')}</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">{t('save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Thêm lớp mới */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addNewClass')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('className')}
            fullWidth
            variant="outlined"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <TextField
            margin="dense"
            label={t('grade')}
            fullWidth
            variant="outlined"
            value={newClassGrade}
            disabled={true}
            InputProps={{
              readOnly: true,
            }}
          />
           <DatePicker
               views={['year']}
               label={t('startYear')}
               value={newClassStartYearDate}
               onChange={(newValue) => setNewClassStartYearDate(newValue)}
               slotProps={{ textField: { fullWidth: true, margin: 'dense', variant: 'outlined' } }}
               minDate={currentYearStart}
           />
           <TextField
            margin="dense"
            label={t('endYear')}
            fullWidth
            variant="outlined"
            value={newClassEndYear}
            disabled={true}
            InputProps={{
              readOnly: true,
            }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="new-teacher-label">{t('homeroomTeacher')}</InputLabel>
            <Select
              labelId="new-teacher-label"
              value={newClassTeacherId}
              label={t('homeroomTeacher')}
              onChange={handleNewTeacherChange}
            >
              <MenuItem value="">
                <em>{t('noSelect')}</em>
              </MenuItem>
              {availableTeachers.map((teacher) => (
                <MenuItem value={teacher.id} key={teacher.id}>
                  {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {loadingTeachers && (
            <Box display="flex" justifyContent="center" my={1}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>{t('cancel')}</Button>
          <Button onClick={handleAddClass} variant="contained" color="primary">{t('add')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteConfirmDialog}
        onClose={handleCloseDeleteConfirmDialog}
      >
        <DialogTitle>{t('deleteClassTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('deleteClassConfirmation', { className: classToDeleteName })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirmDialog}>{t('cancel')}</Button>
          <Button onClick={confirmDeletion} color="error" variant="contained" disabled={deleteLoading}>
               {deleteLoading ? <CircularProgress size={24} /> : t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={1500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
     </LocalizationProvider>
  );
};

export default Class;