import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Component kiểm tra trạng thái đăng nhập và chuyển hướng
const RequireAuth: FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra token và trạng thái đăng nhập
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      const isFirstLogin = localStorage.getItem('is_first_login') === 'true';
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = user.role || '';

      console.log('Checking auth status:', { token, isFirstLogin, userRole });

      // Nếu không có token, chuyển hướng đến trang đăng nhập
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/authentication/login', { replace: true });
        return;
      }

      // Nếu là đăng nhập lần đầu và là giáo viên, chuyển hướng đến trang đổi mật khẩu
      if (isFirstLogin && userRole === 'TEACHER') {
        console.log('First login detected, redirecting to password change');
        navigate('/first-time-password-change', { replace: true });
        return;
      }

      // Ngược lại, cho phép truy cập vào route được bảo vệ
      setLoading(false);
    };

    checkAuthStatus();
  }, [navigate]);

  // Hiển thị loading hoặc component con dựa vào trạng thái loading
  return loading ? <div>Đang kiểm tra thông tin đăng nhập...</div> : <>{children}</>;
};

export default RequireAuth;