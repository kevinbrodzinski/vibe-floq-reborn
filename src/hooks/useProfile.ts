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
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, interests, custom_status')
        .eq('id', session!.user.id)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        await new Promise(r => setTimeout(r, 1500))
        const retry = await queryClient.fetchQuery({
          queryKey: ['profile:v2', session!.user.id],
          queryFn: async (): Promise<Profile> => {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, bio, interests, custom_status')
              .eq('id', session!.user.id)
              .maybeSingle()
            if (error) throw error
            if (!data) throw new Error('Profile not found after retry')
            return data as Profile
          },
        })
        return retry
      }
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    throwOnError: false,
    ...(OFFLINE_MODE && {
      initialData: session?.user
        ? { id: session.user.id, username: 'mock_user', display_name: 'Mock User', avatar_url: null }
        : undefined,
    }),
  })
}

// Keep the original useProfile signature for backward compatibility
export const useProfile = (profileId: string | undefined) =>
  useQuery<Profile>({
    queryKey: ['profile:v2', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, interests, custom_status')
        .eq('id', profileId!)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Profile not found')
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    throwOnError: false,
  });

export const useProfileByUsername = (username: string | undefined) =>
  useQuery<Profile>({
    queryKey: ['profile-by-username', username],
    enabled: !!username,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, interests, custom_status')
        .eq('username', username!)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Profile not found')
      return data as Profile
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    throwOnError: false,
  });