import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from '../components/Auth/Login';
import FirstTimePasswordChange from '../components/Auth/FirstTimePasswordChange';
import Dashboard from '../components/Dashboard/Dashboard';

import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}
  >
    <CircularProgress />
    <Typography variant="body1" sx={{ mt: 2 }}>
      Đang tải...
    </Typography>
  </Box>
);

const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
};

const requiresPasswordChange = () => {
    const userString = localStorage.getItem('user');
    const isFirstLoginLS = localStorage.getItem('is_first_login');
    
    console.log('User string:', userString);
    console.log('is_first_login from localStorage:', isFirstLoginLS);
    
    if (!userString) return false;
    
    try {
        const user = JSON.parse(userString);
        console.log('Parsed user object:', user);
        console.log('User role:', user.role);
        console.log('User is_first_login:', user.is_first_login);
    
        return isAuthenticated() && 
               user.role === 'USER' && 
               (isFirstLoginLS === 'true' || user.is_first_login === true);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return false;
    }
};

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = setTimeout(() => {
      console.log('Auth check complete');
      console.log('Is authenticated:', isAuthenticated());
      console.log('Requires password change:', requiresPasswordChange());
      setIsChecking(false);
    }, 300); 
    
    return () => clearTimeout(checkAuth);
  }, []);
  
  if (isChecking) {
    return <LoadingScreen />;
  }
  
  return children;
};

// Route bảo vệ cho người dùng đã đăng nhập
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Debug log
  console.log('Protected route check:');
  console.log('- Is authenticated:', isAuthenticated());
  console.log('- Requires password change:', requiresPasswordChange());

  if (!isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (requiresPasswordChange()) {
    console.log('Password change required, redirecting to change password page');
    return <Navigate to="/change-password-first-time" replace />;
  }
  
  console.log('User authenticated and no password change required');
  return children;
};

// Route bảo vệ cho trang đổi mật khẩu lần đầu
const PasswordChangeRoute = () => {
  // Debug log
  console.log('Password change route check:');
  console.log('- Is authenticated:', isAuthenticated());
  console.log('- Requires password change:', requiresPasswordChange());

  if (!isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (!requiresPasswordChange()) {
    console.log('Password change not required, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('Showing password change screen');
  return <FirstTimePasswordChange />;
};

// Route cho trang đăng nhập
const LoginRoute = () => {
  // Debug log
  console.log('Login route check:');
  console.log('- Is authenticated:', isAuthenticated());
  console.log('- Requires password change:', requiresPasswordChange());

  if (isAuthenticated()) {
    if (requiresPasswordChange()) {
      console.log('Authenticated and password change required, redirecting to change password');
      return <Navigate to="/change-password-first-time" replace />;
    }
    console.log('Authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('Showing login screen');
  return <Login />;
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthWrapper>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          
          <Route path="/change-password-first-time" element={<PasswordChangeRoute />} />
          
          <Route path="/" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthWrapper>
    </BrowserRouter>
  );
};

export default AppRouter;