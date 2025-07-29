import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useReactToMessage = (threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const key = ['chat','dm',threadId];

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // Try the new RPC first, fallback to placeholder
      try {
        const { error } = await (supabase as any).rpc('toggle_dm_reaction', {
          p_message_id: messageId,
          p_user_id   : selfId,
          p_emoji     : emoji
        });
        if (error) throw error;
      } catch (rpcError) {
        // Placeholder until RPC is available
        console.log('React to message (fallback):', { messageId, emoji, selfId });
      }
    },

    onMutate: ({messageId,emoji}) => {
      qc.setQueryData(key, (old:any)=>{
        if (!old) return old;
        old.pages.flat().forEach((m: any)=>{
          if(m.id!==messageId) return;
          m.reactions ??= {};
          const arr: string[] = m.reactions[emoji] ?? [];
          m.reactions[emoji] = arr.includes(selfId)
              ? arr.filter(u=>u!==selfId)
              : [...arr, selfId];
        });
        return {...old};
      });
    }
  });
};