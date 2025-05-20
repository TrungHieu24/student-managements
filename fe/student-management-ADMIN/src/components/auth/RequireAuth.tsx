import { Navigate, Outlet } from 'react-router-dom';
import { PropsWithChildren, ReactNode } from 'react';
import { isTokenValid, clearAuth } from '../../utils/auth';

const RequireAuth = ({ children }: PropsWithChildren): ReactNode => {
  const isValid = isTokenValid();

  if (!isValid) {
    clearAuth();
    return <Navigate to="/authentication/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default RequireAuth;
