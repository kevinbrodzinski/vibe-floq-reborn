import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from './useSession'
import { OFFLINE_MODE } from '@/lib/constants'

export interface Profile {
  id: string
  email?: string
  username: string
  display_name: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url: string | null
  bio?: string | null
  custom_status?: string | null
  interests?: string[] | null
  created_at: string
}

// New hook for current user's profile
export function useCurrentUserProfile() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useQuery({
    enabled: !!session?.user,
    queryKey : ['profile', session?.user.id],
    queryFn  : async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single()

      if (error && error.code === 'PGRST116') {        // "No rows"
        // attempt one retry: maybe trigger hasn't fired yet (cold edge function)
        await new Promise(r => setTimeout(r, 1500))
        return queryClient.fetchQuery({
          queryKey: ['profile', session!.user.id],
          queryFn: () => supabase.from('profiles').select('*').eq('id', session!.user.id).single().then(({ data, error }) => {
            if (error) throw error
            return data as Profile
          })
        })
      }

      if (error) throw error
      return data as Profile
    },
  })
}

// Keep the original useProfile signature for backward compatibility
export const useProfile = (userId: string | undefined) => {
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: userId || 'mock-id',
      email: 'mock@example.com',
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
      email: 'mock@example.com',
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