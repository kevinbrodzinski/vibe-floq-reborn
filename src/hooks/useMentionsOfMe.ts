import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MentionNotification {
  message_id: string;
  created_at: string;
  floq_messages: {
    body: string | null;
    floq_id: string;
    sender_id: string;
    created_at: string;
  } | null;
}

export function useMentionsOfMe() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-mentions'],
    enabled: !!user,
    staleTime: 60_000, // 1 minute
    queryFn: async (): Promise<MentionNotification[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('floq_message_mentions')
        .select(`
          message_id,
          created_at,
          floq_messages!message_id (
            body,
            floq_id,
            sender_id,
            created_at
          )
        `)
        .eq('target_id', user.id)
        .eq('target_type', 'user')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as MentionNotification[];
    },
  });
}