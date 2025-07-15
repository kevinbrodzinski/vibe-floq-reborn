import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';

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
  const session = useSession();
  
  return useQuery({
    queryKey: ['my-mentions'],
    enabled: !!session?.user,
    staleTime: 60_000, // 1 minute
    queryFn: async (): Promise<MentionNotification[]> => {
      if (!session?.user) return [];
      
      const { data, error } = await supabase
        .from('message_mentions')
        .select(`
          message_id,
          created_at,
          floq_messages (
            body,
            floq_id,
            sender_id,
            created_at
          )
        `)
        .eq('mentioned_user', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as MentionNotification[];
    },
  });
}