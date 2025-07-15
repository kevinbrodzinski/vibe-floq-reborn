import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/hooks/useProfileCache';
import { OFFLINE_MODE } from '@/lib/constants';

// Re-export the consolidated Profile type for backward compatibility
export type { Profile };

export const useProfile = (userId: string | undefined) => {
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: userId || 'mock-id',
      username: 'mock_user',
      display_name: 'Mock User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return {
      data: userId ? mockProfile : undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: !!userId,
    };
  }

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile> => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        console.warn(`Profile not found for user ${userId}`);
        throw new Error('Profile not found');
      }
      
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useProfileByUsername = (username: string | undefined) => {
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: 'mock-id-' + username,
      username: username || 'mock_user',
      display_name: username || 'Mock User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return {
      data: username ? mockProfile : undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: !!username,
    };
  }

  return useQuery({
    queryKey: ['profile-by-username', username],
    queryFn: async (): Promise<Profile> => {
      if (!username) throw new Error('Username is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      
      return data as Profile;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};