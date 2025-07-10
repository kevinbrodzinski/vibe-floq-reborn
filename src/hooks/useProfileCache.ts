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
  const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: userId,
      display_name: 'Mock User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return {
      data: mockProfile,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
  }

  // TODO: Re-enable real profile cache queries
  const mockProfile: Profile = {
    id: userId,
    display_name: 'Mock User',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  return {
    data: mockProfile,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
  };
}