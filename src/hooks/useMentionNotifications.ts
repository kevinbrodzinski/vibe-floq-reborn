import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MentionNotification {
  id: string;
  floq_id: string;
  message_id: string;
  mentioned_user: string;
  sender_username?: string;
  floq_title?: string;
  created_at: string;
}

export function useMentionNotifications() {
  const session = useSession();
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Subscribe to real-time mention notifications
    const channel = supabase
      .channel('mention_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_mentions',
          filter: `mentioned_user=eq.${session.user.id}`,
        },
        async (payload) => {
          try {
            // Fetch additional details about the mention with explicit join
            const { data: mentionDetails } = await supabase
              .from('message_mentions')
              .select(`
                *,
                floq_messages!message_id(
                  body,
                  sender_id,
                  floq_id,
                  profiles!sender_id(username)
                ),
                floqs!inner(title)
              `)
              .eq('message_id', payload.new.message_id)
              .single();

            if (mentionDetails) {
              const notification: MentionNotification = {
                id: payload.new.message_id,
                floq_id: mentionDetails.floq_messages.floq_id,
                message_id: payload.new.message_id,
                mentioned_user: payload.new.mentioned_user,
                sender_username: mentionDetails.floq_messages.profiles.username,
                floq_title: mentionDetails.floqs?.title,
                created_at: payload.new.created_at,
              };

              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);

              // Show toast notification
              toast(`${notification.sender_username} mentioned you`, {
                description: `In ${notification.floq_title || 'a floq'}`,
                action: {
                  label: 'View',
                  onClick: () => {
                    // Navigate to the floq (you can customize this)
                    window.location.href = `/floq/${notification.floq_id}`;
                  },
                },
              });

              // Play notification sound and vibrate (with error handling)
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`${notification.sender_username} mentioned you`, {
                    body: `In ${notification.floq_title || 'a floq'}`,
                    icon: '/favicon.ico',
                  });
                } catch (error) {
                  console.warn('Notification blocked or failed:', error);
                }
              }

              // Vibrate on mobile (if supported)
              if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          } catch (error) {
            console.error('Error processing mention notification:', error);
          }
        }
      )
      .subscribe();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}