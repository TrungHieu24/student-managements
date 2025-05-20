import {
  Box,
  Link,
  Paper,
  Stack,
  Button,
  Divider,
  Checkbox,
  FormGroup,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { useState, ReactElement, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { rootPaths } from '../../routes/paths';
import Image from '../../components/base/Image';
import logoWithText from '/Logo-with-text.png';
import axios from 'axios';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  is_first_login: boolean;
}

interface LoginResponse {
  token: string;
  user: UserData;
  is_first_login: boolean;
  message: string;
}

const Login = (): ReactElement => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  const closeNotification = () => {
    setNotification({...notification, open: false});
  };

  const handleClickShowPassword = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post<LoginResponse>('http://localhost:8000/api/login', {
        email: email,
        password: password,
      });

      const { token, user } = res.data;
      
      const is_first_login = user.is_first_login !== undefined ? user.is_first_login : 
                             res.data.is_first_login !== undefined ? res.data.is_first_login : false;
      
      console.log("Raw response data:", res.data);
      console.log("is_first_login value:", is_first_login);
      console.log("Type of is_first_login:", typeof is_first_login);
      
      localStorage.clear();
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('is_first_login', is_first_login === true ? 'true' : 'false');
      
      setNotification({
        open: true,
        message: 'Đăng nhập thành công!',
        severity: 'success'
      });
      
      console.log("Login successful, is_first_login:", is_first_login, "user role:", user.role);
      console.log("is_first_login from localStorage:", localStorage.getItem('is_first_login'));
      
      setTimeout(() => {
        const firstLoginCheck = localStorage.getItem('is_first_login');
        const userObj = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = userObj.role || '';
        
        console.log("Before redirect - is_first_login:", firstLoginCheck);
        console.log("Before redirect - user role:", userRole);
        
        if (firstLoginCheck === 'true' && userRole === 'TEACHER') {
          console.log("Redirecting to first time password change page");
          navigate('/first-time-password-change', { replace: true });
        } else {
          console.log("Redirecting to dashboard");
          navigate(rootPaths.homeRoot, { replace: true });
        }
        setLoading(false);
      }, 800);

    } catch (err: any) {
      console.error("Login failed:", err);
      setLoading(false);

      let errorMessage = 'Đã xảy ra lỗi không mong muốn.';
      
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        
        if (status === 401) {
          errorMessage = 'Email hoặc mật khẩu không chính xác.';
        } else if (status === 422 && err.response?.data?.errors) {
          const validationErrors = err.response.data.errors;
          let messages = [];
          for (const field in validationErrors) {
            messages.push(...validationErrors[field]);
          }
          errorMessage = messages.join(' ') || 'Dữ liệu đăng nhập không hợp lệ.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.request) {
          errorMessage = 'Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối.';
        } else {
          errorMessage = 'Lỗi gửi yêu cầu đăng nhập.';
        }
      }
      
      setError(errorMessage);
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  return (
    <>
      <Box component="figure" mb={5} mx="auto" textAlign="center">
        <Link href={rootPaths.homeRoot}>
          <Image src={logoWithText} alt="logo with text" height={60} />
        </Link>
      </Box>
      <Paper
        sx={{
          py: 6,
          px: { xs: 5, sm: 7.5 },
        }}
      >
        <Stack component="form" onSubmit={handleSubmit} justifyContent="center" gap={5}>
          <Typography variant="h3" textAlign="center" color="text.secondary">
           Đăng nhập giáo viên
          </Typography>
          <TextField
            variant="filled"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={!!error}
            sx={{
              '.MuiFilledInput-root': {
                bgcolor: 'grey.A100',
                ':hover': {
                  bgcolor: 'background.default',
                },
                ':focus': {
                  bgcolor: 'background.default',
                },
                ':focus-within': {
                  bgcolor: 'background.default',
                },
              },
              borderRadius: 2,
            }}
          />
          <TextField
            variant="filled"
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={!!error}
            sx={{
              '.MuiFilledInput-root': {
                bgcolor: 'grey.A100',
                ':hover': {
                  bgcolor: 'background.default',
                },
                ':focus': {
                  bgcolor: 'background.default',
                },
                ':focus-within': {
                  bgcolor: 'background.default',
                },
              },
              borderRadius: 2,
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    size="small"
                    edge="end"
                    sx={{
                      mr: 2,
                    }}
                  >
                    {showPassword ? (
                      <IconifyIcon icon="el:eye-open" color="text.secondary" />
                    ) : (
                      <IconifyIcon icon="el:eye-close" color="text.primary" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormGroup sx={{ ml: 1, width: 'fit-content' }}>
            <FormControlLabel
              control={<Checkbox />}
              label="Giữ đăng nhập"
              sx={{
                color: 'text.secondary',
              }}
            />
          </FormGroup>
          <Button
            type="submit"
            disabled={loading}
            sx={{
              fontWeight: 'fontWeightRegular',
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Đăng nhập'}
          </Button>
          <Divider />
        </Stack>
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
    </>
  );
};

export default Login;