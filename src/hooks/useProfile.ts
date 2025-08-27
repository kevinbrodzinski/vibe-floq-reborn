import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from './useSession'
import { OFFLINE_MODE } from '@/lib/constants'
import { Profile } from '@/types/profile'

// New hook for current user's profile
export function useCurrentUserProfile() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useQuery<Profile>({
    enabled: !!session?.user,
    queryKey: ['profile:v2', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', session!.user.id)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        // one retry
        await new Promise(r => setTimeout(r, 1500))
        const retry = await queryClient.fetchQuery({
          queryKey: ['profile:v2', session!.user.id],
          queryFn: async (): Promise<Profile> => {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', session!.user.id)
              .maybeSingle()
            if (error) throw error
            if (!data) throw new Error('Profile not found after retry')
            return data as Profile
          }
        })
        return retry
      }
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    suspense: false,
    throwOnError: false,
    ...(OFFLINE_MODE && {
      initialData: session?.user
        ? {
            id: session.user.id,
            username: 'mock_user',
            display_name: 'Mock User',
            avatar_url: null,
          }
        : undefined,
    }),
  })
}

// Keep the original useProfile signature for backward compatibility
export const useProfile = (profileId: string | undefined) => {
  return useQuery<Profile>({
    queryKey: ['profile:v2', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', profileId!)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Profile not found')
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    suspense: false,
    throwOnError: false,
    ...(OFFLINE_MODE && {
      initialData: profileId
        ? {
            id: profileId,
            username: 'mock_user',
            display_name: 'Mock User',
            avatar_url: null,
          }
        : undefined,
    }),
  })
};

export const useProfileByUsername = (username: string | undefined) => {
  return useQuery<Profile>({
    queryKey: ['profile-by-username', username],
    enabled: !!username,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('username', username!)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Profile not found')
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    suspense: false,
    throwOnError: false,
    ...(OFFLINE_MODE && {
      initialData: username
        ? {
            id: 'mock-id-' + username,
            username,
            display_name: username,
            avatar_url: null,
          }
        : undefined,
    }),
  })
};