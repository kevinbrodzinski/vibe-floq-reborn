import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPayload {
  kind: 'dm' | 'friend_request' | 'plan_invite' | 'floq_invite';
  payload: any;
  id: string;
  user_id: string;
  created_at: string;
  seen_at?: string;
  accepted_at?: string;
}

export const useNotificationSubscription = (userId: string | null) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notif = payload.new as NotificationPayload;
          
          // Show local toast notification for new notifications
          switch (notif.kind) {
            case 'dm':
              toast({
                title: "New Message",
                description: "You have a new direct message",
              });
              break;
            case 'friend_request':
              toast({
                title: "Friend Request",
                description: "You have a new friend request",
              });
              break;
            case 'plan_invite':
              toast({
                title: "Plan Invitation",
                description: "You've been invited to a plan",
              });
              break;
            case 'floq_invite':
              toast({
                title: "Floq Invitation", 
                description: "You've been invited to join a floq",
              });
              break;
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notif = payload.new as NotificationPayload;
          
          // Handle notification updates (seen/accepted)
          if (notif.accepted_at && notif.kind.includes('invite')) {
            toast({
              title: "Invitation Accepted",
              description: "Your invitation has been accepted",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};