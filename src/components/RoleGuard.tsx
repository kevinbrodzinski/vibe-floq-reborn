import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useFloqDetails } from '@/hooks/useFloqDetails';
import { useParams } from 'react-router-dom';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, roles }) => {
  const { session } = useAuth();
  const { floqId } = useParams<{ floqId: string }>();
  const { data: floqDetails, isLoading } = useFloqDetails(floqId, session?.user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/floqs" replace />;
  }

  if (!floqDetails) {
    return <Navigate to="/floqs" replace />;
  }

  const isCreator = floqDetails.creator_id === session.user.id;
  const userRole = floqDetails.participants?.find(p => p.user_id === session.user.id)?.role;
  
  const hasRequiredRole = isCreator || roles.includes(userRole || '');

  if (!hasRequiredRole) {
    return <Navigate to={`/floqs/${floqId}`} replace />;
  }

  return <>{children}</>;
};