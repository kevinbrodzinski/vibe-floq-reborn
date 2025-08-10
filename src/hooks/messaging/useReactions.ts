import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export function useReactions(threadId?: string) {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!currentUserId) throw new Error('Not authenticated');

      // Check if reaction already exists
      const { data: existing } = await supabase
        .from('dm_message_reactions')
        .select('id')
        .eq('message_id', messageId as any)
        .eq('profile_id', currentUserId as any)
        .eq('emoji', emoji as any)
        .maybeSingle();

      if (existing) {
        // Remove existing reaction (toggle off)
        const { error } = await supabase
          .from('dm_message_reactions')
          .delete()
          .eq('id', (existing as any).id as any);
        
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
          } as any);
        
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