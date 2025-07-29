import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from './useSession'
import { OFFLINE_MODE } from '@/lib/constants'
import { Profile } from '@/types/profile'

// New hook for current user's profile
export function useCurrentUserProfile() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useQuery({
    enabled: !!session?.user,
    queryKey : ['profile:v2', session?.user.id],
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', session!.user.id)
        .single()

      if (error && error.code === 'PGRST116') {        // "No rows"
        // attempt one retry: maybe trigger hasn't fired yet (cold edge function)
        await new Promise(r => setTimeout(r, 1500))
        const result = await queryClient.fetchQuery({
          queryKey: ['profile:v2', session!.user.id],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', session!.user.id)
              .single()
            if (error) throw error
            return data as Profile
          }
        })
        return result
      }

      if (error) throw error
      return data as Profile
    },
  })
}

// Keep the original useProfile signature for backward compatibility
export const useProfile = (profileId: string | undefined) => {
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: profileId || 'mock-id',
      username: 'mock_user',
      display_name: 'Mock User',
      avatar_url: null,
    };

    return {
      data: profileId ? mockProfile : undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: !!profileId,
    };
  }

  return useQuery({
    queryKey: ['profile:v2', profileId],
    queryFn: async (): Promise<Profile> => {
      if (!profileId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', profileId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        console.warn(`Profile not found for user ${profileId}`);
        throw new Error('Profile not found');
      }
      
      return data as Profile;
    },
    enabled: !!profileId,
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
        .select('id, username, display_name, avatar_url')
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