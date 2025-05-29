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
        message: t('subject_delete_success'),
        severity: 'success'
      });
      
      fetchSubjects();
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access')
        : t('subject_delete_error');
      
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
        message: t('subject_update_success'),
        severity: 'success'
      });
      
      fetchSubjects();
      handleCloseEditDialog();
    } catch (err: any) {
      console.error('Error updating subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access')
        : t('subject_update_error');
      
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
        message: t('subject_add_success'),
        severity: 'success'
      });
      
      fetchSubjects();
      handleCloseAddDialog();
    } catch (err: any) {
      console.error('Error adding subject:', err);
      const errorMessage = err.response?.status === 401
        ? t('unauthorized_access')
        : t('subject_add_error');
      
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
          <Typography variant="h5">{t('subject_list')}</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSubjects}
              disabled={loading}
            >
              {t('refresh')}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
            >
              {t('add_subject')}
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
              {t('noSubjectData')}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ minHeight: 300 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="20%"><strong>{t('serialNumber')}</strong></TableCell>
                  <TableCell width="60%"><strong>{t('subject')}</strong></TableCell>
                  <TableCell width="20%"><strong>{t('actions')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((subject, index) => (
                  <TableRow key={subject.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{t(`subjectName.${subject.name}`)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(subject)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
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
        <DialogTitle>{t('confirmDelete')}</DialogTitle>   
        <DialogContent>
          {t('deletesubject', { subjectName: t(`subjectName.${subjectToDelete?.name}`) })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            {loading ? <CircularProgress size={24} /> : t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Subject Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('editSubject')}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('subject_name')}
            fullWidth
            value={editSubject?.name || ''}
            onChange={(e) => handleEditChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t('cancel')}</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            {loading ? <CircularProgress size={24} /> : t('save')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Subject Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addSubject')}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('subject_name')}
            fullWidth
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>{t('cancel')}</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={!newSubjectName.trim()}>
            {loading ? <CircularProgress size={24} /> : t('add')}
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