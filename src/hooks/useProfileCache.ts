import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SearchedUser } from '@/hooks/useUserSearch';
import { getEnvironmentConfig } from '@/lib/environment';

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
  const env = getEnvironmentConfig();
  
  if (env.presenceMode === 'mock') {
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

  if (env.presenceMode === 'stub') {
    // Return more realistic stub data
    const stubNames = ['Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emma Wilson', 'David Kim'];
    const name = stubNames[Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % stubNames.length];
    
    const stubProfile: Profile = {
      id: userId,
      display_name: name,
      avatar_url: null,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return {
      data: stubProfile,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
  }

  // TODO: Implement real profile cache queries using Supabase
  // For now, return stub data even in live mode until implementation is ready
  const stubProfile: Profile = {
    id: userId,
    display_name: 'Live User',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
  
  if (env.debugPresence) {
    console.log('🔴 useProfile - Live mode not yet implemented, using stub data for:', userId);
  }

  return {
    data: stubProfile,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
  };
}