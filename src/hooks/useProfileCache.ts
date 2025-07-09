import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  return {
    primeProfiles,
  };
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}