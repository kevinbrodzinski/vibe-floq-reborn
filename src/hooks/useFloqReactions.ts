import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FloqReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  isAdding: boolean
) {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user) throw new Error('not signed in');

  if (isAdding) {
    await supabase
      .from('floq_message_reactions')
      .insert({ message_id: messageId, emoji, profile_id: user.id });
  } else {
    await supabase
      .from('floq_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('profile_id', user.id)
      .eq('emoji', emoji);
  }
}

export function useReactions(floqId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['floq-reactions', floqId],
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      // Get all messages for this floq first
      const { data: messages, error: messagesError } = await supabase
        .from('floq_messages')
        .select('id')
        .eq('floq_id', floqId);

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        return {};
      }

      const messageIds = messages.map((m: { id: string }) => m.id);

      // Use server-side aggregation RPC
      const { data, error } = await supabase.rpc('get_message_reactions', { ids: messageIds });

      if (error) {
        console.warn('RPC not available, falling back to client-side aggregation');
        // Fallback to client-side aggregation
        const { data: reactionData, error: reactionError } = await supabase
          .from('floq_message_reactions')
          .select('message_id, emoji, profile_id')
          .in('message_id', messageIds);

        if (reactionError) throw reactionError;

        const result: Record<string, Record<string, number>> = {};
        (reactionData || []).forEach((reaction: { message_id: string; emoji: string; profile_id: string }) => {
          if (!result[reaction.message_id]) {
            result[reaction.message_id] = {};
          }
          if (!result[reaction.message_id][reaction.emoji]) {
            result[reaction.message_id][reaction.emoji] = 0;
          }
          result[reaction.message_id][reaction.emoji]++;
        });
        return result;
      }

      // Shape to { [messageId]: { '❤️':2,'👍':1 } }
      const result: Record<string, Record<string, number>> = {};
      (data || []).forEach((reaction: { message_id: string; emoji: string; cnt: number }) => {
        if (!result[reaction.message_id]) {
          result[reaction.message_id] = {};
        }
        result[reaction.message_id][reaction.emoji] = reaction.cnt;
      });

      return result;
    },
    enabled: !!floqId,
    refetchOnWindowFocus: false,
  });
}

export async function sendFloqMessage(
  floqId: string,
  text: string,
  replyTo?: string
) {
  const user = (await supabase.auth.getUser()).data?.user;
  if (!user) throw new Error('Not authenticated');

  await supabase.from('floq_messages').insert({
    floq_id: floqId,
    body: text,
    reply_to_id: replyTo ?? null,
    sender_id: user.id,
  });
}