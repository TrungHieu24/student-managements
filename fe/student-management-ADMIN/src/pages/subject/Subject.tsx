import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Material UI Components
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';

// Material UI Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

interface Subject {
  id: number;
  name: string;
}

const SubjectManagement: React.FC = () => {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const apiUrl = 'http://localhost:8000/api/subjects';
  
  // Get authentication token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };
  
  // Config headers with auth token
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };
  
  // Fetch all subjects
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiUrl, {
        headers: getAuthHeaders()
      });
      setSubjects(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access')
        : t('subjects_fetch_error');
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Load subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);
  
  // Dialog handlers
  const handleOpenDialog = (subject: Subject) => {
    setSubjectToDelete(subject);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSubjectToDelete(null);
  };

  const handleOpenEditDialog = (subject: Subject) => {
    setEditSubject({...subject});
    setOpenEditDialog(true);
  };
  
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditSubject(null);
  };
  
  const handleOpenAddDialog = () => {
    setNewSubjectName('');
    setOpenAddDialog(true);
  };
  
  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewSubjectName('');
  };
  
  // Handle edit change
  const handleEditChange = (value: string) => {
    if (editSubject) {
      setEditSubject({...editSubject, name: value});
    }
  };
  
  // Submit handlers
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    setLoading(true);
    
    try {
      await axios.delete(`${apiUrl}/${subjectToDelete.id}`, {
        headers: getAuthHeaders()
      });
      
      setSnackbar({
        open: true,
        message: t('subject_delete_success') || 'Xóa môn học thành công',
        severity: 'success'
      });
      
      fetchSubjects();
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access') || 'Không có quyền truy cập'
        : t('subject_delete_error') || 'Lỗi khi xóa môn học';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };
  
  const handleEditSubmit = async () => {
    if (!editSubject) return;
    setLoading(true);
    
    try {
      await axios.put(`${apiUrl}/${editSubject.id}`, editSubject, {
        headers: getAuthHeaders()
      });
      
      setSnackbar({
        open: true,
        message: t('subject_update_success') || 'Cập nhật môn học thành công',
        severity: 'success'
      });
      
      fetchSubjects();
      handleCloseEditDialog();
    } catch (err: any) {
      console.error('Error updating subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access') || 'Không có quyền truy cập'
        : t('subject_update_error') || 'Lỗi khi cập nhật môn học';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSubmit = async () => {
    if (!newSubjectName.trim()) return;
    setLoading(true);
    
    try {
      await axios.post(apiUrl, { name: newSubjectName }, {
        headers: getAuthHeaders()
      });
      
      setSnackbar({
        open: true,
        message: t('subject_add_success') || 'Thêm môn học thành công',
        severity: 'success'
      });
      
      fetchSubjects();
      handleCloseAddDialog();
    } catch (err: any) {
      console.error('Error adding subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access') || 'Không có quyền truy cập'
        : t('subject_add_error') || 'Lỗi khi thêm môn học';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          backgroundColor: 'background.default',
          overflowX: 'auto',
          minHeight: 400
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">{t('subject_list') || 'Danh sách môn học'}</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSubjects}
              disabled={loading}
            >
              {t('refresh') || 'Làm mới'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
            >
              {t('add_subject') || 'Thêm môn học'}
            </Button>
          </Stack>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress />
          </Box>
        ) : !Array.isArray(subjects) || subjects.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {t('noSubjectData') || 'Không có dữ liệu môn học'}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ minHeight: 300 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="20%"><strong>{t('serialNumber') || 'STT'}</strong></TableCell>
                  <TableCell width="60%"><strong>{t('subject') || 'Môn học'}</strong></TableCell>
                  <TableCell width="20%"><strong>{t('actions') || 'Thao tác'}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((subject, index) => (
                  <TableRow key={subject.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{t(subject.name)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={t('edit') || 'Sửa'}>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(subject)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete') || 'Xóa'}>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDialog(subject)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{t('confirmDelete') || 'Xác nhận xóa'}</DialogTitle>   
        <DialogContent>
          {t('deletesubject', { subjectName: t(subjectToDelete?.name || 'default_subject_name') })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel') || 'Hủy'}</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            {loading ? <CircularProgress size={24} /> : (t('delete') || 'Xóa')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Subject Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editSubject') || 'Sửa môn học'}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('subject_name') || 'Tên môn học'}
            fullWidth
            value={t(editSubject?.name || '')}
            onChange={(e) => handleEditChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('cancel') || 'Hủy'}</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            {loading ? <CircularProgress size={24} /> : (t('save') || 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Subject Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addSubject') || 'Thêm môn học'}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('subject_name') || 'Tên môn học'}
            fullWidth
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>{t('cancel') || 'Hủy'}</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={!newSubjectName.trim()}>
            {loading ? <CircularProgress size={24} /> : (t('add') || 'Thêm')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
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
  );
};

export default SubjectManagement;