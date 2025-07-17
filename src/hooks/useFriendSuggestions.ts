import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { Profile } from '@/types/profile'

// Extended type for friend suggestions that includes shared_tags from the database function
export type FriendSuggestion = Profile & {
  shared_tags: number;
};

export function useFriendSuggestions(limit = 10) {
  const session = useSession()
  return useQuery({
    enabled : !!session?.user,
    queryKey: ['friend-suggestions', session?.user.id, limit],
    queryFn : async (): Promise<FriendSuggestion[]> => {
      const { data, error } = await supabase
        .rpc('suggest_friends', {
          p_user_id: session!.user.id,
          p_limit  : limit,
        })

      if (error) throw error
      return data as FriendSuggestion[]
    },
    staleTime: 5 * 60 * 1000,
  })
}