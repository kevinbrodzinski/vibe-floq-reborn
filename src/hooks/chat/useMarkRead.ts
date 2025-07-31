import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';
import { Surface } from '@/lib/chat/api';

interface MarkReadArgs {
  p_surface:  'dm' | 'floq' | 'plan';
  p_thread_id: string;
  p_profile_id: string;
}

/** Fire-and-forget helper (for places you can't use a hook) */
export const markRead = async (args: MarkReadArgs) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  
  return supaFn('mark-thread-read', session.access_token, args).catch(console.warn);
};

/** React-Query mutation hook */
export const useMarkRead = (
  surface: Surface,
  threadId: string,
  profileId: string
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth session");
      
      const res = await supaFn('mark-thread-read', session.access_token, {
        p_surface: surface, 
        p_thread_id: threadId, 
        p_profile_id: profileId 
      });
      
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dm-unread', profileId] });
    },
  });
};