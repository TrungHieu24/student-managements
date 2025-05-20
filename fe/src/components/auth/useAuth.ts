import { useState, useEffect, useCallback } from 'react';
import { isTokenValid, clearAuth } from '../../utils/auth'; 

export interface AuthState {
  isAuthenticated: boolean;
  role: string;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string>(''); 

  const checkAuthStatus = useCallback(() => {
    const valid = isTokenValid();
    setIsAuthenticated(valid);

    if (valid) {
      const storedRole = localStorage.getItem('role');
      console.log('useAuth - Current role from localStorage:', storedRole);
      
      if (storedRole) {
        setRole(storedRole);
      } else {
        setRole('');
      }
    } else {
      setRole('');
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === 'role') {
        console.log('Storage changed:', event.key);
        checkAuthStatus();
      }
    };

    const handleLoginSuccess = () => {
      console.log('Login success event received');
      checkAuthStatus();
    };

    // Xử lý sự kiện đăng xuất
    const handleLogoutSuccess = () => {
      console.log('Logout success event received');
      checkAuthStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginSuccess', handleLoginSuccess);
    window.addEventListener('logoutSuccess', handleLogoutSuccess);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginSuccess', handleLoginSuccess);
      window.removeEventListener('logoutSuccess', handleLogoutSuccess);
    };
  }, [checkAuthStatus]);

  const handleLogout = () => {
    clearAuth();
  };

  return { isAuthenticated, role, logout: handleLogout };
}