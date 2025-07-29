import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc_markThreadRead, Surface } from '@/lib/chat/api';

export const useMarkRead = (surface: Surface, threadId: string, selfId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc_markThreadRead({ 
        p_surface: surface as 'dm' | 'floq' | 'plan', 
        p_thread_id: threadId, 
        p_user_id: selfId 
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate unread counts
      qc.invalidateQueries({ queryKey: ['dm-unread', selfId] });
    }
  });
};

export const markRead = async (surface: Surface, threadId: string, selfId: string) => {
  const { data, error } = await rpc_markThreadRead({ 
    p_surface: surface as 'dm' | 'floq' | 'plan', 
    p_thread_id: threadId, 
    p_user_id: selfId 
  });
  if (error) throw error;
  return data;
};