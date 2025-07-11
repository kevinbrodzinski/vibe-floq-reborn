import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  custom_status?: string | null;
  created_at: string;
};

export const useProfile = (userId: string | undefined) => {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
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
      if (!data) throw new Error('Profile not found');
      
      return data as Profile;
    },
    enabled: !!userId,
  });
};

export const useProfileByUsername = (username: string | undefined) => {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
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
  });
};