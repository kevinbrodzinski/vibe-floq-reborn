import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc_reactToMsg, Surface } from '@/lib/chat/api';

export const useReactToMessage = (surface: Surface, threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const queryKey = ['chat', surface, threadId];
  const [pendingReactions, setPendingReactions] = useState(new Set<string>());

  return useMutation({
    mutationFn: async (vars: { messageId: string; emoji: string }) => {
      const { data, error } = await rpc_reactToMsg({ 
        p_message_id: vars.messageId, 
        p_user_id: selfId, 
        p_emoji: vars.emoji 
      });
      if (error) throw error;
      return data;
    },
    onMutate: ({ messageId, emoji }) => {
      const reactionKey = `${messageId}-${emoji}`;
      if (pendingReactions.has(reactionKey)) return;
      
      setPendingReactions(prev => new Set(prev).add(reactionKey));
      
      qc.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        old.pages.flat().forEach((m: any) => {
          if (m.id !== messageId) return;
          m.reactions = m.reactions ?? {};
          const arr: string[] = m.reactions[emoji] ?? [];
          if (arr.includes(selfId))
            m.reactions[emoji] = arr.filter((u) => u !== selfId);
          else
            m.reactions[emoji] = [...arr, selfId];
        });
        return { ...old };
      });
      return { reactionKey };
    },
    onSettled: (data, error, vars, ctx) => {
      if (ctx?.reactionKey) {
        setPendingReactions(prev => {
          const next = new Set(prev);
          next.delete(ctx.reactionKey);
          return next;
        });
      }
    },
  });
};