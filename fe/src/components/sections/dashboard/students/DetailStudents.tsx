import { ReactElement, useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { StudentData } from 'data/student-data';
import { Edit, Delete, Assessment, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

interface Props {
  studentData: StudentData[];
  onReload: () => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onOpenEdit: (student: StudentData) => void;
  page: number;
  setPage: (newPage: number) => void;
}

interface ScoreData {
  id: number;
  student_id: number;
  subject_id?: number;
  subject?: string;
  subject_name?: string;
  score: number;
  type: string;
  semester?: string;
  year?: string;
}

interface ClassData {
  id: number;
  name: string;
}

const grades = ['10', '11', '12'];

const scoreTypes = [
  { value: 'mid1',label: 'Giữa Kỳ 1', labelKey: 'mid1ScoreLabel', fallback: 'Giữa Kỳ 1'},
  { value: 'final1',label: 'Cuối Kỳ 1', labelKey: 'final1ScoreLabel', fallback: 'Cuối Kỳ 1'},
  { value: 'mid2',label: 'Giữa Kỳ 2', labelKey: 'mid2ScoreLabel', fallback: 'Giữa Kỳ 2'},
  { value: 'final2',label: 'Cuối Kỳ 2', labelKey: 'final2ScoreLabel', fallback: 'Cuối Kỳ 2'},
];

const getNameParts = (fullName: string): string[] => {
  return fullName.trim().split(/\s+/);
};

const DetailStudents = ({ studentData, onReload, page, setPage }: Props): ReactElement => {
  const rowsPerPage = 10;
  const { t } = useTranslation();

  const translatedScoreTypes = scoreTypes.map(type => ({
    ...type,
    label: t(type.labelKey) || type.fallback}));

  const [openDialog, setOpenDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [openScoreDialog, setOpenScoreDialog] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [openAddScoreDialog, setOpenAddScoreDialog] = useState(false);
  const [newScoreData, setNewScoreData] = useState({
    subject_id: '',
    score: '',
    type: ''
  });
  const [addingScore, setAddingScore] = useState(false);
  const [addScoreError, setAddScoreError] = useState<string | null>(null);

  const [openEditScoreDialog, setOpenEditScoreDialog] = useState(false);
  const [scoreToEdit, setScoreToEdit] = useState<ScoreData | null>(null);
  const [editingScore, setEditingScore] = useState(false);
  const [editScoreError, setEditScoreError] = useState<string | null>(null);

  const [openDeleteScoreConfirm, setOpenDeleteScoreConfirm] = useState(false);
  const [scoreToDeleteId, setScoreToDeleteId] = useState<number | null>(null);
  const [deletingScore, setDeletingScore] = useState(false);
  const [deleteScoreError, setDeleteScoreError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingClasses(false);
        return;
      }
      
      const response = await axios.get('http://localhost:8000/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setClasses(response.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleOpenScoreDialog = async (student: StudentData) => {
    setCurrentStudent(student);
    setOpenScoreDialog(true);
    fetchScores(student.id);
    fetchSubjects();
  };

  const handleCloseScoreDialog = () => {
    setOpenScoreDialog(false);
    setCurrentStudent(null);
    setScores([]);
    setScoreError(null);
  };

  const handleOpenAddScoreDialog = () => {
    setNewScoreData({ subject_id: '', score: '', type: '' });
    setAddScoreError(null);
    setOpenAddScoreDialog(true);
  };

  const handleCloseAddScoreDialog = () => {
    setOpenAddScoreDialog(false);
  };

  const handleOpenEditScoreDialog = (scoreData: ScoreData) => {
    setScoreToEdit(scoreData);
    setEditScoreError(null);
    setOpenEditScoreDialog(true);
  };

  const handleCloseEditScoreDialog = () => {
    setOpenEditScoreDialog(false);
    setScoreToEdit(null);
  };

  const handleOpenDeleteScoreConfirm = (scoreId: number) => {
    setScoreToDeleteId(scoreId);
    setDeleteScoreError(null);
    setOpenDeleteScoreConfirm(true);
  };

  const handleCloseDeleteScoreConfirm = () => {
    setOpenDeleteScoreConfirm(false);
    setScoreToDeleteId(null);
  };

  const handleNewScoreInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setNewScoreData({ ...newScoreData, [name as string]: value });
  };

  const handleEditScoreInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setScoreToEdit(prev => prev ? { ...prev, [name as string]: value } : null);
  };

  const fetchScores = async (studentId: number) => {
    if (!studentId) return;
    setLoadingScores(true);
    setScoreError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setScoreError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
        setLoadingScores(false);
        return;
      }
      const response = await axios.get(`http://localhost:8000/api/scores/${studentId}`, {
         headers: { Authorization: `Bearer ${token}` },
      });

      setScores(response.data);
    } catch (err) {
      console.error("Error fetching scores:", err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404) {
          setScores([]);
          setScoreError('Không tìm thấy điểm số cho học sinh này.');
        } else {
          setScoreError('Lỗi khi tải điểm số.');
        }
      } else {
        setScoreError('Lỗi không xác định khi tải điểm.');
      }
    } finally {
      setLoadingScores(false);
    }
  };

  const fetchSubjects = async () => {
    if (subjects.length > 0) return;
    setLoadingSubjects(true);
    setSubjectError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSubjectError('Lỗi xác thực khi tải môn học.');
        setLoadingSubjects(false);
        return;
      }
      const response = await axios.get(`http://localhost:8000/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setSubjectError('Không thể tải danh sách môn học.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSaveNewScore = async () => {
    if (!currentStudent?.id || !newScoreData.subject_id || !newScoreData.type || newScoreData.score === '') {
      setAddScoreError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setAddingScore(true);
    setAddScoreError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAddScoreError('Phiên đăng nhập hết hạn.');
        setAddingScore(false);
        return;
      }
      const dataToSend = {
        student_id: currentStudent.id,
        subject_id: parseInt(newScoreData.subject_id as string),
        score: parseFloat(newScoreData.score),
        type: newScoreData.type
      };
      await axios.post('http://localhost:8000/api/scores', dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleCloseAddScoreDialog();
      fetchScores(currentStudent.id);
    } catch (err) {
      console.error("Error adding score:", err.response || err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.data && err.response.data.errors) {
          setAddScoreError("Lỗi nhập liệu: " + Object.values(err.response.data.errors).join(', '));
        } else if (err.response.data && err.response.data.message) {
          setAddScoreError("Lỗi: " + err.response.data.message);
        } else {
          setAddScoreError("Lỗi khi thêm điểm.");
        }
      } else {
        setAddScoreError("Lỗi không xác định khi thêm điểm.");
      }
    } finally {
      setAddingScore(false);
    }
  };

  const handleSaveEditedScore = async () => {
    if (!scoreToEdit?.id || scoreToEdit.score === '') {
      setEditScoreError('Điểm số không hợp lệ.');
      return;
    }
    setEditingScore(true);
    setEditScoreError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEditScoreError('Phiên đăng nhập hết hạn.');
        setEditingScore(false);
        return;
      }
      const dataToSend = {
        subject_id: scoreToEdit.subject_id,
        type: scoreToEdit.type,
        score: parseFloat(scoreToEdit.score as any),
      }
      await axios.put(`http://localhost:8000/api/scores/${scoreToEdit.id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleCloseEditScoreDialog();
      fetchScores(currentStudent!.id);
    } catch (err) {
      console.error("Error updating score:", err.response || err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.data && err.response.data.errors) {
          setEditScoreError("Lỗi nhập liệu: " + Object.values(err.response.data.errors).join(', '));
        } else if (err.response.data && err.response.data.message) {
          setEditScoreError("Lỗi: " + err.response.data.message);
        } else {
          setEditScoreError("Lỗi khi cập nhật điểm.");
        }
      } else {
        setEditScoreError("Lỗi không xác định khi cập nhật điểm.");
      }
    } finally {
      setEditingScore(false);
    }
  };

  const handleConfirmDeleteScore = async () => {
    if (!scoreToDeleteId) return;
    setDeletingScore(true);
    setDeleteScoreError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDeleteScoreError('Phiên đăng nhập hết hạn.');
        setDeletingScore(false);
        return;
      }
      await axios.delete(`http://localhost:8000/api/scores/${scoreToDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleCloseDeleteScoreConfirm();
      fetchScores(currentStudent!.id);
    } catch (err) {
      console.error("Error deleting score:", err.response || err);
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
        setDeleteScoreError("Lỗi: " + err.response.data.message);
      } else {
        setDeleteScoreError("Lỗi không xác định khi xóa điểm.");
      }
    } finally {
      setDeletingScore(false);
    }
  };

  const groupScoresBySubject = (scores: ScoreData[]) => {
    const grouped: Record<string, Record<string, ScoreData>> = {};
    scores.forEach(score => {
      const subjectName = score.subject_name || score.subject || 'Unknown Subject';

      if (!grouped[subjectName]) {
        grouped[subjectName] = {};
      }
      grouped[subjectName][score.type] = score;
    });
    return grouped;
  };

  const scoresBySubjectForDisplay = groupScoresBySubject(scores);

  const handleOpenDialog = (student: StudentData) => {
    setStudentToDelete(student);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.delete(`http://localhost:8000/api/students/${studentToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onReload();
      handleCloseDialog();
    } catch (err) {
      console.error('Lỗi khi xóa sinh viên:', err);
    }
  };

  const handleEdit = (student: StudentData) => {
    setEditStudent(student);
    setSelectedGrade(student.class?.name ? student.class.name.substring(0, 2) : '');
    setOpenEditDialog(true);
    fetchClasses();
  };

  const handleEditChange = (field: keyof StudentData, value: any) => {
    if (field === 'birthday' && value instanceof Date && !isNaN(value.getTime())) {
      setEditStudent((prev) => prev ? { ...prev, [field]: format(value, 'yyyy-MM-dd') } : null);
    } else if (field === 'class_id') {
      const selectedClass = classes.find(c => c.id === value);
      setEditStudent((prev) => 
        prev ? { 
          ...prev, 
          class_id: value,
          class: { ...(prev.class || {}), id: value, name: selectedClass?.name || prev.class?.name || '' }
        } : null
      );
    } else {
      setEditStudent((prev) => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleEditSubmit = async () => {
    if (!editStudent) return;
    const token = localStorage.getItem('token');
    if (!token) return;
  
    try {
      await axios.put(`http://localhost:8000/api/students/${editStudent.id}`, {
        ...editStudent,
        class_id: editStudent.class_id
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onReload();
      setOpenEditDialog(false);
    } catch (err) {
      console.error('Lỗi khi cập nhật sinh viên:', err);
    }
  };

  if (!Array.isArray(studentData) || studentData.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {t('noStudentData') || 'Không có dữ liệu học sinh'}
      </Typography>
    );
  }

  const sortedStudents = [...studentData].sort((a, b) => {
    const aParts = getNameParts(a.name);
    const bParts = getNameParts(b.name);
    const aLast = aParts.length > 0 ? aParts[aParts.length - 1] : '';
    const bLast = bParts.length > 0 ? bParts[bParts.length - 1] : '';
    const compareLast = aLast.localeCompare(bLast, 'vi', { sensitivity: 'base' });
    if (compareLast !== 0) return compareLast;
    const aMiddle = aParts.length > 2 ? aParts.slice(1, -1).join(' ') : '';
    const bMiddle = bParts.length > 2 ? bParts.slice(1, -1).join(' ') : '';
    return aMiddle.localeCompare(bMiddle, 'vi', { sensitivity: 'base' });
  });

  const paginatedStudents = sortedStudents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          backgroundColor: 'background.default',
          overflowX: 'auto',
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>{t('serialNumber') || 'STT'}</strong></TableCell>
                <TableCell><strong>{t('fullName') || 'Họ và tên'}</strong></TableCell>
                <TableCell><strong>{t('class') || 'Lớp'}</strong></TableCell>
                <TableCell><strong>{t('gender') || 'Giới tính'}</strong></TableCell>
                <TableCell><strong>{t('birthday') || 'Ngày sinh'}</strong></TableCell>
                <TableCell><strong>{t('email') || 'Email'}</strong></TableCell>
                <TableCell><strong>{t('phone') || 'Điện thoại'}</strong></TableCell>
                <TableCell><strong>{t('address') || 'Địa chỉ'}</strong></TableCell>
                <TableCell><strong>{t('actions') || 'Hành động'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStudents.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.class.name}</TableCell>
                  <TableCell>{student.gender}</TableCell>
                  <TableCell>{student.birthday ? format(new Date(student.birthday), 'dd/MM/yyyy') : ''}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>{student.address}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={t('viewScores') || 'Xem điểm'}>
                        <IconButton
                          color="info"
                          onClick={() => handleOpenScoreDialog(student)}
                        >
                          <Assessment fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('edit') || 'Sửa'}>
                         <IconButton color="primary" onClick={() => handleEdit(student)}>
                           <Edit fontSize="small" />
                         </IconButton>
                      </Tooltip>
                      <Tooltip title={t('delete') || 'Xóa'}>
                         <IconButton color="error" onClick={() => handleOpenDialog(student)}>
                           <Delete fontSize="small" />
                         </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={studentData.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={10}
          rowsPerPageOptions={[10]}
          labelDisplayedRows={({ from, to, count }) =>
             `${from}-${to} của ${count}`
          }
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{t('confirmDelete') || 'Xác nhận xóa'}</DialogTitle>
        <DialogContent>
          {t('deleteConfirmation', { studentName: studentToDelete?.name }) || `Bạn có chắc chắn muốn xóa học sinh ${studentToDelete?.name} này không?`}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel') || 'Hủy'}</Button>
          <Button color="error" onClick={handleConfirmDelete}>{t('delete') || 'Xóa'}</Button>
        </DialogActions>
      </Dialog>

    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editStudent') || 'Sửa thông tin học sinh'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('fullName') || 'Họ và tên'}
            value={editStudent?.name || ''}
            onChange={(e) => handleEditChange('name', e.target.value)}
          />
          
          <FormControl fullWidth>
            <InputLabel>{t('grade') || 'Khối'}</InputLabel>
            <Select
              value={selectedGrade}
              label={t('grade') || 'Khối'}
              onChange={(e) => {
                const grade = e.target.value;
                setSelectedGrade(grade);
              }}
            >
              {grades.map((grade) => (
                <MenuItem key={grade} value={grade}>{grade}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={loadingClasses}>
            <InputLabel>{t('class') || 'Lớp'}</InputLabel>
            <Select
              value={editStudent?.class_id || ''}
              label={t('class') || 'Lớp'}
              onChange={(e) => handleEditChange('class_id', e.target.value)}
            >
              {loadingClasses ? (
                <MenuItem disabled>{t('loadingClasses') || 'Đang tải lớp...'}</MenuItem>
              ) : (
                classes
                  .filter(cls => cls.name.startsWith(selectedGrade))
                  .map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t('gender') || 'Giới tính'}</InputLabel>
            <Select
              label={t('gender') || 'Giới tính'}
              value={editStudent?.gender || ''}
              onChange={(e) => handleEditChange('gender', e.target.value)}
            >
              <MenuItem value="Nam">{t('male') || 'Nam'}</MenuItem>
              <MenuItem value="Nữ">{t('female') || 'Nữ'}</MenuItem>
              <MenuItem value="Khác">{t('other') || 'Khác'}</MenuItem>
            </Select>
          </FormControl>

          <DatePicker
            label={t('birthday') || 'Ngày sinh'}
            value={editStudent?.birthday ? new Date(editStudent.birthday) : null}
            onChange={(newDate) => handleEditChange('birthday', newDate)}
            maxDate={new Date()}
            slotProps={{
              textField: { fullWidth: true },
            }}
            format="dd/MM/yyyy"
          />
          <TextField
            label={t('email') || 'Email'}
            value={editStudent?.email || ''}
            onChange={(e) => handleEditChange('email', e.target.value)}
          />
          <TextField
            label={t('phone') || 'Điện thoại'}
            value={editStudent?.phone || ''}
            onChange={(e) => handleEditChange('phone', e.target.value)}
          />
          <TextField
            label={t('address') || 'Địa chỉ'}
            value={editStudent?.address || ''}
            onChange={(e) => handleEditChange('address', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>{t('cancel') || 'Hủy'}</Button>
          <Button onClick={handleEditSubmit} variant="contained">{t('save') || 'Lưu'}</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>

      <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="md" fullWidth>
        <DialogTitle>
         {t('studentScoresTitle') || 'Điểm số của học sinh'}: {currentStudent?.name || ''}

           <Tooltip title={t('addScore') || 'Thêm điểm mới'}>
             <IconButton
                color="primary"
                onClick={handleOpenAddScoreDialog}
                disabled={loadingSubjects}
                aria-label={t('addScore') || 'Thêm điểm mới'}
                sx={{ marginLeft: 2 }}
             >
                <AddIcon />
             </IconButton>
          </Tooltip>
           {(loadingScores || loadingSubjects) && <CircularProgress size={20} sx={{ ml: 2 }} />}
           {subjectError && <Typography variant="caption" color="error" sx={{ ml: 2 }}>{subjectError}</Typography>}
        </DialogTitle>
        <DialogContent>
          {scoreError ? (
            <Typography color="error">{scoreError}</Typography>
          ) : scores.length === 0 && !loadingScores ? (
            <Typography>Không tìm thấy điểm số cho học sinh này</Typography>
          ) : (
            <>
               <TableContainer component={Paper}>
                 <Table size="small ">
                   <TableHead>
                     <TableRow>
                       <TableCell><strong>{t('subject') || 'Môn học'}</strong></TableCell>
                      {translatedScoreTypes.map(type => (
                        <TableCell key={type.value} align="right"><strong>{type.label}</strong></TableCell> 
                      ))}
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {Object.entries(scoresBySubjectForDisplay).map(([subjectName, scoresOfType]) => (
                       <TableRow key={subjectName}>
                         <TableCell>{t(subjectName) || subjectName}</TableCell>
                          {scoreTypes.map(type => {
                              const scoreEntry = scoresOfType[type.value];
                              return (
                                <TableCell key={type.value} align="right">
                                   {scoreEntry ? (
                                       <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                           <Typography variant="body2">{scoreEntry.score}</Typography>
                                           <Tooltip title={t('editScore') || 'Sửa điểm'}>
                                              <IconButton
                                                 size="small"
                                                 onClick={() => handleOpenEditScoreDialog(scoreEntry)}
                                                 aria-label={t('editScore') || 'Sửa điểm'}
                                              >
                                                 <Edit fontSize="small" />
                                              </IconButton>
                                           </Tooltip>
                                           <Tooltip title={t('deleteScore') || 'Xóa điểm'}>
                                              <IconButton
                                                 size="small"
                                                 onClick={() => handleOpenDeleteScoreConfirm(scoreEntry.id)}
                                                 aria-label={t('deleteScore') || 'Xóa điểm'}
                                                 color="error"
                                              >
                                                 <Delete fontSize="small" />
                                              </IconButton>
                                           </Tooltip>
                                       </Stack>
                                   ) : (
                                       '-'
                                   )}
                                </TableCell>
                              );
                          })}
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScoreDialog}>{t('close') || 'Đóng'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAddScoreDialog} onClose={handleCloseAddScoreDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addScore') || 'Thêm Điểm Mới'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography>{t('studentLabel') || 'Học sinh'}: {currentStudent?.name || ''}</Typography>
           {addScoreError && <Typography color="error">{addScoreError}</Typography>}
           
          <FormControl fullWidth required disabled={loadingSubjects}>
            <InputLabel>{t('subject') || 'Môn học'}</InputLabel>
            <Select
              name="subject_id"
              value={newScoreData.subject_id}
              label={t('subject') || 'Môn học'}
              onChange={handleNewScoreInputChange}
            >
              {loadingSubjects ? (
                 <MenuItem disabled>{t('loadingSubjects') || 'Đang tải môn học...'}</MenuItem>
              ) : (
                 subjects.map(subject => (
                   <MenuItem key={subject.id} value={subject.id}>
                     {subject.name}
                   </MenuItem>
                 ))
              )}
               {!loadingSubjects && subjects.length === 0 && (
                  <MenuItem disabled>{t('noSubjectsAvailable') || 'Không có môn học'}</MenuItem>
               )}
            </Select>
          </FormControl>

           <FormControl fullWidth required>
             <InputLabel>{t('scoreType') || 'Loại điểm'}</InputLabel>
              <Select
                name="type"
                value={newScoreData.type}
                label={t('scoreType') || 'Loại điểm'}
                onChange={handleNewScoreInputChange}
              >
                {scoreTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
           </FormControl>

          <TextField
            margin="normal"
            required
            fullWidth
            label={t('score') || 'Điểm số'}
            name="score"
            type="number"
            inputProps={{ step: "0.1", min: "0", max: "10" }}
            value={newScoreData.score}
            onChange={handleNewScoreInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddScoreDialog} disabled={addingScore}>{t('cancel') || 'Hủy'}</Button>
          <Button onClick={handleSaveNewScore} disabled={addingScore || !newScoreData.subject_id || !newScoreData.type || newScoreData.score === ''}>
            {addingScore ? <CircularProgress size={24} /> : (t('save') || 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>

      {scoreToEdit && (
         <Dialog open={openEditScoreDialog} onClose={handleCloseEditScoreDialog} maxWidth="xs" fullWidth>
           <DialogTitle>{t('editScore') || 'Sửa Điểm'}</DialogTitle>
           <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
             <Typography>{t('subject') || 'Môn'}: {scoreToEdit.subject_name || scoreToEdit.subject || '---'}</Typography>
             <Typography>{t('scoreType') || 'Loại điểm'}: {scoreTypes.find(t => t.value === scoreToEdit.type)?.label || scoreToEdit.type || '---'}</Typography>

             {editScoreError && <Typography color="error">{editScoreError}</Typography>}

             <TextField
               margin="normal"
               required
               fullWidth
               label={t('score') || 'Điểm số'}
               name="score"
               type="number"
               inputProps={{ step: "0.1", min: "0", max: "10" }}
               value={scoreToEdit.score}
               onChange={handleEditScoreInputChange}
             />
           </DialogContent>
           <DialogActions>
             <Button onClick={handleCloseEditScoreDialog} disabled={editingScore}>{t('cancel') || 'Hủy'}</Button>
             <Button onClick={handleSaveEditedScore} disabled={editingScore || scoreToEdit.score === ''}>
               {editingScore ? <CircularProgress size={24} /> : (t('save') || 'Lưu')}
             </Button>
           </DialogActions>
         </Dialog>
      )}

      <Dialog open={openDeleteScoreConfirm} onClose={handleCloseDeleteScoreConfirm}>
         <DialogTitle>{t('confirmDeleteScore') || 'Xác nhận xóa điểm'}</DialogTitle>
         <DialogContent>
            {deleteScoreError && <Typography color="error">{deleteScoreError}</Typography>}
            <Typography>{t('deleteScoreConfirmation') || 'Bạn có chắc chắn muốn xóa điểm này không?'}</Typography>
         </DialogContent>
         <DialogActions>
            <Button onClick={handleCloseDeleteScoreConfirm} disabled={deletingScore}>{t('cancel') || 'Hủy'}</Button>
            <Button onClick={handleConfirmDeleteScore} color="error" disabled={deletingScore}>
               {deletingScore ? <CircularProgress size={24} /> : (t('delete') || 'Xóa')}
            </Button>
         </DialogActions>
      </Dialog>
    </>
  );
};

export default DetailStudents;