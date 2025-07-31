// TODO: DEPRECATED - Remove after migration to src/hooks/messaging/useSendMessage.ts
import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/lib/chat/api';

export const useSendDM = (threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const key = ['chat', 'dm', threadId];

  return useMutation({
    mutationFn: async (payload: {
      text: string | null;
      replyTo?: string | null;
      media?: any;
      type?: 'text'|'image'|'voice'|'file';
    }) => {
      // Try the new edge function first, fallback to direct insert
      try {
        const { data, error } = await supabase.functions.invoke('send-message', {
          body: {
            p_thread_id   : threadId,
            p_sender_id   : selfId,
            p_message_type: payload.media ? 'image' : 'text',
            p_body        : payload.text,              // can be null for media-only
            p_reply_to_id : payload.replyTo ?? null,
            p_media_meta  : payload.media  ?? {}
          }
        });
        if (error) throw error;
        return data.message;
      } catch (edgeError) {
        console.warn('Edge function failed, using fallback:', edgeError);
        
        // Fallback to direct insert until edge function is stable
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            thread_id: threadId,
            sender_id: selfId,
            profile_id: selfId,
            content: payload.text,
            reply_to_id: payload.replyTo || null,
            message_type: payload.media ? 'image' : 'text',
            metadata: payload.media || {},
            status: 'sent'
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },

    /* ---------- optimistic --------------- */
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const tmp = crypto.randomUUID();
      const optimistic: ChatMessage = {
        id: `tmp-${tmp}`,
        thread_id : threadId,
        sender_id : selfId,
        content   : vars.text,
        metadata  : vars.media ?? {},
        reply_to_id: vars.replyTo ?? null,
        message_type: vars.type ?? 'text',
        created_at: new Date().toISOString(),
        reactions : {},
        status    : 'sent'
      };
      qc.setQueryData<InfiniteData<ChatMessage[]>>(key, (old) => {
        if (!old) return old;
        const first = old.pages[0] ?? [];
        return { ...old, pages: [[...first, optimistic], ...old.pages.slice(1)] };
      });
      return { optimisticId: optimistic.id };
    },

    onError: (error, _v, ctx) => {
      console.error('[useSendDM] Message send failed:', {
        error: error instanceof Error ? error.message : String(error),
        threadId,
        selfId,
        optimisticId: ctx?.optimisticId
      });
      
      qc.setQueryData(key, (old:any) => {
        if (!old) return old;
        old.pages.forEach((p: ChatMessage[]) => {
          const index = p.findIndex(m => m.id === ctx?.optimisticId);
          if (index !== -1) {
            p.splice(index, 1);
          }
        });
        return { ...old };
      });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['dm-threads', selfId] });
    }
  });
};