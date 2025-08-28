import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import type { Row } from '@/types/util';

type ReactionRow = Pick<Row<'dm_message_reactions'>, 'message_id' | 'profile_id' | 'emoji' | 'reacted_at'>
type ReactionSelect = Pick<ReactionRow, 'message_id' | 'profile_id' | 'emoji'> & { id?: string }

export function useReactions(threadId?: string) {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  const addReaction = useMutation<{ action: string }, Error, { messageId: string; emoji: string }>({
    mutationFn: async ({ messageId, emoji }) => {
      if (!currentUserId) throw new Error('Not authenticated');

      // Check if reaction already exists
      const { data: existing, error: selectError } = await supabase
        .from('dm_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('profile_id', currentUserId)
        .eq('emoji', emoji)
        .maybeSingle()
        .returns<{ id: string } | null>();

      if (selectError) throw selectError;

      if (existing) {
        // Remove existing reaction (toggle off)
        const { error } = await supabase
          .from('dm_message_reactions')
          .delete()
          .eq('id', existing.id);
        
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('dm_message_reactions')
          .insert({
            message_id: messageId,
            profile_id: currentUserId,
            emoji
          });
        
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: () => {
      // Invalidate messages to refresh reactions
      if (threadId) {
        queryClient.invalidateQueries({ queryKey: ['messages', 'dm', threadId] });
      }
    },
    onError: (error) => {
      console.error('Failed to toggle reaction:', error);
    }
  });

  return {
    toggleReaction: addReaction.mutate,
    isLoading: addReaction.isPending
  };
}