import { useQueryClient } from '@tanstack/react-query';
import { SearchedUser } from '@/hooks/useUserSearch';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useProfileCache() {
  const queryClient = useQueryClient();

  const primeProfiles = (users: SearchedUser[]) => {
    users.forEach(user => {
      queryClient.setQueryData(['profile', user.id], {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      });
    });
  };

  const useProfile = (userId: string) => {
    return queryClient.getQueryData<Profile>(['profile', userId]);
  };

  return {
    primeProfiles,
    useProfile,
  };
}