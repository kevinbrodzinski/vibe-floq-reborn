import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfileCache';

export function useCurrentProfile() {
  const { user } = useAuth();
  const profileQuery = useProfile(user?.id || '');

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    isError: profileQuery.isError,
  };
}