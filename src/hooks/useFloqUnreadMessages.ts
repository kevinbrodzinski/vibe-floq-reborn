import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';

export function useFloqUnreadMessages(floqId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['floq-unread-messages', floqId, user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get the user's last read message timestamp for this floq
      const { data: participantData, error: participantError } = await supabase
        .from('floq_participants')
        .select('last_read_message_at')
        .eq('floq_id', floqId)
        .eq('user_id', user.id)
        .single();

      if (participantError) {
        console.error('Error fetching participant data:', participantError);
        return 0;
      }

      const lastReadAt = participantData?.last_read_message_at || new Date(0).toISOString();

      // Count messages since last read
      const { count, error: messagesError } = await supabase
        .from('floq_messages')
        .select('*', { count: 'exact', head: true })
        .eq('floq_id', floqId)
        .gt('created_at', lastReadAt)
        .neq('user_id', user.id); // Don't count user's own messages

      if (messagesError) {
        console.error('Error counting unread messages:', messagesError);
        return 0;
      }

      return count || 0;
    },
    enabled: !!floqId && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
  });
}