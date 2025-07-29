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
      // Try the new RPC first, fallback to direct insert
      try {
        const { data, error } = await (supabase as any).rpc('send_dm_message', {
          p_thread_id   : threadId,
          p_sender_id   : selfId,
          p_message_type: payload.media ? 'image' : 'text',
          p_body        : payload.text,              // can be null for media-only
          p_reply_to_id : payload.replyTo ?? null,
          p_media_meta  : payload.media  ?? {}
        });
        if (error) throw error;
        return data![0];
      } catch (rpcError) {
        // Fallback to direct insert until RPC is available
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            thread_id: threadId,
            sender_id: selfId,
            content: payload.text,
            reply_to_id: payload.replyTo || null,
            metadata: payload.media || {}
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

    onError: (_e, _v, ctx) => {
      qc.setQueryData(key, (old:any) => {
        if (!old) return old;
        old.pages.forEach((p: ChatMessage[]) =>
          p.splice(p.findIndex(m=>m.id===ctx?.optimisticId),1)
        );
        return { ...old };
      });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['dm-threads', selfId] });
    }
  });
};