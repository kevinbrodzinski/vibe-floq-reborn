import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time mention notifications
    const channel = supabase
      .channel('mention_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_message_mentions',
          filter: `target_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            // Only handle user mentions
            if (payload.new.target_type !== 'user') return;
            
            // Fetch additional details about the mention with explicit join
            const { data: mentionDetails } = await supabase
              .from('floq_message_mentions')
              .select(`
                *,
                floq_messages!message_id(
                  body,
                  sender_id,
                  floq_id,
                  sender:profiles!floq_messages_sender_id_fkey(username)
                )
              `)
              .eq('message_id', payload.new.message_id)
              .eq('target_id', user.id)
              .single();

            if (mentionDetails?.floq_messages) {
              const notification: MentionNotification = {
                id: payload.new.message_id,
                floq_id: mentionDetails.floq_messages.floq_id,
                message_id: payload.new.message_id,
                mentioned_user: payload.new.target_id,
                sender_username: mentionDetails.floq_messages.sender?.username,
                floq_title: 'floq', // We can fetch this separately if needed
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
  }, [user?.id]);

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