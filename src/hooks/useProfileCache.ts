import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SearchedUser } from '@/hooks/useUserSearch';
import { getEnvironmentConfig } from '@/lib/environment';

// Updated Profile interface to match our hardened database schema
export interface Profile {
  id: string;
  username: string;        // now required (NOT NULL in DB)
  display_name: string;    // now required (NOT NULL in DB)
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  bio?: string | null;
  interests?: string[] | null;
  custom_status?: string | null;
  created_at: string;
}

export function useProfileCache() {
  const queryClient = useQueryClient();

  const primeProfiles = (users: SearchedUser[]) => {
    users.forEach(user => {
      queryClient.setQueryData(['profile', user.id], {
        id: user.id,
        username: user.username,     // Now guaranteed to be present
        display_name: user.display_name,  // Now guaranteed to be present
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
    const usernames = ['mock_user', 'test_user', 'demo_user', 'sample_user'];
    const index = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % names.length;
    
    const mockProfile: Profile = {
      id: userId,
      username: usernames[index],
      display_name: names[index],
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

  // Live mode - implement real profile fetching using React Query
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile> => {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}