import React, { useState } from 'react';
import axios, { isAxiosError, AxiosError } from 'axios';
import {
    Box,
    Typography,
    TextField,
    Button,
    Container,
    Alert,
    Snackbar,
    Paper,
    CircularProgress,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';

const FirstTimePasswordChange: React.FC = () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const navigate = useNavigate();

    const closeNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const handleToggleNewPasswordVisibility = () => {
        setShowNewPassword(!showNewPassword);
    };

    const handleToggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const handleChangePassword = async () => {
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
            setNotification({ open: true, message: 'Mật khẩu mới và xác nhận mật khẩu không khớp.', severity: 'error' });
            return;
        }
        if (newPassword.length < 8) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
            setNotification({ open: true, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.', severity: 'error' });
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
                setNotification({ open: true, message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập lại.', severity: 'error' });
                setLoading(false);
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/api/change-password`, {
                new_password: newPassword,
                new_password_confirmation: confirmPassword,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log("Password change successful:", response.data);

            setNotification({
                open: true,
                message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
                severity: 'success'
            });

            localStorage.clear();

            setTimeout(() => {
                window.location.href = '/authentication/login';
            }, 2000);

        } catch (err: any) {
            console.error("Password change failed:", err);
            setLoading(false);

            if (isAxiosError(err)) {
                const axiosError = err as AxiosError<any>;
                const message = axiosError.response?.data?.message || 'Lỗi khi đổi mật khẩu.';
                const backendErrors = axiosError.response?.data?.errors;

                if (backendErrors) {
                    let errorMessages = '';
                    for (const field in backendErrors) {
                        errorMessages += backendErrors[field].join(' ') + ' ';
                    }
                    setError(errorMessages.trim() || message);
                } else {
                    setError(message);
                }

                setNotification({ open: true, message: error || message, severity: 'error' });

            } else {
                setError('Đã xảy ra lỗi không mong muốn.');
                setNotification({ open: true, message: 'Đã xảy ra lỗi không mong muốn.', severity: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 5, position: 'relative' }}>
                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <Typography variant="h5" component="h1" gutterBottom align="center">
                        Đổi mật khẩu lần đầu
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                        Đây là lần đăng nhập đầu tiên của bạn. Vui lòng đổi mật khẩu để tiếp tục.
                    </Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        label="Mật khẩu mới"
                        type={showNewPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        error={!!error}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle new password visibility"
                                        onClick={handleToggleNewPasswordVisibility}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        label="Xác nhận mật khẩu mới"
                        type={showConfirmPassword ? 'text' : 'password'}
                        fullWidth
                        margin="normal"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={!!error}
                        helperText={error}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle confirm password visibility"
                                        onClick={handleToggleConfirmPasswordVisibility}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 3 }}
                        onClick={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Đổi mật khẩu'}
                    </Button>
                </Box>
            </Paper>
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={closeNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={closeNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default FirstTimePasswordChange;