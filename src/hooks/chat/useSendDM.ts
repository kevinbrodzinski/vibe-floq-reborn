import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSendDM = (threadId: string, selfId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { 
      text: string | null; 
      reply_to?: string | null;
      media?: any;
    }) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: selfId,
          content: payload.text,
          reply_to_id: payload.reply_to || null,
          metadata: payload.media || {}
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both the chat timeline and thread list
      qc.invalidateQueries({ queryKey: ['chat', 'dm', threadId] });
      qc.invalidateQueries({ queryKey: ['dm-threads', selfId] });
    }
  });
};