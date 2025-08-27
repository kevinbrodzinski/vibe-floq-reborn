import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { Profile } from '@/types/profile'

// Extended type for friend suggestions that includes location and confidence data
export type FriendSuggestion = Profile & {
  shared_tags: number;
  distance_meters?: number;
  confidence_score?: number;
  reasoning?: any;
};

export function useFriendSuggestions(limit = 10, geo?: { lat: number; lng: number }) {
  const session = useSession()
  return useQuery({
    enabled : !!session?.user,
    queryKey: ['friend-suggestions', session?.user.id, limit, geo?.lat, geo?.lng],
    queryFn : async (): Promise<FriendSuggestion[]> => {
      const { data, error } = await supabase
        .rpc('generate_friend_suggestions', {
          p_profile_id: session!.user.id,
          p_user_lat: geo?.lat || 0,
          p_user_lng: geo?.lng || 0,
          p_limit: limit,
        } as any)

      if (error) throw error
      return (data as any || []).map((item: any) => ({
        id: item.profile_id || item.user_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        shared_tags: item.shared_tags || 0,
        distance_meters: item.distance_meters,
        confidence_score: item.confidence_score,
        reasoning: item.reasoning,
      })) as FriendSuggestion[]
    },
    staleTime: 5 * 60 * 1000,
  })
}