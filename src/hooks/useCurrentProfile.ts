import { useCurrentUserProfile } from '@/hooks/useProfile';

export function useCurrentProfile() {
  const profileQuery = useCurrentUserProfile();

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    isError: profileQuery.isError,
  };
}