import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPayload {
  kind: 'dm' | 'friend_request' | 'friend_request_accepted' | 'friend_request_declined' | 'plan_invite' | 'plan_invite_accepted' | 'plan_invite_declined' | 'floq_invite' | 'floq_invite_accepted' | 'floq_invite_declined';
  payload: any;
  id: string;
  profile_id: string;
  created_at: string;
  seen_at?: string;
  accepted_at?: string;
}

export const useNotificationSubscription = (profileId: string | null) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `profile_id=eq.${profileId}`
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
            case 'friend_request_accepted':
              toast({
                title: "Friend Request Accepted",
                description: "Your friend request was accepted 🎉",
              });
              break;
            case 'friend_request_declined':
              toast({
                title: "Friend Request Declined",
                description: "Your friend request was declined",
              });
              break;
            case 'plan_invite':
              toast({
                title: "Plan Invitation",
                description: "You've been invited to a plan",
              });
              break;
            case 'plan_invite_accepted':
              toast({
                title: "Plan Invitation Accepted",
                description: "Your plan invitation was accepted 🎉",
              });
              break;
            case 'plan_invite_declined':
              toast({
                title: "Plan Invitation Declined",
                description: "Your plan invitation was declined",
              });
              break;
            case 'floq_invite':
              toast({
                title: "Floq Invitation", 
                description: "You've been invited to join a floq",
              });
              break;
            case 'floq_invite_accepted':
              toast({
                title: "Floq Invitation Accepted",
                description: "Your floq invitation was accepted 🎉",
              });
              break;
            case 'floq_invite_declined':
              toast({
                title: "Floq Invitation Declined",
                description: "Your floq invitation was declined",
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
          filter: `profile_id=eq.${profileId}`
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
  }, [profileId, toast]);
};