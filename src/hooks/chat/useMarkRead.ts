import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Surface } from '@/lib/chat/types';

interface MarkReadArgs {
  p_surface:  'dm' | 'floq' | 'plan';
  p_thread_id: string;
  p_profile_id: string;
}

/** Fire-and-forget helper (for places you can't use a hook) */
export const markRead = (args: MarkReadArgs) =>
  (supabase as any).rpc('mark_thread_read', args);

/** React-Query mutation hook */
export const useMarkRead = (
  surface: Surface,
  threadId: string,
  profileId: string
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      markRead({ p_surface: surface, p_thread_id: threadId, p_profile_id: profileId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dm-unread', profileId] });
    },
  });
};