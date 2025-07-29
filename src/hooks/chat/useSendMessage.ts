import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import {
  ChatMessage, rpc_sendMessage, Surface,
} from '@/lib/chat/api';

export const useSendMessage = (surface: Surface, threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const queryKey = ['chat', surface, threadId];

  return useMutation({
    mutationFn: async (payload: { 
      text: string | null; 
      metadata?: any; 
      reply_to?: string | null 
    }) => {
      const { data, error } = await rpc_sendMessage({
        p_surface: surface as 'dm' | 'floq' | 'plan',
        p_thread_id: threadId,
        p_sender_id: selfId,
        p_body: payload.text,
        p_media_meta: payload.metadata ?? {},
        p_reply_to_id: payload.reply_to ?? null,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const optimistic: ChatMessage = {
        id: `tmp-${uuid()}`,
        thread_id: threadId,
        sender_id: selfId,
        content: vars.text,
        metadata: vars.metadata ?? null,
        reply_to_id: vars.reply_to ?? null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        old.pages[0].push(optimistic);
        return { ...old };
      });
      return { optimisticId: optimistic.id };
    },
    onError: (_e, _vars, ctx) => {
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        old.pages.forEach((p: ChatMessage[]) => {
          const idx = p.findIndex((m) => m.id === ctx?.optimisticId);
          if (idx > -1) p.splice(idx, 1);
        });
        return { ...old };
      });
    },
    onSuccess: () => {
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        old.pages.forEach((p: ChatMessage[]) => {
          const filtered = p.filter((m) => !m.id.startsWith('tmp-'));
          p.length = 0;
          p.push(...filtered);
        });
        return { ...old };
      });
    },
  });
};