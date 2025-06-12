import { useEffect, useState, ReactElement, ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
  Avatar,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PhotoCamera } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface User {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

const Profile = (): ReactElement => {
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<User>({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const navigate = useNavigate();



  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/profile`, { 
          headers: {
            Authorization: `Bearer ${token}`, 
            "ngrok-skip-browser-warning": "true",
            'Content-Type': 'application/json' 
          },
        });
        const data = res.data as User;
        setUser(data);
        setUpdatedUser({ name: data.name, email: data.email });
        setAvatarPreview(data.avatar || null);
      } catch (err: any) {
        console.error('Lỗi khi gọi API:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        setSnackbar({ open: true, message: t('fetch_error'), severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, t, API_BASE_URL]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.put(`${API_BASE_URL}/api/profile`, updatedUser, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true", 
        },
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        await axios.post(`${API_BASE_URL}/api/profile/avatar`, formData, { 
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            "ngrok-skip-browser-warning": "true", 
          }, 
        });
      }

      setUser(res.data as User);
      setIsEditing(false);
      setSnackbar({ open: true, message: t('update_success'), severity: 'success' });
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      setSnackbar({ open: true, message: t('update_error'), severity: 'error' });
    }
  };

  return (
    <Paper sx={{ p: 4, mt: 2 }}>
      <Box display="flex" justifyContent="center" mb={3} position="relative">
        <Avatar
          src={avatarPreview || undefined}
          sx={{
            width: 100,
            height: 100,
            fontSize: '2rem',
            bgcolor: avatarPreview ? 'transparent' : 'primary.main',
          }}
        >
          {(!avatarPreview || avatarPreview === '') && user?.name
            ? user.name.split(' ').slice(-2).map((word) => word[0]).join('').toUpperCase()
            : null}
        </Avatar>
        {isEditing && (
          <>
            <input accept="image/*" id="upload-avatar" type="file" hidden onChange={handleAvatarChange} />
            <label htmlFor="upload-avatar">
              <IconButton
                component="span"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 'calc(50% - 50px)',
                  backgroundColor: 'white',
                  boxShadow: 2,
                  '&:hover': { backgroundColor: '#f0f0f0' },
                }}
              >
                <PhotoCamera fontSize="small" />
              </IconButton>
            </label>
          </>
        )}
      </Box>

      <Typography variant="h4" align="center" mb={3}>
        {t('profile_title')}
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : user ? (
        isEditing ? (
          <Stack spacing={2}>
            <TextField
              label={t('name')}
              name="name"
              fullWidth
              value={updatedUser.name}
              onChange={handleInputChange}
            />
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSaveChanges}>
                {t('save_changes')}
              </Button>
              <Button variant="outlined" onClick={() => setIsEditing(false)}>
                {t('cancel')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Box>
            <Typography mb={1}><strong>{t('name')}:</strong> {user.name}</Typography>
            <Typography mb={1}><strong>{t('email')}:</strong> {user.email}</Typography>
            <Typography mb={2}><strong>{t('role')}:</strong> {user.role || t('undefined_role')}</Typography>
            <Button variant="contained" onClick={() => setIsEditing(true)}>
              {t('edit')}
            </Button>
          </Box>
        )
      ) : (
        <Typography color="error">{t('fetch_error')}</Typography>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            fontSize: '1.1rem',
            px: 3,
            py: 2,
            borderRadius: 2,
            boxShadow: 6,
          },
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', fontWeight: 500 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default Profile;