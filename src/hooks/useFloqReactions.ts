import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FloqReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export async function toggleReaction(messageId: string, emoji: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('floq_message_reactions' as any)
    .select('id')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (error) throw error;

  if (data && (data as any).id) {
    // Remove reaction
    await supabase.from('floq_message_reactions' as any).delete().eq('id', (data as any).id);
  } else {
    // Add reaction
    await supabase.from('floq_message_reactions' as any).insert({ 
      message_id: messageId, 
      emoji,
      user_id: user.user.id
    });
  }
  // rely on realtime to refresh UI
}

export function useReactions(floqId: string) {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates for reactions
  useEffect(() => {
    if (!floqId) return;

    const channel = supabase
      .channel(`floq-reactions:${floqId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'floq_message_reactions'
        },
        () => queryClient.invalidateQueries({ queryKey: ['floq-reactions', floqId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, queryClient]);

  return useQuery({
    queryKey: ['floq-reactions', floqId],
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      // Get all messages for this floq first
      const { data: messages, error: messagesError } = await supabase
        .from('floq_messages' as any)
        .select('id')
        .eq('floq_id', floqId);

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        return {};
      }

      const messageIds = messages.map((m: any) => m.id);

      // Get reactions for these messages directly
      const { data, error } = await supabase
        .from('floq_message_reactions' as any)
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      if (error) throw error;

      // Shape to { [messageId]: { '❤️':2,'👍':1 } }
      const result: Record<string, Record<string, number>> = {};
      (data || []).forEach((reaction: any) => {
        if (!result[reaction.message_id]) {
          result[reaction.message_id] = {};
        }
        if (!result[reaction.message_id][reaction.emoji]) {
          result[reaction.message_id][reaction.emoji] = 0;
        }
        result[reaction.message_id][reaction.emoji]++;
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
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  await supabase.from('floq_messages' as any).insert({
    floq_id: floqId,
    body: text,
    reply_to_id: replyTo ?? null,
    sender_id: user.user.id,
  });
}