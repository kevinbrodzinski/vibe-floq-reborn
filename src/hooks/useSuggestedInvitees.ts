import { useMemo } from 'react';
import { useFriendSuggestions, type FriendSuggestion } from '@/hooks/useFriendSuggestions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SuggestedInvitee {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  current_vibe?: string;
  suggestion_reason: string;
  confidence_score: number;
}

interface UseSuggestedInviteesOptions {
  planId?: string;
  floqId?: string;
  targetVibe?: string;
  planLocation?: { lat: number; lng: number };
}

export function useSuggestedInvitees(options: UseSuggestedInviteesOptions = {}) {
  const { data: friendSuggestions = [], isLoading: friendsLoading } = useFriendSuggestions(10);
  
  // Get current floq members to exclude from suggestions
  const { data: floqMembers = [] } = useQuery({
    queryKey: ['floq-members', options.floqId],
    queryFn: async () => {
      if (!options.floqId) return [];
      
      const { data } = await supabase
        .from('floq_participants')
        .select('user_id')
        .eq('floq_id', options.floqId);
      
      return data?.map(p => p.user_id) || [];
    },
    enabled: !!options.floqId,
  });

  // Get current plan participants to exclude
  const { data: planParticipants = [] } = useQuery({
    queryKey: ['plan-participants', options.planId],
    queryFn: async () => {
      if (!options.planId) return [];
      
      const { data } = await supabase
        .from('plan_participants')
        .select('user_id')
        .eq('plan_id', options.planId);
      
      return data?.map(p => p.user_id) || [];
    },
    enabled: !!options.planId,
  });

  const suggestedInvitees = useMemo(() => {
    const excludedIds = new Set([...floqMembers, ...planParticipants]);
    
    return friendSuggestions
      .filter((friend: FriendSuggestion) => !excludedIds.has(friend.id))
      .map((friend: FriendSuggestion) => ({
        id: friend.id,
        username: friend.username,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
        current_vibe: undefined, // Will be enhanced with real-time vibe data
        suggestion_reason: friend.shared_tags > 3 
          ? `${friend.shared_tags} shared interests`
          : 'Similar vibe preferences',
        confidence_score: 0.8, // Default confidence score
      }))
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 8); // Limit to top 8 suggestions
  }, [friendSuggestions, floqMembers, planParticipants]);

  return {
    suggestions: suggestedInvitees,
    loading: friendsLoading,
  };
}