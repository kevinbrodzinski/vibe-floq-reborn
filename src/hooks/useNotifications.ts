import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { usePushToken } from './usePushToken';
import { useBadgeReset } from './useBadgeReset';

interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  payload: any;
  created_at: string;
  seen_at?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize push token and badge reset functionality
  usePushToken();
  useBadgeReset();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        ({ new: n }: { new: NotificationRow }) => {
          // 🔔 central switch-board for all notifications
          switch (n.kind) {
            case 'friend_request':
              toast({ 
                title: 'New friend request',
                description: 'Someone wants to be your friend!'
              });
              break;
            case 'friend_request_accepted':
              toast({ 
                title: 'Friend request accepted 🎉',
                description: 'You have a new friend!'
              });
              break;
            case 'friend_request_declined':
              toast({ 
                title: 'Friend request declined',
                description: 'Your friend request was declined'
              });
              break;
            case 'plan_invite':
              toast({
                title: 'Plan invitation',
                description: 'You\'ve been invited to a plan. Tap to view.'
              });
              break;
            case 'plan_invite_accepted':
              toast({ 
                title: 'Plan invitation accepted 🎉',
                description: 'Someone accepted your plan invitation!'
              });
              break;
            case 'plan_invite_declined':
              toast({ 
                title: 'Plan invitation declined',
                description: 'Your plan invitation was declined'
              });
              break;
            case 'floq_invite':
              toast({
                title: 'Floq invitation',
                description: 'You\'ve been invited to join a floq. Tap to view.'
              });
              break;
            case 'floq_invite_accepted':
              toast({ 
                title: 'Floq invitation accepted 🎉',
                description: 'Someone joined your floq!'
              });
              break;
            case 'floq_invite_declined':
              toast({ 
                title: 'Floq invitation declined',
                description: 'Your floq invitation was declined'
              });
              break;
            case 'dm':
              toast({
                title: 'New message',
                description: n.payload?.preview || 'You have a new direct message'
              });
              break;
            default:
              // Handle unknown notification types gracefully
              toast({
                title: 'New notification',
                description: 'You have a new notification'
              });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        ({ new: n }: { new: NotificationRow }) => {
          // Handle seen_at updates if needed
          if (n.seen_at) {
            // Notification was marked as seen - could update UI state here
            console.log('Notification marked as seen:', n.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}