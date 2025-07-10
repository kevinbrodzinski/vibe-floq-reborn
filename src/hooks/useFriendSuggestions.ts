import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FriendSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  compatibility_score: number;
  mutual_friends_count: number;
  crossed_paths_count: number;
  shared_interests: string[];
}

export function useFriendSuggestions(userId?: string, limit = 6) {
  return useQuery({
    queryKey: ['friend-suggestions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('suggest_friends', {
        target_user_id: userId,
        limit_count: limit
      });

      if (error) throw error;
      return data as FriendSuggestion[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}