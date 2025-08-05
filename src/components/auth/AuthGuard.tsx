import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  
  return user ? <>{children}</> : <Navigate to={`/login?next=${pathname}`} replace />;
};