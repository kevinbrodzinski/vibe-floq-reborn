import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('dashboard:friends-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `or=(user_a.eq.${user.id},user_b.eq.${user.id})`,
        },
        (payload) => {
          console.log('Friend change received:', payload);
          
          const row = payload.new ?? payload.old as { status?: string } | null;
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['friends-list'] });
          queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
          queryClient.invalidateQueries({ queryKey: ['friend-activity'] });

          // Show toast for new friend requests
          if (payload.eventType === 'INSERT' && row?.status === 'pending') {
            toast({
              title: "📬 New friend request",
              description: "You have a new friend request!",
            });
          }

          // Show toast for accepted requests
          if (payload.eventType === 'UPDATE' && row?.status === 'accepted') {
            toast({
              title: "🎉 Friend request accepted",
              description: "You are now friends!",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);
}