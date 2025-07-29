import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useReactToMessage = (threadId: string, selfId: string) => {
  const qc = useQueryClient();
  const key = ['chat','dm',threadId];

  return useMutation({
    mutationFn: async ({messageId, emoji}:{messageId:string;emoji:string}) => {
      // Placeholder implementation until tables are migrated
      console.log('React to message:', { messageId, emoji, selfId });
      return Promise.resolve();
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