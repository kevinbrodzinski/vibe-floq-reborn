import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';

export const useReactToMessage = (threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const key = ['chat','dm',threadId];

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // Try the new edge function first, fallback to placeholder
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No auth session");
        
        const res = await supaFn('toggle-dm-reaction', session.access_token, {
          p_message_id: messageId,
          p_user_id: selfId,
          p_emoji: emoji
        });
        
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      } catch (edgeError) {
        console.warn('Edge function failed:', edgeError);
        // Throw to prevent optimistic update when edge function is not available
        throw new Error('Reaction feature not available yet');
      }
    },

    onMutate: ({messageId,emoji}) => {
      const previousData = qc.getQueryData(key);
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
      return { previousData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        qc.setQueryData(key, context.previousData);
      }
    }
  });
};