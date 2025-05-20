import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RequireAuth: FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      const isFirstLogin = localStorage.getItem('is_first_login') === 'true';
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = user.role || '';

      console.log('Checking auth status:', { token, isFirstLogin, userRole });

      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/authentication/login', { replace: true });
        return;
      }

      if (isFirstLogin && userRole === 'TEACHER') {
        console.log('First login detected, redirecting to password change');
        navigate('/first-time-password-change', { replace: true });
        return;
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [navigate]);

  return loading ? <div>Đang kiểm tra thông tin đăng nhập...</div> : <>{children}</>;
};

export default RequireAuth;