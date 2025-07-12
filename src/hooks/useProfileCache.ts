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
  
  if (env.presenceMode === 'offline' || env.presenceMode === 'mock') {
    // Return mock profile with deterministic but varied data
    const names = ['Mock User', 'Test User', 'Demo User', 'Sample User'];
    const name = names[Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % names.length];
    
    const mockProfile: Profile = {
      id: userId,
      display_name: name,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      created_at: '2024-01-01T00:00:00Z'
    };

    return {
      data: mockProfile,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
  }

  // Live mode - actual profile data

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