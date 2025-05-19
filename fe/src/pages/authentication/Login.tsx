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
} from '@mui/material';
import IconifyIcon from '../../components/base/IconifyIcon';
import { useState, useEffect, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from '../../components/base/Image';
import logoWithText from '/Logo-with-text.png';
import axios from 'axios';
import { saveAuth, isTokenValid, getUserRole, clearAuth } from '../../utils/auth'; 

interface LoginResponse {
  token: string;
  user: {
    role: string;
    [key: string]: any;
  };
}

const Login = (): ReactElement => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const tokenValid = isTokenValid();
    const role = getUserRole();

    if (tokenValid && role === 'ADMIN') {
      navigate('/');
    } else {
      clearAuth(); 
    }
  }, [navigate]);

  const handleSubmit = async () => {
    try {
      const response = await axios.post<LoginResponse>('http://localhost:8000/api/login', {
        email,
        password,
      });

      const { token, user } = response.data;

      if (user.role === 'ADMIN') {
        saveAuth(token, user.role);
        navigate('/');
      } else {
        alert('Trang này chỉ dành cho quản trị viên (admin).');
      }
    } catch (error: any) {
      console.error('Lỗi đăng nhập:', error);
      alert('Lỗi đăng nhập: ' + (error.response?.data?.message || 'Lỗi server'));
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <>
      <Box component="figure" mb={5} mx="auto" textAlign="center">
        <Link href="/nickelfox">
          <Image src={logoWithText} alt="logo with text" height={60} />
        </Link>
      </Box>
      <Paper
        sx={{
          py: 6,
          px: { xs: 5, sm: 7.5 },
        }}
      >
        <Stack justifyContent="center" gap={5}>
          <Typography variant="h3" textAlign="center" color="text.secondary">
            Admin Login
          </Typography>

          <TextField
            variant="filled"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              '.MuiFilledInput-root': {
                bgcolor: 'grey.A100',
                ':hover': { bgcolor: 'background.default' },
                ':focus': { bgcolor: 'background.default' },
                ':focus-within': { bgcolor: 'background.default' },
              },
              borderRadius: 2,
            }}
          />

          <TextField
            variant="filled"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              '.MuiFilledInput-root': {
                bgcolor: 'grey.A100',
                ':hover': { bgcolor: 'background.default' },
                ':focus': { bgcolor: 'background.default' },
                ':focus-within': { bgcolor: 'background.default' },
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
                    sx={{ mr: 2 }}
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
              label="Keep me signed in"
              sx={{ color: 'text.secondary' }}
            />
          </FormGroup>

          <Button onClick={handleSubmit} sx={{ fontWeight: 'fontWeightRegular' }}>
            Log In
          </Button>

          <Divider />
        </Stack>
      </Paper>
    </>
  );
};

export default Login;
